/** 與後端 DTO 對齊的型別 */

export type WalletId =
  | 'ALIPAY_MO'
  | 'BOC_MACAU_MOBILE'
  | 'CGB_WALLET'
  | 'ICBC_EPAY'
  | 'LUSO_PAY'
  | 'MPAY'
  | 'FUNG_PAY_BAO'
  | 'UEPAY_MO';

export interface WalletMeta {
  id: WalletId;
  displayName: string;
}

export interface OutcomeInput {
  drawIndex: number;
  prizeMop: number | null;
}

export interface WeekendSessionPayload {
  occurredAt: string;
  wallet: WalletId;
  spendAmount: number | null;
  merchantName: string | null;
  outcomes: OutcomeInput[];
}

export interface WeekendSessionRow {
  id: number;
  weekNumber: number;
  occurredAt: string;
  wallet: WalletId;
  spendAmount: number | null;
  merchantName: string | null;
  outcomes: { id: number; drawIndex: number; prizeMop: number | null }[];
}

export interface SummaryResponse {
  campaignYear: number;
  totalSessions: number;
  sessionsThisWeek: number;
  prizeCountsByMop: Record<string, number>;
  sessionCountByWallet: Record<string, number>;
  weekWalletMatrix: { weekNumber: number; sessionCountByWallet: Record<string, number> }[];
}

export interface WeeklyPrizeBoardResponse {
  campaignYear: number;
  weekNumber: number;
  weekStartInclusive: string;
  weekEndExclusive: string;
  prizeDenominations: number[];
  rows: {
    walletId: WalletId;
    walletDisplayName: string;
    prizeCountByMop: Record<string, number>;
    consumedCouponCountByMop: Record<string, number>;
    requiredSpendTotal: number;
    consumedSpendTotal: number;
    remainingSpendToConsumeAll: number;
  }[];
}

export interface ConsumptionRecordPayload {
  wallet: WalletId;
  occurredAt: string;
  amount: number;
  note: string | null;
}

export interface ConsumptionRecordRow {
  id: number;
  wallet: WalletId;
  occurredAt: string;
  amount: number;
  note: string | null;
}
