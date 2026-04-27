/** API 基底位址與帶 JWT 的 fetch 封裝 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const TOKEN_KEY = 'macao_rewards_token';
const USER_KEY = 'macao_rewards_username';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, username: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, username);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUsername(): string | null {
  return sessionStorage.getItem(USER_KEY);
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const token = getStoredToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new ApiError(typeof msg === 'string' ? msg : '請求失敗', res.status);
  }
  return data as T;
}
