const fs = require('fs');

// 立川北のHTMLを読み込み
let html = fs.readFileSync('data/regions/立川北.html', 'utf8');

// 古いcreateCommentElement関数を新しいものに置き換え
const oldFunction = /\/\/ コメント要素を作成[\s\S]*?function createCommentElement\(comment, isReply = false\) \{[\s\S]*?return div;\s*\}/;

const newFunction = `// コメント要素を作成（XSS対策：DOM操作で安全に作成）
    function createCommentElement(comment, isReply = false) {
      const div = document.createElement('div');
      div.className = 'comment-item' + (isReply ? ' reply' : '');

      const displayName = comment.user_profiles?.display_name || 'ユーザー' + comment.user_id.slice(0, 8);
      const avatarUrl = comment.user_profiles?.avatar_url;
      const date = new Date(comment.created_at).toLocaleString('ja-JP');
      const isOwner = currentUser && currentUser.id === comment.user_id;

      // コメントヘッダー
      const commentHeader = document.createElement('div');
      commentHeader.className = 'comment-header';

      const commentAuthor = document.createElement('div');
      commentAuthor.className = 'comment-author';

      if (avatarUrl) {
        const avatar = document.createElement('img');
        avatar.src = avatarUrl;
        avatar.alt = displayName;
        commentAuthor.appendChild(avatar);
      }

      const authorName = document.createElement('span');
      authorName.className = 'comment-author-name';
      authorName.textContent = displayName;
      commentAuthor.appendChild(authorName);

      const commentDate = document.createElement('span');
      commentDate.className = 'comment-date';
      commentDate.textContent = date;

      commentHeader.appendChild(commentAuthor);
      commentHeader.appendChild(commentDate);

      // コメント内容（XSS対策：textContentを使用）
      const commentContent = document.createElement('div');
      commentContent.className = 'comment-content';
      commentContent.textContent = comment.content;

      // コメントアクション
      const commentActions = document.createElement('div');
      commentActions.className = 'comment-actions';

      const likeButton = document.createElement('button');
      likeButton.onclick = () => likeComment(comment.id);
      likeButton.textContent = \`♥️ \${comment.like_count || 0}\`;
      commentActions.appendChild(likeButton);

      if (!isReply) {
        const replyButton = document.createElement('button');
        replyButton.onclick = () => showReplyForm(comment.id, displayName);
        replyButton.textContent = '💬 返信';
        commentActions.appendChild(replyButton);
      }

      if (isOwner) {
        const deleteButton = document.createElement('button');
        deleteButton.onclick = () => deleteComment(comment.id);
        deleteButton.textContent = '🗑️ 削除';
        commentActions.appendChild(deleteButton);
      }

      // 返信フォームコンテナ
      const replyFormContainer = document.createElement('div');
      replyFormContainer.id = \`reply-form-\${comment.id}\`;
      replyFormContainer.className = 'reply-form-container';

      // すべてを組み立て
      div.appendChild(commentHeader);
      div.appendChild(commentContent);
      div.appendChild(commentActions);
      div.appendChild(replyFormContainer);

      return div;
    }`;

html = html.replace(oldFunction, newFunction);

// 保存
fs.writeFileSync('data/regions/立川北.html', html, 'utf8');
console.log('✅ 立川北.htmlをXSS対策版に更新しました！');
