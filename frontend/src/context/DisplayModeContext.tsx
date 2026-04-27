import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DisplayMode = 'desktop' | 'mobile';

interface DisplayModeContextValue {
  mode: DisplayMode;
  toggleMode: () => void;
}

const DISPLAY_MODE_STORAGE_KEY = 'macao_rewards_display_mode';
const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

function getStoredDisplayMode(): DisplayMode {
  const stored = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
  return stored === 'mobile' ? 'mobile' : 'desktop';
}

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>(() => getStoredDisplayMode());

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'desktop' ? 'mobile' : 'desktop';
      // 將使用者偏好保存，重整頁面後仍維持當前模式。
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
}

export function useDisplayMode() {
  const ctx = useContext(DisplayModeContext);
  if (!ctx) throw new Error('useDisplayMode 需在 DisplayModeProvider 內使用');
  return ctx;
}
