const getToken = () => localStorage.getItem('jarvisbot_token');

export async function apiFetch(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('jarvisbot_token');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function apiPost(url, data) {
  return apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function apiPut(url, data) {
  return apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function apiDelete(url) {
  return apiFetch(url, {
    method: 'DELETE',
  });
}
