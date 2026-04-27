/** 將 datetime-local 字串轉 ISO；將 API 的 Instant 轉回 datetime-local */

export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}
