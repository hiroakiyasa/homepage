const fs = require('fs');

// 立川北のHTMLを読み込み
let html = fs.readFileSync('data/regions/立川北.html', 'utf8');

// 古いshowReplyForm関数を新しいものに置き換え
const oldFunction = /\/\/ 返信フォームを表示[\s\S]*?function showReplyForm\(parentCommentId, parentAuthor\) \{[\s\S]*?\.focus\(\);\s*\}/;

const newFunction = `// 返信フォームを表示（XSS対策：DOM操作で安全に作成）
    function showReplyForm(parentCommentId, parentAuthor) {
      const replyForm = document.getElementById(\`reply-form-\${parentCommentId}\`);
      replyForm.innerHTML = ''; // クリア

      const textarea = document.createElement('textarea');
      textarea.id = \`reply-input-\${parentCommentId}\`;
      textarea.placeholder = \`@\${parentAuthor} への返信（1-1000文字）\`;
      textarea.maxLength = 1000;
      textarea.required = true;
      textarea.value = \`@\${parentAuthor} \`;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'reply-form-actions';

      const cancelButton = document.createElement('button');
      cancelButton.className = 'reply-cancel';
      cancelButton.onclick = () => hideReplyForm(parentCommentId);
      cancelButton.textContent = 'キャンセル';

      const submitButton = document.createElement('button');
      submitButton.className = 'reply-submit';
      submitButton.onclick = () => submitReply(parentCommentId);
      submitButton.textContent = '返信';

      actionsDiv.appendChild(cancelButton);
      actionsDiv.appendChild(submitButton);

      replyForm.appendChild(textarea);
      replyForm.appendChild(actionsDiv);

      replyForm.classList.add('active');
      textarea.focus();
    }`;

html = html.replace(oldFunction, newFunction);

// 保存
fs.writeFileSync('data/regions/立川北.html', html, 'utf8');
console.log('✅ 立川北.html の showReplyForm も XSS対策版に更新しました！');
