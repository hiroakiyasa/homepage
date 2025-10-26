const fs = require('fs');

// 立川北.htmlを読み込み
const filePath = 'data/regions/立川北.html';
let html = fs.readFileSync(filePath, 'utf8');

// 新しいモーダル切り替え関数を追加
const newFunctions = `
// モーダル切り替え関数
function switchToSignup() {
  closeLoginModal();
  document.getElementById('signup-modal').classList.add('active');
}

function switchToLogin() {
  closeSignupModal();
  document.getElementById('login-modal').classList.add('active');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('active');
  clearErrors();
}

function closeSignupModal() {
  document.getElementById('signup-modal').classList.remove('active');
  clearErrors();
}

function openLoginModal() {
  document.getElementById('login-modal').classList.add('active');
}

async function handleLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showError('login-error', error.message);
  } else {
    closeLoginModal();
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const displayName = document.getElementById('signup-display-name').value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });

  if (error) {
    showError('signup-error', error.message);
  } else {
    showSuccess('signup-success', 'メールを確認して認証を完了してください');
    setTimeout(() => {
      closeSignupModal();
    }, 3000);
  }
}

async function signInWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href
    }
  });

  if (error) {
    showError('login-error', error.message);
  }
}
`;

// 古いopenAuthModal()関数を削除して、新しい関数群に置き換え
// openAuthModal関数の定義を探して削除
html = html.replace(/function openAuthModal\(\) \{[\s\S]*?\n\}/g, '');

// closeAuthModal関数も削除（新しいcloseLoginModal/closeSignupModalに置き換え）
html = html.replace(/function closeAuthModal\(\) \{[\s\S]*?\n\}/g, '');

// switchTab関数も削除（もう不要）
html = html.replace(/function switchTab\(tab\) \{[\s\S]*?\n\}/g, '');

// 古いhandleLogin/handleSignup関数も削除
html = html.replace(/async function handleLogin\(event\) \{[\s\S]*?\n\s*\}\n/g, '');
html = html.replace(/async function handleSignup\(event\) \{[\s\S]*?\n\s*\}\n/g, '');
html = html.replace(/async function signInWithGoogle\(\) \{[\s\S]*?\n\s*\}\n/g, '');

// clearErrors関数の前に新しい関数を挿入
html = html.replace(
  /(function clearErrors\(\))/,
  newFunctions + '\n$1'
);

// ログインボタンのイベントリスナーを更新
html = html.replace(
  /document\.getElementById\('login-button'\)\.addEventListener\('click', openAuthModal\);/,
  "document.getElementById('login-button').addEventListener('click', openLoginModal);"
);

// login-linkのイベントリスナーも更新
html = html.replace(
  /document\.getElementById\('login-link'\)\.addEventListener\('click', \(e\) => \{\s*e\.preventDefault\(\);\s*openAuthModal\(\);\s*\}\);/,
  `document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
  });`
);

// モーダル外クリックのイベントリスナーを更新
const oldModalClickHandler = `document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') {
      closeAuthModal();
    }
  });`;

const newModalClickHandlers = `// ログインモーダル外クリックで閉じる
  document.getElementById('login-modal').addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') {
      closeLoginModal();
    }
  });

  // サインアップモーダル外クリックで閉じる
  document.getElementById('signup-modal').addEventListener('click', (e) => {
    if (e.target.id === 'signup-modal') {
      closeSignupModal();
    }
  });`;

html = html.replace(oldModalClickHandler, newModalClickHandlers);

// ファイルに書き込み
fs.writeFileSync(filePath, html, 'utf8');
console.log('✅ モーダル切り替え関数を追加しました');
