import { api } from './client';
import type { WeekendSessionPayload, WeekendSessionRow } from './types';

export function listWeekendSessions() {
  return api<WeekendSessionRow[]>('/api/weekend-sessions');
}

export function createWeekendSession(body: WeekendSessionPayload) {
  return api<WeekendSessionRow>('/api/weekend-sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateWeekendSession(id: number, body: WeekendSessionPayload) {
  return api<WeekendSessionRow>(`/api/weekend-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteWeekendSession(id: number) {
  return api<void>(`/api/weekend-sessions/${id}`, { method: 'DELETE' });
}
