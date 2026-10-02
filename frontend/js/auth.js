/* auth.js — session helpers */

window.auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('pds_user')); } catch { return null; }
  },

  getToken() {
    return localStorage.getItem('pds_token');
  },

  setSession(token, user, profile) {
    localStorage.setItem('pds_token', token);
    localStorage.setItem('pds_user',  JSON.stringify(user));
    if (profile) localStorage.setItem('pds_profile', JSON.stringify(profile));
  },

  getProfile() {
    try { return JSON.parse(localStorage.getItem('pds_profile')); } catch { return null; }
  },

  logout() {
    localStorage.removeItem('pds_token');
    localStorage.removeItem('pds_user');
    localStorage.removeItem('pds_profile');
    window.location.href = '/index.html';
  },

  // Redirect away if not logged in / wrong role
  require(roles) {
    const user = this.getUser();
    if (!user || !this.getToken()) { window.location.href = '/index.html'; return null; }
    if (roles && !roles.includes(user.role)) { window.location.href = '/index.html'; return null; }
    return user;
  },

  roleHref(role) {
    const map = { admin: '/admin.html', shop_owner: '/shop.html', beneficiary: '/dashboard.html' };
    return map[role] || '/index.html';
  }
};
