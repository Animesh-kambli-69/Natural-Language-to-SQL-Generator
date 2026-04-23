const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || payload.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export async function registerUser(email, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: { email, password }
  });
}

export async function loginUser(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export async function logoutUser() {
  return request('/api/auth/logout', {
    method: 'POST'
  });
}

export async function fetchSchemas() {
  return request('/api/schemas');
}

export async function createSchema(schemaData) {
  return request('/api/schemas', {
    method: 'POST',
    body: schemaData
  });
}

export async function fetchHistory(limit = 30) {
  return request(`/api/history?limit=${limit}`);
}

export async function generateQuery(payload) {
  return request('/api/query/generate', {
    method: 'POST',
    body: payload
  });
}

export async function rerunHistoryItem(historyId) {
  return request(`/api/query/rerun/${historyId}`, {
    method: 'POST'
  });
}
