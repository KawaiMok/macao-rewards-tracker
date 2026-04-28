export function requiredEnv(name: string): string {
  const v = (import.meta.env as Record<string, unknown>)[name];
  if (typeof v === 'string' && v.trim()) return v;
  throw new Error(`缺少環境變數：${name}`);
}

