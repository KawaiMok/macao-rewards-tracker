import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getStoredToken, getStoredUsername } from '../api/client';
import * as authApi from '../api/authApi';

interface AuthState {
  username: string | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (u: string, p: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => getStoredUsername());
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const login = useCallback(async (u: string, p: string) => {
    const r = await authApi.login(u, p);
    setUsername(r.username);
    setToken(r.token);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const r = await authApi.loginWithGoogle(idToken);
    setUsername(r.username);
    setToken(r.token);
  }, []);

  const register = useCallback(async (u: string, p: string) => {
    const r = await authApi.register(u, p);
    setUsername(r.username);
    setToken(r.token);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUsername(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ username, token, login, loginWithGoogle, register, logout }),
    [username, token, login, loginWithGoogle, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 需在 AuthProvider 內使用');
  return ctx;
}
