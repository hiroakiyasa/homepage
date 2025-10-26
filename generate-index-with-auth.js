const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

/**
 * 富士山の背景画像を取得してBase64エンコード
 */
async function fetchBackgroundImageBase64() {
  return new Promise((resolve) => {
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/080103_hakkai_fuji.jpg/1280px-080103_hakkai_fuji.jpg';

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    const processResponse = (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, options, processResponse).on('error', (err) => {
          console.error('   ⚠️  画像取得エラー:', err.message);
          resolve('');
        });
        return;
      }

      if (res.statusCode !== 200) {
        console.error('   ⚠️  画像取得失敗 Status:', res.statusCode);
        resolve('');
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(`data:image/jpeg;base64,${base64}`);
      });
    };

    https.get(imageUrl, options, processResponse).on('error', (err) => {
      console.error('   ⚠️  画像取得エラー:', err.message);
      resolve('');
    });
  });
}

/**
 * 認証機能付き車中泊スポットマップのindex.htmlを生成
 */
async function generateIndexHTML() {
  // 標高データを含むユニーク地域データを読み込む
  const elevationRegionsPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  let allRegions = [];

  if (fs.existsSync(elevationRegionsPath)) {
    console.log('📍 regions-data-with-elevation.json を読み込み中...');
    allRegions = JSON.parse(fs.readFileSync(elevationRegionsPath, 'utf8'));
    console.log(`   ✅ ${allRegions.length}箇所の標高データを読み込みました`);
  } else {
    console.error('❌ regions-data-with-elevation.json が見つかりません');
    process.exit(1);
  }

  // regionsフォルダ内に存在するHTMLファイルのみをフィルタリング
  const regionsDir = path.join(__dirname, 'data', 'regions');
  const regions = allRegions.filter(region => {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    const htmlPath = path.join(regionsDir, `${fileName}.html`);
    return fs.existsSync(htmlPath);
  });

  console.log(`📍 ${regions.length}個の地域マーカーを追加します`);

  // 背景画像を取得
  console.log('🖼️  背景画像を取得中...');
  const backgroundImageBase64 = await fetchBackgroundImageBase64();
  if (backgroundImageBase64) {
    console.log(`   ✅ 背景画像を取得しました (${backgroundImageBase64.length.toLocaleString()} bytes)`);
  } else {
    console.log('   ⚠️  背景画像の取得に失敗しました');
  }

  // 地域データをJavaScript配列形式に変換（標高データを含む）
  const regionsJS = regions.map(r => {
    const fileName = (r.fileName || r.name).replace(/[\/\\:*?"<>|]/g, '_');
    return {
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      restaurantCount: r.restaurantCount || 0,
      fileName: fileName,
      elevation: r.elevation || 0, // 標高データ
      url: `regions/${fileName}.html` // 地域ページのURL（regionsフォルダ内）
    };
  });

  // Supabase認証情報
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>車旅コンシェルジュ - 全国車中泊スポットマップ</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
            line-height: 1.7;
            color: #333;
            background: #f5f5f5;
            margin: 0;
        }

        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
            background: white;
        }

        .header {
            background: linear-gradient(rgba(25, 118, 210, 0.85), rgba(66, 165, 245, 0.85))${backgroundImageBase64 ? `,\n                  url('${backgroundImageBase64}')` : ''};
            background-size: cover;
            background-position: center;
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        }

        .auth-button-container {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .auth-button {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s;
        }

        .auth-button:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid white;
        }

        .user-name {
            font-size: 0.9em;
            color: white;
        }

        .header h1 {
            font-size: 2em;
            margin: 0;
            font-weight: 600;
        }

        .header h2 {
            font-size: 1.5em;
            margin: 10px 0 0 0;
            font-weight: 500;
            color: white;
        }

        .header p {
            margin: 10px 0 0 0;
            font-size: 1em;
            opacity: 0.9;
        }

        .nav-links {
            padding: 10px 20px;
            background: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
        }

        .nav-links a {
            margin-right: 20px;
            color: #1976d2;
            text-decoration: none;
            font-size: 0.9em;
        }

        .nav-links a:hover {
            text-decoration: underline;
        }

        .map-container {
            padding: 0;
            margin: 0;
        }

        p { margin-bottom: 1em; }
        a { color: #3B82F6; text-decoration: none; }
        a:hover { text-decoration: underline; }

        #map {
            width: 100%;
            height: calc(100vh - 200px);
            min-height: 600px;
            margin: 0;
            border: none;
            position: relative;
        }

        .elevation-legend {
            position: absolute;
            top: 10px;
            right: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 0.85em;
        }

        .elevation-legend h4 {
            margin: 0 0 10px 0;
            font-size: 1em;
            color: #333;
        }

        .elevation-scale {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .elevation-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .elevation-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .elevation-label {
            color: #666;
            font-size: 0.9em;
        }

        /* 認証モーダル */
        .auth-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        }

        .auth-modal.active {
            display: flex;
        }

        .auth-modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
        }

        .auth-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .auth-modal-header h3 {
            margin: 0;
            color: #1976d2;
        }

        .auth-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }

        .auth-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .auth-tab {
            padding: 10px 20px;
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }

        .auth-tab.active {
            color: #1976d2;
            border-bottom-color: #1976d2;
        }

        .auth-form {
            display: none;
        }

        .auth-form.active {
            display: block;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #666;
            font-size: 0.9em;
        }

        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 1em;
        }

        .form-group input:focus {
            outline: none;
            border-color: #1976d2;
        }

        .submit-button {
            width: 100%;
            padding: 12px;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1em;
            cursor: pointer;
            transition: background 0.3s;
        }

        .submit-button:hover {
            background: #1565c0;
        }

        .oauth-divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
            color: #666;
            font-size: 0.9em;
        }

        .oauth-divider::before,
        .oauth-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e0e0e0;
        }

        .oauth-divider::before {
            margin-right: 10px;
        }

        .oauth-divider::after {
            margin-left: 10px;
        }

        .oauth-button {
            width: 100%;
            padding: 12px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 1em;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .oauth-button:hover {
            background: #f5f5f5;
        }

        .error-message {
            color: #d32f2f;
            font-size: 0.9em;
            margin-top: 10px;
            padding: 10px;
            background: #ffebee;
            border-radius: 6px;
            display: none;
        }

        .error-message.active {
            display: block;
        }

        .success-message {
            color: #388e3c;
            font-size: 0.9em;
            margin-top: 10px;
            padding: 10px;
            background: #e8f5e9;
            border-radius: 6px;
            display: none;
        }

        .success-message.active {
            display: block;
        }

        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.5em;
            }
            .header h2 {
                font-size: 1.2em;
            }
            #map {
                height: 500px;
            }
            .auth-button-container {
                position: static;
                justify-content: center;
                margin-top: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="auth-button-container">
                <div id="auth-user-info" class="user-info" style="display: none;">
                    <img id="user-avatar" class="user-avatar" src="" alt="User Avatar">
                    <span id="user-name" class="user-name"></span>
                </div>
                <button id="login-button" class="auth-button">ログイン</button>
                <button id="logout-button" class="auth-button" style="display: none;">ログアウト</button>
            </div>
            <h1>🚗 車旅コンシェルジュ</h1>
            <h2>全国車中泊スポットマップ</h2>
            <p>日本全国の車中泊スポットを地図上で確認できます</p>
        </div>

        <div class="nav-links">
            <a href="../index.html">← トップページ</a>
            <a href="terms.html">利用規約</a>
            <a href="privacy.html">プライバシーポリシー</a>
            <a href="https://trailfusionai.com" target="_blank">TrailFusion AI</a>
        </div>

        <div class="map-container">
            <div id="map">
                <div class="elevation-legend">
                    <h4>標高</h4>
                    <div class="elevation-scale">
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FF0000;"></div>
                            <span class="elevation-label">1000m+</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FF8000;"></div>
                            <span class="elevation-label">750m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FFFF00;"></div>
                            <span class="elevation-label">500m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #80FF00;"></div>
                            <span class="elevation-label">250m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #00FFFF;"></div>
                            <span class="elevation-label">100m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #0080FF;"></div>
                            <span class="elevation-label">50m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #0000FF;"></div>
                            <span class="elevation-label">0m</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <p>© 2025 TrailFusion AI - 車旅コンシェルジュ</p>
            <p><a href="terms.html">利用規約</a> | <a href="privacy.html">プライバシーポリシー</a></p>
        </footer>
    </div>

    <!-- 認証モーダル -->
    <div id="auth-modal" class="auth-modal">
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h3>ログイン / 新規登録</h3>
                <button class="auth-modal-close" onclick="closeAuthModal()">×</button>
            </div>

            <div class="auth-tabs">
                <button class="auth-tab active" onclick="switchTab('login')">ログイン</button>
                <button class="auth-tab" onclick="switchTab('signup')">新規登録</button>
            </div>

            <!-- ログインフォーム -->
            <div id="login-form" class="auth-form active">
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>メールアドレス</label>
                        <input type="email" id="login-email" required>
                    </div>
                    <div class="form-group">
                        <label>パスワード</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <button type="submit" class="submit-button">ログイン</button>
                </form>
                <div class="oauth-divider">または</div>
                <button class="oauth-button" onclick="signInWithGoogle()">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Googleでログイン
                </button>
                <div id="login-error" class="error-message"></div>
            </div>

            <!-- 新規登録フォーム -->
            <div id="signup-form" class="auth-form">
                <form onsubmit="handleSignup(event)">
                    <div class="form-group">
                        <label>メールアドレス</label>
                        <input type="email" id="signup-email" required>
                    </div>
                    <div class="form-group">
                        <label>パスワード（8文字以上）</label>
                        <input type="password" id="signup-password" minlength="8" required>
                    </div>
                    <div class="form-group">
                        <label>表示名</label>
                        <input type="text" id="signup-display-name" required>
                    </div>
                    <button type="submit" class="submit-button">新規登録</button>
                </form>
                <div class="oauth-divider">または</div>
                <button class="oauth-button" onclick="signInWithGoogle()">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Googleでログイン
                </button>
                <div id="signup-error" class="error-message"></div>
                <div id="signup-success" class="success-message"></div>
            </div>
        </div>
    </div>

    <script>
        // Supabase初期化
        const supabaseUrl = '${supabaseUrl}';
        const supabaseAnonKey = '${supabaseAnonKey}';
        const { createClient } = supabase;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

        // 地域データ
        const regions = ${JSON.stringify(regionsJS, null, 8)};

        // 認証状態の管理
        let currentUser = null;

        // 初期化
        async function initAuth() {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                currentUser = session.user;
                updateAuthUI();
            }

            // 認証状態の変更を監視
            supabaseClient.auth.onAuthStateChange((event, session) => {
                currentUser = session?.user || null;
                updateAuthUI();
            });
        }

        // 認証UIの更新
        function updateAuthUI() {
            const loginButton = document.getElementById('login-button');
            const logoutButton = document.getElementById('logout-button');
            const userInfo = document.getElementById('auth-user-info');
            const userName = document.getElementById('user-name');
            const userAvatar = document.getElementById('user-avatar');

            if (currentUser) {
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                userInfo.style.display = 'flex';

                // ユーザー情報を表示
                userName.textContent = currentUser.user_metadata?.display_name ||
                                      currentUser.email.split('@')[0];
                userAvatar.src = currentUser.user_metadata?.avatar_url ||
                                \`https://ui-avatars.com/api/?name=\${encodeURIComponent(userName.textContent)}&background=1976d2&color=fff\`;
            } else {
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                userInfo.style.display = 'none';
            }
        }

        // 認証モーダルの表示/非表示
        function openAuthModal() {
            document.getElementById('auth-modal').classList.add('active');
        }

        function closeAuthModal() {
            document.getElementById('auth-modal').classList.remove('active');
            clearErrors();
        }

        // タブ切り替え
        function switchTab(tab) {
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            if (tab === 'login') {
                tabs[0].classList.add('active');
                document.getElementById('login-form').classList.add('active');
            } else {
                tabs[1].classList.add('active');
                document.getElementById('signup-form').classList.add('active');
            }

            clearErrors();
        }

        // エラーメッセージのクリア
        function clearErrors() {
            document.querySelectorAll('.error-message, .success-message').forEach(el => {
                el.classList.remove('active');
                el.textContent = '';
            });
        }

        // ログイン処理
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
                closeAuthModal();
            }
        }

        // 新規登録処理
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
                    switchTab('login');
                }, 3000);
            }
        }

        // Google OAuth ログイン
        async function signInWithGoogle() {
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) {
                showError('login-error', error.message);
            }
        }

        // ログアウト処理
        async function handleLogout() {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('ログアウトエラー:', error);
            }
        }

        // エラー表示
        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.classList.add('active');
        }

        // 成功メッセージ表示
        function showSuccess(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.classList.add('active');
        }

        // イベントリスナーの設定
        document.getElementById('login-button').addEventListener('click', openAuthModal);
        document.getElementById('logout-button').addEventListener('click', handleLogout);

        // 地図初期化（日本全体が見えるように拡大）
        const map = L.map('map').setView([37.5, 138.0], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        /**
         * 標高から色を計算（0m=青, 1000m=赤のグラデーション）
         */
        function getColorFromElevation(elevation) {
            // 標高を0-1000の範囲に正規化
            const normalized = Math.min(Math.max(elevation, 0), 1000) / 1000;

            // HSLカラースペースで青(240°)から赤(0°)へ
            const hue = (1 - normalized) * 240;

            return \`hsl(\${hue}, 100%, 50%)\`;
        }

        /**
         * 色付きのピンマーカーSVGを生成
         */
        function createColoredPinIcon(color) {
            const svg = \`<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C10.477 0 6 4.477 6 10C6 20 16 32 16 32C16 32 26 20 26 10C26 4.477 21.523 0 16 0Z" fill="\${color}" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="10" r="4" fill="white"/>
            </svg>\`;

            return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        }

        // マーカーを作成
        regions.forEach(region => {
            const elevation = region.elevation || 0;
            const color = getColorFromElevation(elevation);
            const iconUrl = createColoredPinIcon(color);

            const regionIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [32, 48],
                iconAnchor: [16, 48],
                popupAnchor: [0, -48]
            });

            L.marker([region.lat, region.lng], { icon: regionIcon })
                .addTo(map)
                .bindPopup(\`
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 1.1em;">\${region.name}</h3>
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">標高: \${elevation}m</p>
                        <a href="\${region.url}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em;">車中泊スポットを見る</a>
                    </div>
                \`);
        });

        // 認証初期化
        initAuth();
    </script>
</body>
</html>`;

  // 出力
  const outputPath = path.join(__dirname, 'data', 'index.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`✅ 認証機能付きindex.htmlを生成しました: ${outputPath}`);
  console.log(`   HTMLサイズ: ${html.length.toLocaleString()} bytes`);
  console.log('');
  console.log('🔐 認証機能:');
  console.log('   ✅ Email/Password ログイン・新規登録');
  console.log('   ✅ Google OAuth ログイン');
  console.log('   ✅ セッション管理');
  console.log('   ✅ ユーザー情報表示');
  console.log('');
  console.log('⚠️  次のステップ:');
  console.log('   1. Supabase DashboardでGoogle OAuthを設定');
  console.log('   2. npm run generate-index-with-auth で再生成');
  console.log('   3. ブラウザで動作確認');
}

// 実行
generateIndexHTML().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
