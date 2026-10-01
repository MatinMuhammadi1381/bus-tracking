export function getDriverAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('driverToken')?.trim() || '';
  return {
    ...extraHeaders,
    ...(token.length > 0 ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getDriverAuthHeadersWithJson() {
  return getDriverAuthHeaders({ 'Content-Type': 'application/json' });
}
