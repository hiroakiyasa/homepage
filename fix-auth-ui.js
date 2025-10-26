const fs = require('fs');

let html = fs.readFileSync('data/regions/立川北.html', 'utf8');

// 1. ログインボタンのdisplay:noneを削除
html = html.replace(
  '<button id="nav-btn-login" class="btn-login" style="display: none;">ログイン</button>',
  '<button id="nav-btn-login" class="btn-login">ログイン</button>'
);

// 2. 認証モーダルを新規登録とログインに分ける
const oldAuthModal = /<!-- 認証モーダル -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- プロフィール編集モーダル -->/;

const newAuthModals = `<!-- ログインモーダル -->
  <div id="login-modal" class="modal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeLoginModal()">×</button>
      <h2>ログイン</h2>

      <div class="login-options">
        <button id="google-login" class="btn-google" onclick="signInWithGoogle()">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4" fill-rule="nonzero"/><path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853" fill-rule="nonzero"/><path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05" fill-rule="nonzero"/><path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335" fill-rule="nonzero"/><path d="M0 0h18v18H0z"/></g></svg>
          Googleでログイン
        </button>

        <div class="divider">または</div>

        <div class="form-group">
          <label>メールアドレス</label>
          <input type="email" id="login-email" placeholder="email@example.com" />
        </div>

        <div class="form-group">
          <label>パスワード（6文字以上）</label>
          <input type="password" id="login-password" placeholder="••••••" />
        </div>

        <div id="login-error" class="error-message" style="display: none;"></div>

        <div class="form-actions">
          <button class="btn-submit" onclick="handleLogin()">ログイン</button>
        </div>

        <div class="form-footer">
          <p>アカウントをお持ちでない方は<a href="#" onclick="event.preventDefault(); switchToSignup();">新規登録</a></p>
        </div>
      </div>
    </div>
  </div>

  <!-- 新規登録モーダル -->
  <div id="signup-modal" class="modal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeSignupModal()">×</button>
      <h2>新規登録</h2>

      <div class="login-options">
        <button id="google-signup" class="btn-google" onclick="signInWithGoogle()">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4" fill-rule="nonzero"/><path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853" fill-rule="nonzero"/><path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05" fill-rule="nonzero"/><path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335" fill-rule="nonzero"/><path d="M0 0h18v18H0z"/></g></svg>
          Googleで新規登録
        </button>

        <div class="divider">または</div>

        <div class="form-group">
          <label>メールアドレス</label>
          <input type="email" id="signup-email" placeholder="email@example.com" />
        </div>

        <div class="form-group">
          <label>パスワード（6文字以上）</label>
          <input type="password" id="signup-password" placeholder="••••••" />
        </div>

        <div class="form-group">
          <label>パスワード（確認）</label>
          <input type="password" id="signup-password-confirm" placeholder="••••••" />
        </div>

        <div id="signup-error" class="error-message" style="display: none;"></div>

        <div class="form-actions">
          <button class="btn-submit" onclick="handleSignup()">新規登録</button>
        </div>

        <div class="form-footer">
          <p>既にアカウントをお持ちの方は<a href="#" onclick="event.preventDefault(); switchToLogin();">ログイン</a></p>
        </div>
      </div>
    </div>
  </div>

  <!-- プロフィール編集モーダル -->`;

html = html.replace(oldAuthModal, newAuthModals);

fs.writeFileSync('data/regions/立川北.html', html, 'utf8');
console.log('✅ 認証UIを修正しました！');
