const rejected = () => new Error('Invalid username, email or password');
const expired = () => new Error('Your session has expired. Sign in again.');

// The admin panel needs the refresh token so it can renew the short-lived access token.
const adminSession = (session) => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (Number(session.expires_in) || 3600),
});

export function createAdminAuth(url, publicKey, serverKey, lookup) {
  async function authRequest(path, { key = publicKey, token, body } = {}) {
    if (!url || !key) throw new Error('Admin sign-in is temporarily unavailable');
    const headers = { apikey: key };
    if (token || key.startsWith('eyJ')) headers.Authorization = `Bearer ${token || key}`;
    if (body) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(new URL(`/auth/v1/${path}`, url), {
        method: body ? 'POST' : 'GET', headers, body: body && JSON.stringify(body),
      });
    } catch {
      throw new Error('Admin sign-in is temporarily unavailable');
    }
    if (response.status === 429) throw new Error('Too many sign-in attempts. Try again shortly.');
    if (response.status >= 500) throw new Error('Admin sign-in is temporarily unavailable');
    if (!response.ok) return null;
    return response.json();
  }

  async function customerId(header) {
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7);
    if (!token || token.length > 8192) return null;
    const user = await authRequest('user', { token });
    return user?.id || null;
  }

  return {
    async signIn(login, password) {
      if (typeof login !== 'string' || typeof password !== 'string' || !password || password.length > 1024)
        throw rejected();
      let email = login.trim().toLowerCase();
      if (!email || email.length > 254) throw rejected();
      if (!email.includes('@')) {
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(email)) throw rejected();
        const account = await lookup({ p_username: email });
        if (!account?.user_id) throw rejected();
        const record = await authRequest(`admin/users/${encodeURIComponent(account.user_id)}`, { key: serverKey });
        email = record?.email || record?.user?.email;
        if (!email) throw rejected();
      }
      const session = await authRequest('token?grant_type=password', { body: { email, password } });
      if (!session?.access_token || !session.user?.id) throw rejected();
      if (!(await lookup({ p_user_id: session.user.id }))?.allowed) throw rejected();
      return adminSession(session);
    },

    async refresh(refreshToken) {
      if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > 1024) throw expired();
      const session = await authRequest('token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
      if (!session?.access_token || !session.user?.id) throw expired();
      // Removing the allowlist row revokes access, even for a session that is being renewed.
      if (!(await lookup({ p_user_id: session.user.id }))?.allowed) throw expired();
      return adminSession(session);
    },

    customerId,

    async canManage(header) {
      const id = await customerId(header);
      return Boolean(id && (await lookup({ p_user_id: id }))?.allowed);
    },
  };
}
