export function getAdminAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('adminToken') || '';
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAdminAuthHeadersWithJson() {
  return getAdminAuthHeaders({ 'Content-Type': 'application/json' });
}
