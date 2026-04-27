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
