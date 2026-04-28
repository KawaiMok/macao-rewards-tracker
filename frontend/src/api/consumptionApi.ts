import { api } from './client';
import type { ConsumptionRecordPayload, ConsumptionRecordRow, WalletId } from './types';

export function createConsumptionRecord(body: ConsumptionRecordPayload) {
  return api<ConsumptionRecordRow>('/api/consumptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listCurrentWeekConsumptions(wallet: WalletId) {
  return api<ConsumptionRecordRow[]>(`/api/consumptions/current-week?wallet=${wallet}`);
}

export function undoExplicitConsume(wallet: WalletId, denom: number) {
  return api<void>('/api/consumptions/undo-explicit', {
    method: 'POST',
    body: JSON.stringify({ wallet, denom }),
  });
}
