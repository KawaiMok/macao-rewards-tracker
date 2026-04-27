import { api } from './client';
import type { WalletMeta } from './types';

export function fetchWallets() {
  return api<WalletMeta[]>('/api/meta/wallets');
}
