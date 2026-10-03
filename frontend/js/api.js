/* api.js - thin fetch wrapper for PDS Tracker */
const API_BASE = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('pds_token');
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

window.api = {
  auth: {
    login:    (email, password) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data)            => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) })
  },
  beneficiaries: {
    me:     ()       => apiFetch('/beneficiaries/me'),
    all:    ()       => apiFetch('/beneficiaries'),
    byCard: (cardNo) => apiFetch(`/beneficiaries/card/${encodeURIComponent(cardNo)}`)
  },
  entitlements: {
    me:           ()    => apiFetch('/entitlements/me'),
    forBeneficiary:(id) => apiFetch(`/entitlements/${id}`),
    collect:      (id, shop_id) => apiFetch(`/entitlements/${id}/collect`, { method: 'PUT', body: JSON.stringify({ shop_id }) })
  },
  stock: {
    byShop: (shopId) => apiFetch(`/stock/${shopId}`),
    all:    ()       => apiFetch('/stock'),
    update: (data)   => apiFetch('/stock/update', { method: 'POST', body: JSON.stringify(data) })
  },
  grievances: {
    submit:       (data)         => apiFetch('/grievances',           { method: 'POST', body: JSON.stringify(data) }),
    all:          ()             => apiFetch('/grievances'),
    byShop:       (shopId)       => apiFetch(`/grievances/shop/${shopId}`),
    updateStatus: (id, status, admin_note) => apiFetch(`/grievances/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, admin_note }) })
  },
  analytics: {
    summary: ()  => apiFetch('/analytics/summary'),
    public:  ()  => apiFetch('/analytics/public')
  }
};
