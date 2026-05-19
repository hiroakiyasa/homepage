/* ========================================================================
   drive-routes engagement client (likes / comments / ranking)
   ------------------------------------------------------------------------
   Backed by Supabase car-concierge-prod project. The publishable key below
   is safe to expose: writes are forced through SECURITY DEFINER RPCs
   (`drive_route_toggle_like`, `drive_route_add_comment`) and direct
   INSERT/UPDATE/DELETE are blocked at the RLS layer.
   ======================================================================== */
(() => {
  const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nVj1VgkDZRAWYeMXoeDjkA_X26RDVMV';

  if (typeof window === 'undefined' || !window.supabase || !window.supabase.createClient) {
    console.warn('[engagement] supabase-js not loaded');
    window.engagementAPI = null;
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const DEVICE_KEY = 'tf_device_id';
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  async function fetchLikeCounts() {
    const { data, error } = await client
      .from('drive_route_like_counts')
      .select('route_key,category,like_count');
    if (error) throw error;
    return data || [];
  }

  async function fetchMyLikes() {
    const { data, error } = await client
      .from('drive_route_likes')
      .select('route_key')
      .eq('device_id', getDeviceId())
      .limit(2000);
    if (error) throw error;
    return new Set((data || []).map((r) => r.route_key));
  }

  async function toggleLike(routeKey, category) {
    const { data, error } = await client.rpc('drive_route_toggle_like', {
      p_route_key: routeKey,
      p_category: category,
      p_device_id: getDeviceId(),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || { liked: false, like_count: 0 };
  }

  async function fetchComments(routeKey, limit = 50) {
    const { data, error } = await client
      .from('drive_route_comments')
      .select('id,nickname,body,created_at')
      .eq('route_key', routeKey)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function addComment(routeKey, category, nickname, body) {
    const { data, error } = await client.rpc('drive_route_add_comment', {
      p_route_key: routeKey,
      p_category: category,
      p_device_id: getDeviceId(),
      p_nickname: nickname,
      p_body: body,
    });
    if (error) throw error;
    return data;
  }

  window.engagementAPI = {
    getDeviceId,
    fetchLikeCounts,
    fetchMyLikes,
    toggleLike,
    fetchComments,
    addComment,
  };
})();
