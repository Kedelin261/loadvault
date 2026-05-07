// In production VITE_API_URL must be set in .env.production (baked at build time).
// In development the Vite proxy rewrites /api → localhost:3001, so no env var needed.
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '');

function getToken() {
  return localStorage.getItem('lv_token');
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  const res = await fetch(url, config);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem('lv_token');
    }
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) localStorage.removeItem('lv_token');
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  confirm: (docId, fields) =>
    request(`/upload/${docId}/confirm`, { method: 'POST', body: JSON.stringify({ fields }) }),
  uploadForm: async (path, formData) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) localStorage.removeItem('lv_token');
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
