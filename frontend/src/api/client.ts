/** API 基底位址與帶 JWT 的 fetch 封裝 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
// 避免後端位址錯誤或離線時，畫面一直「沒反應」
const DEFAULT_TIMEOUT_MS = 10_000;

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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === 'AbortError'
        ? `連線逾時（${DEFAULT_TIMEOUT_MS / 1000}s），請確認後端是否啟動：${BASE}`
        : `無法連線到後端，請確認後端是否啟動：${BASE}`;
    throw new ApiError(msg, 0);
  } finally {
    window.clearTimeout(timeout);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new ApiError(typeof msg === 'string' ? msg : '請求失敗', res.status);
  }
  return data as T;
}
