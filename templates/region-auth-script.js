// Supabase初期化
const supabaseUrl = '{{SUPABASE_URL}}';
const supabaseAnonKey = '{{SUPABASE_ANON_KEY}}';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 地域スラッグ（URLから取得）
const regionSlug = '{{REGION_SLUG}}';

// 認証状態
let currentUser = null;
let currentLikeId = null;
let userCommentLikes = new Set();

// 認証初期化
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateAuthUI();
    await loadUserLikeStatus();
    await loadUserCommentLikes();
  }

  // 認証状態の変更を監視
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) {
      await loadUserLikeStatus();
      await loadUserCommentLikes();
    } else {
      currentLikeId = null;
      userCommentLikes.clear();
    }
    updateLikeButton();
  });
}

// 認証UIの更新
function updateAuthUI() {
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const userInfo = document.getElementById('auth-user-info');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const commentFormContainer = document.getElementById('comment-form-container');
  const loginPrompt = document.getElementById('login-prompt');

  if (currentUser) {
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    userInfo.style.display = 'flex';

    userName.textContent = currentUser.user_metadata?.display_name ||
                          currentUser.email.split('@')[0];
    userAvatar.src = currentUser.user_metadata?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName.textContent)}&background=1976d2&color=fff`;

    // コメントフォーム表示
    commentFormContainer.style.display = 'block';
    loginPrompt.style.display = 'none';
  } else {
    loginButton.style.display = 'block';
    logoutButton.style.display = 'none';
    userInfo.style.display = 'none';

    // コメントフォーム非表示
    commentFormContainer.style.display = 'none';
    loginPrompt.style.display = 'block';
  }
}

// ユーザーのいいね状態を読み込み
async function loadUserLikeStatus() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('region_likes')
    .select('id')
    .eq('region_slug', regionSlug)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (!error && data) {
    currentLikeId = data.id;
  }
}

// ユーザーがいいねしたコメントを読み込み
async function loadUserCommentLikes() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', currentUser.id);

  if (!error && data) {
    userCommentLikes = new Set(data.map(like => like.comment_id));
  }
}

// 地域のいいね数を読み込み
async function loadRegionLikes() {
  const { data, error } = await supabaseClient
    .from('regions')
    .select('like_count')
    .eq('slug', regionSlug)
    .single();

  if (!error && data) {
    document.getElementById('like-count').textContent = data.like_count;
  }

  updateLikeButton();
}

// いいねボタンの状態を更新
function updateLikeButton() {
  const likeButton = document.getElementById('region-like-button');

  if (currentUser) {
    likeButton.disabled = false;
    if (currentLikeId) {
      likeButton.classList.add('liked');
    } else {
      likeButton.classList.remove('liked');
    }
  } else {
    likeButton.disabled = true;
    likeButton.classList.remove('liked');
  }
}

// 地域いいねのトグル
async function toggleRegionLike() {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  if (currentLikeId) {
    // いいねを取り消し
    const { error } = await supabaseClient
      .from('region_likes')
      .delete()
      .eq('id', currentLikeId);

    if (!error) {
      currentLikeId = null;
      await loadRegionLikes();
    }
  } else {
    // いいねを追加
    const { data, error } = await supabaseClient
      .from('region_likes')
      .insert({
        region_slug: regionSlug,
        user_id: currentUser.id
      })
      .select()
      .single();

    if (!error && data) {
      currentLikeId = data.id;
      await loadRegionLikes();
    }
  }
}

// コメントを読み込み
async function loadComments() {
  const commentsList = document.getElementById('comments-list');
  commentsList.innerHTML = '<p class="loading">コメントを読み込み中...</p>';

  const { data, error } = await supabaseClient
    .from('region_comments')
    .select(`
      id,
      content,
      like_count,
      created_at,
      user_id,
      is_edited
    `)
    .eq('region_slug', regionSlug)
    .order('created_at', { ascending: false });

  if (error) {
    commentsList.innerHTML = '<p class="loading">コメントの読み込みに失敗しました</p>';
    return;
  }

  if (!data || data.length === 0) {
    commentsList.innerHTML = '<p class="loading">まだコメントがありません。最初のコメントを投稿しましょう！</p>';
    return;
  }

  commentsList.innerHTML = '';

  for (const comment of data) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    commentEl.dataset.commentId = comment.id;

    const date = new Date(comment.created_at);
    const dateStr = date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    const isLiked = userCommentLikes.has(comment.id);
    const canDelete = currentUser && currentUser.id === comment.user_id;

    // コメントヘッダー
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';

    const commentAuthor = document.createElement('div');
    commentAuthor.className = 'comment-author';

    const avatar = document.createElement('img');
    avatar.src = 'https://ui-avatars.com/api/?name=User&background=1976d2&color=fff';
    avatar.className = 'comment-avatar';
    avatar.alt = 'Avatar';

    const authorName = document.createElement('span');
    authorName.className = 'comment-author-name';
    authorName.textContent = `ユーザー${comment.user_id.substring(0, 8)}`;

    commentAuthor.appendChild(avatar);
    commentAuthor.appendChild(authorName);

    const commentDate = document.createElement('span');
    commentDate.className = 'comment-date';
    commentDate.textContent = dateStr + (comment.is_edited ? ' (編集済み)' : '');

    commentHeader.appendChild(commentAuthor);
    commentHeader.appendChild(commentDate);

    // コメント内容
    const commentContent = document.createElement('div');
    commentContent.className = 'comment-content';
    commentContent.textContent = comment.content;

    // コメントアクション
    const commentActions = document.createElement('div');
    commentActions.className = 'comment-actions';

    const likeButton = document.createElement('button');
    likeButton.className = `comment-like-button ${isLiked ? 'liked' : ''}`;
    likeButton.onclick = () => toggleCommentLike(comment.id);
    likeButton.disabled = !currentUser;

    const likeIcon = document.createTextNode('❤️ ');
    const likeCountSpan = document.createElement('span');
    likeCountSpan.textContent = comment.like_count;

    likeButton.appendChild(likeIcon);
    likeButton.appendChild(likeCountSpan);
    commentActions.appendChild(likeButton);

    if (canDelete) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'comment-delete-button';
      deleteButton.onclick = () => deleteComment(comment.id);
      deleteButton.textContent = '🗑️ 削除';
      commentActions.appendChild(deleteButton);
    }

    // すべてを組み立て
    commentEl.appendChild(commentHeader);
    commentEl.appendChild(commentContent);
    commentEl.appendChild(commentActions);

    commentsList.appendChild(commentEl);
  }
}

// コメントを投稿
async function submitComment(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuthModal();
    return;
  }

  const input = document.getElementById('comment-input');
  const content = input.value.trim();

  if (!content || content.length < 1 || content.length > 1000) {
    alert('コメントは1文字以上1000文字以内で入力してください');
    return;
  }

  const { error } = await supabaseClient
    .from('region_comments')
    .insert({
      region_slug: regionSlug,
      user_id: currentUser.id,
      content: content
    });

  if (error) {
    alert('コメントの投稿に失敗しました: ' + error.message);
    return;
  }

  input.value = '';
  updateCharCount();
  await loadComments();
}

// コメントを削除
async function deleteComment(commentId) {
  if (!confirm('このコメントを削除してもよろしいですか？')) {
    return;
  }

  const { error } = await supabaseClient
    .from('region_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    alert('コメントの削除に失敗しました: ' + error.message);
    return;
  }

  await loadComments();
}

// コメントいいねのトグル
async function toggleCommentLike(commentId) {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  const isLiked = userCommentLikes.has(commentId);

  if (isLiked) {
    // いいねを取り消し
    const { error } = await supabaseClient
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', currentUser.id);

    if (!error) {
      userCommentLikes.delete(commentId);
      await loadComments();
    }
  } else {
    // いいねを追加
    const { error } = await supabaseClient
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: currentUser.id
      });

    if (!error) {
      userCommentLikes.add(commentId);
      await loadComments();
    }
  }
}

// 文字数カウント更新
function updateCharCount() {
  const input = document.getElementById('comment-input');
  const charCount = document.getElementById('char-count');
  charCount.textContent = `${input.value.length}/1000`;
}

// HTML エスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 認証モーダル関連
function openAuthModal() {
  document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
  clearErrors();
}

function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabs = document.querySelectorAll('.auth-tab');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    tabs[0].classList.add('active');
  } else {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    tabs[1].classList.add('active');
  }

  clearErrors();
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
    closeAuthModal();
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
      closeAuthModal();
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

async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('ログアウトエラー:', error);
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message, .success-message').forEach(el => {
    el.classList.remove('active');
    el.textContent = '';
  });
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.add('active');
}

function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.add('active');
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', async () => {
  // 認証初期化
  await initAuth();

  // いいねデータ読み込み
  await loadRegionLikes();

  // コメント読み込み
  await loadComments();

  // イベントリスナー
  document.getElementById('login-button').addEventListener('click', openAuthModal);
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
  });
  document.getElementById('region-like-button').addEventListener('click', toggleRegionLike);
  document.getElementById('comment-form').addEventListener('submit', submitComment);
  document.getElementById('comment-input').addEventListener('input', updateCharCount);

  // モーダル外クリックで閉じる
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') {
      closeAuthModal();
    }
  });
});
