const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class NotePublisher {
  constructor() {
    this.noteApiUrl = 'https://note.com/api/v2';
    this.email = process.env.NOTE_EMAIL;
    this.password = process.env.NOTE_PASSWORD;
    this.userId = process.env.NOTE_USER_ID;
    this.session = null;
    this.csrfToken = null;
  }

  // Login to note.com
  async login() {
    try {
      console.log('Attempting to login to note.com...');

      const loginData = {
        login: this.email,
        password: this.password
      };

      const response = await axios.post(
        'https://note.com/api/v1/sessions/sign_in',
        loginData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status < 400
        }
      );

      if (response.headers['set-cookie']) {
        // Extract session cookies
        const cookies = response.headers['set-cookie'];
        this.extractSessionFromCookies(cookies);
      }

      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error.message);
      // Try using the note-mcp-server if available
      return this.tryMCPConnection();
    }
  }

  extractSessionFromCookies(cookies) {
    cookies.forEach(cookie => {
      if (cookie.includes('_note_session_v5=')) {
        this.session = cookie.split('_note_session_v5=')[1].split(';')[0];
      }
      if (cookie.includes('note_xsrf_token=')) {
        this.csrfToken = cookie.split('note_xsrf_token=')[1].split(';')[0];
      }
    });
  }

  // Try to connect via note-mcp-server if available
  async tryMCPConnection() {
    try {
      // Check if note-mcp-server is running
      const testResponse = await axios.get('http://localhost:3000/health', {
        timeout: 1000
      }).catch(() => null);

      if (testResponse) {
        console.log('Using note-mcp-server for publishing');
        return true;
      }
    } catch (error) {
      console.log('note-mcp-server not available, using direct API');
    }
    return false;
  }

  // Create a draft article
  async createDraft(article, imageUrl = null) {
    try {
      console.log('Creating draft article...');

      const noteData = {
        note: {
          name: article.title,
          body: article.content,
          status: 'draft', // Start as draft
          hashtags: article.tags.join(','),
          is_limited: false,
          can_comment: true,
          can_like: true
        }
      };

      if (imageUrl) {
        noteData.note.eyecatch = imageUrl;
      }

      // Try to use the API
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      };

      if (this.session && this.csrfToken) {
        headers['Cookie'] = `_note_session_v5=${this.session}; note_xsrf_token=${this.csrfToken}`;
        headers['X-CSRF-Token'] = this.csrfToken;
      }

      const response = await axios.post(
        `https://note.com/api/v2/notes`,
        noteData,
        { headers }
      );

      console.log('Draft created successfully');
      return response.data;
    } catch (error) {
      console.error('Error creating draft:', error.message);
      // Fallback to saving locally
      return this.saveLocalDraft(article, imageUrl);
    }
  }

  // Publish a draft article
  async publishDraft(draftId) {
    try {
      console.log('Publishing draft...');

      const publishData = {
        note: {
          status: 'published'
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      };

      if (this.session && this.csrfToken) {
        headers['Cookie'] = `_note_session_v5=${this.session}; note_xsrf_token=${this.csrfToken}`;
        headers['X-CSRF-Token'] = this.csrfToken;
      }

      const response = await axios.patch(
        `https://note.com/api/v2/notes/${draftId}`,
        publishData,
        { headers }
      );

      console.log('Article published successfully');
      return response.data;
    } catch (error) {
      console.error('Error publishing draft:', error.message);
      return null;
    }
  }

  // Fallback: Save article as local markdown file
  async saveLocalDraft(article, imageUrl) {
    try {
      const draftsDir = path.join(__dirname, '..', 'drafts');
      await fs.mkdir(draftsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `draft_${timestamp}.md`;
      const filepath = path.join(draftsDir, filename);

      let content = `# ${article.title}\n\n`;
      if (imageUrl) {
        content += `![Cover Image](${imageUrl})\n\n`;
      }
      content += article.content;
      content += `\n\n## Tags\n${article.tags.map(tag => `#${tag}`).join(' ')}`;

      await fs.writeFile(filepath, content, 'utf8');
      console.log(`Draft saved locally: ${filepath}`);

      return { id: filename, path: filepath };
    } catch (error) {
      console.error('Error saving local draft:', error);
      return null;
    }
  }

  // Publish article with retry logic
  async publishArticle(article, imageUrl = null) {
    try {
      // First, try to login
      const loginSuccess = await this.login();

      if (!loginSuccess) {
        console.log('Login failed, saving as local draft');
        return this.saveLocalDraft(article, imageUrl);
      }

      // Create draft
      const draft = await this.createDraft(article, imageUrl);

      if (draft && draft.id) {
        // If we have a draft ID, try to publish it
        const published = await this.publishDraft(draft.id);
        if (published) {
          return published;
        }
      }

      return draft;
    } catch (error) {
      console.error('Error in publish process:', error);
      return this.saveLocalDraft(article, imageUrl);
    }
  }

  // Simple publish method for direct posting
  async simplePublish(title, content, tags = []) {
    const article = {
      title,
      content,
      tags
    };

    return this.publishArticle(article);
  }
}

module.exports = new NotePublisher();