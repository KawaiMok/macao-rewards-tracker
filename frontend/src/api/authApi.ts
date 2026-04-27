import { api, clearSession, setSession } from './client';

export async function register(username: string, password: string) {
  const r = await api<{ token: string; username: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setSession(r.token, r.username);
  return r;
}

export async function login(username: string, password: string) {
  const r = await api<{ token: string; username: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setSession(r.token, r.username);
  return r;
}

export function logout() {
  clearSession();
}
