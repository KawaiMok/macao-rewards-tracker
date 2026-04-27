import { api } from './client';
import type { SummaryResponse, WeeklyPrizeBoardResponse } from './types';

export function fetchSummary(campaignYear?: number) {
  const q = campaignYear != null ? `?campaignYear=${campaignYear}` : '';
  return api<SummaryResponse>(`/api/summary${q}`);
}

export function fetchWeeklyPrizeBoard(campaignYear?: number) {
  const q = campaignYear != null ? `?campaignYear=${campaignYear}` : '';
  return api<WeeklyPrizeBoardResponse>(`/api/summary/weekly-prize-board${q}`);
}
