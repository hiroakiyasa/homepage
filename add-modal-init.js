const fs = require('fs');

// 立川北.htmlを読み込み
const filePath = 'data/regions/立川北.html';
let html = fs.readFileSync(filePath, 'utf8');

// 初期化コードを追加
const initCode = `
    // モーダルイベントリスナーの設定
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginButton) {
      loginButton.addEventListener('click', openLoginModal);
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error('ログアウトエラー:', error);
        }
      });
    }

    // モーダル外クリックで閉じる
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target.id === 'login-modal') {
          closeLoginModal();
        }
      });
    }

    if (signupModal) {
      signupModal.addEventListener('click', (e) => {
        if (e.target.id === 'signup-modal') {
          closeSignupModal();
        }
      });
    }

    // フォーム送信
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
      signupForm.addEventListener('submit', handleSignup);
    }
`;

// 初期化コードを、既存の初期化の前に挿入
html = html.replace(
  /(    \/\/ 初期化\n    checkAuthStatus\(\);)/,
  initCode + '\n$1'
);

// ファイルに書き込み
fs.writeFileSync(filePath, html, 'utf8');
console.log('✅ モーダル初期化コードを追加しました');
