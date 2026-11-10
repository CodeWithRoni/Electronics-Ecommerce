const rejected = () => new Error('Invalid username, email or password');

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
      return { access_token: session.access_token };
    },

    async canManage(header) {
      if (!header?.startsWith('Bearer ')) return false;
      const token = header.slice(7);
      if (!token || token.length > 8192) return false;
      const user = await authRequest('user', { token });
      return Boolean(user?.id && (await lookup({ p_user_id: user.id }))?.allowed);
    },
  };
}
