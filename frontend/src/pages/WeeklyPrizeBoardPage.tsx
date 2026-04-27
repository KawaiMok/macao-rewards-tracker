import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWeeklyPrizeBoard } from '../api/summaryApi';
import { createWeekendSession } from '../api/weekendApi';
import { createConsumptionRecord } from '../api/consumptionApi';
import type { WalletId, WeeklyPrizeBoardResponse } from '../api/types';
import { ApiError } from '../api/client';
import { WalletDisplay } from '../components/WalletDisplay';

const QUICK_PRIZES = [10, 20, 50, 100, 200];
const IOS_FAB_SX = {
  // iOS 風格懸浮按鈕：玻璃感半透明底、柔和陰影、按下回饋。
  px: 2,
  minHeight: 46,
  borderRadius: 999,
  color: '#0a84ff',
  bgcolor: 'rgba(255, 255, 255, 0.72)',
  border: '1px solid rgba(255, 255, 255, 0.65)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.12)',
  backdropFilter: 'blur(14px) saturate(140%)',
  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
  transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
  '&:hover': {
    bgcolor: 'rgba(255, 255, 255, 0.82)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.2), 0 3px 8px rgba(15, 23, 42, 0.14)',
  },
  '&:active': {
    transform: 'scale(0.97)',
  },
};

export function WeeklyPrizeBoardPage() {
  const [data, setData] = useState<WeeklyPrizeBoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [targetWallet, setTargetWallet] = useState<WalletId | null>(null);
  const [selectedPrizes, setSelectedPrizes] = useState<number[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consumingKeys, setConsumingKeys] = useState<Record<string, boolean>>({});
  const [newlyAddedUnconsumed, setNewlyAddedUnconsumed] = useState<Record<string, number>>({});
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planAmountInput, setPlanAmountInput] = useState('');

  const load = useCallback(async () => {
    const res = await fetchWeeklyPrizeBoard();
    setData(res);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWeeklyPrizeBoard();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : '載入失敗');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  function openAddDialog(walletId: WalletId) {
    setTargetWallet(walletId);
    setSelectedPrizes([]);
    setSaveError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!targetWallet) return;
    if (selectedPrizes.length === 0) {
      setSaveError('請至少選擇 1 張獎券');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const addedCounts = selectedPrizes.reduce<Record<string, number>>((acc, prize) => {
        const key = `${targetWallet}-${prize}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      await createWeekendSession({
        occurredAt: new Date().toISOString(),
        wallet: targetWallet,
        spendAmount: null,
        merchantName: null,
        outcomes: [
          { drawIndex: 1, prizeMop: selectedPrizes[0] ?? null },
          { drawIndex: 2, prizeMop: selectedPrizes[1] ?? null },
          { drawIndex: 3, prizeMop: selectedPrizes[2] ?? null },
        ],
      });
      // 剛新增的券先保留為「未消耗」視覺狀態，避免被既有消費金額立即抵扣成灰色。
      setNewlyAddedUnconsumed((prev) => {
        const next = { ...prev };
        Object.entries(addedCounts).forEach(([key, count]) => {
          next[key] = (next[key] ?? 0) + count;
        });
        return next;
      });
      await load();
      setDialogOpen(false);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : '新增失敗');
    } finally {
      setSaving(false);
    }
  }

  async function consumeCoupon(walletId: WalletId, denom: number) {
    const key = `${walletId}-${denom}-${Date.now()}`;
    setConsumingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      // 每消耗一張面額券，按規則記錄 3 倍面額消費，後端會自動換算已耗券數。
      await createConsumptionRecord({
        wallet: walletId,
        occurredAt: new Date().toISOString(),
        amount: denom * 3,
        // 後端會依此標記做精準扣券：點哪張就消耗哪張。
        note: `AUTO_CONSUME_DENOM=${denom}`,
      });
      // 一旦手動點擊該面額，就取消此面額的「剛新增保留未消耗」保護，避免灰階延遲一拍。
      setNewlyAddedUnconsumed((prev) => {
        const keyOfCoupon = `${walletId}-${denom}`;
        if (!(keyOfCoupon in prev)) return prev;
        const next = { ...prev };
        delete next[keyOfCoupon];
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '標記消耗失敗');
    } finally {
      setConsumingKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  const rows = data?.rows ?? [];
  const rowsWithPrize = rows.filter((row) =>
    Object.values(row.prizeCountByMop).some((count) => count > 0),
  );
  const rowsWithoutRecord = rows.filter((row) =>
    Object.values(row.prizeCountByMop).every((count) => count === 0),
  );
  const selectedPrizeTimes = selectedPrizes.length;
  const planAmount = Number(planAmountInput);
  const hasPlanAmount = Number.isFinite(planAmount) && planAmount > 0;
  const planScenarios = useMemo(() => {
    if (!hasPlanAmount || !data) return [];
    const denomsDesc = [...data.prizeDenominations].sort((a, b) => b - a);
    const walletPlans = rowsWithPrize.map((row) => {
      const availableByDenom = denomsDesc.map((denom) => {
        const won = row.prizeCountByMop[String(denom)] ?? 0;
        const consumed = row.consumedCouponCountByMop[String(denom)] ?? 0;
        const reserved = newlyAddedUnconsumed[`${row.walletId}-${denom}`] ?? 0;
        // 與主卡券顯示一致：先算有效已消耗，再推算本週仍未消耗券數。
        const effectiveConsumed = Math.max(0, consumed - reserved);
        const available = Math.max(0, won - effectiveConsumed);
        return { denom, available };
      });
      return { row, availableByDenom };
    }).filter((x) => x.availableByDenom.some((d) => d.available > 0));

    if (walletPlans.length === 0) return [];

    const permutations: number[][] = [];
    const used = Array(walletPlans.length).fill(false);
    const path: number[] = [];
    const dfs = () => {
      if (path.length === walletPlans.length) {
        permutations.push([...path]);
        return;
      }
      for (let i = 0; i < walletPlans.length; i += 1) {
        if (used[i]) continue;
        used[i] = true;
        path.push(i);
        dfs();
        path.pop();
        used[i] = false;
      }
    };
    dfs();

    const dedup = new Map<string, {
      order: string;
      wallets: { walletId: WalletId; walletDisplayName: string; suggestedSpend: number; breakdown: { denom: number; suggested: number }[] }[];
      totalSuggestedCoupons: number;
      totalSuggestedSpend: number;
      remainingBudget: number;
    }>();

    permutations.forEach((perm) => {
      let remainingBudget = planAmount;
      const walletResults = perm.map((idx) => {
        const walletPlan = walletPlans[idx];
        const breakdown = walletPlan.availableByDenom.map((item) => {
          const spendPerCoupon = item.denom * 3;
          const suggested = spendPerCoupon > 0 ? Math.min(item.available, Math.floor(remainingBudget / spendPerCoupon)) : 0;
          remainingBudget -= suggested * spendPerCoupon;
          return { denom: item.denom, suggested };
        }).filter((b) => b.suggested > 0);
        return {
          walletId: walletPlan.row.walletId,
          walletDisplayName: walletPlan.row.walletDisplayName,
          suggestedSpend: breakdown.reduce((sum, b) => sum + b.denom * b.suggested * 3, 0),
          breakdown,
        };
      }).filter((w) => w.breakdown.length > 0);

      const signature = JSON.stringify({
        remainingBudget,
        // 去重時忽略支付順序：只要各支付工具的建議明細一致，即視為同一方案。
        wallets: [...walletResults]
          .map((w) => ({
            walletId: w.walletId,
            breakdown: w.breakdown,
          }))
          .sort((a, b) => String(a.walletId).localeCompare(String(b.walletId))),
      });
      if (dedup.has(signature)) return;
      const totalSuggestedCoupons = walletResults.reduce(
        (sum, w) => sum + w.breakdown.reduce((inner, b) => inner + b.suggested, 0),
        0,
      );
      const totalSuggestedSpend = planAmount - remainingBudget;
      dedup.set(signature, {
        order: walletResults.map((w) => w.walletDisplayName).join(' → '),
        wallets: walletResults,
        totalSuggestedCoupons,
        totalSuggestedSpend,
        remainingBudget,
      });
    });

    return Array.from(dedup.values()).sort((a, b) =>
      a.remainingBudget - b.remainingBudget || b.totalSuggestedCoupons - a.totalSuggestedCoupons,
    );
  }, [data, hasPlanAmount, newlyAddedUnconsumed, planAmount, rowsWithPrize]);

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!data) {
    return <Typography>載入中…</Typography>;
  }

  return (
    <Box
      sx={{
        // 預留底部安全空間，避免懸浮按鈕擋住底部內容（桌面版按鈕較高）。
        pb: {
          xs: 'calc(210px + env(safe-area-inset-bottom, 0px))',
          sm: 'calc(400px + env(safe-area-inset-bottom, 0px))',
        },
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: 26, sm: 30 } }}>
        本週中獎總覽
      </Typography>
      <Typography color="text.secondary" variant="body2" gutterBottom>
        活動年度 {data.campaignYear} · 第 {data.weekNumber} 週 · 統計區間{' '}
        {new Date(data.weekStartInclusive).toLocaleString()} - {new Date(data.weekEndExclusive).toLocaleString()}
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {rowsWithPrize.length === 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">本週暫無中獎支付工具，請按右下角新增中獎。</Typography>
            </CardContent>
          </Card>
        )}
        {rowsWithPrize.map((row) => (
          <Card
            key={row.walletId}
            variant="outlined"
            sx={{
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
            }}
          >
            <CardContent sx={{ py: '8px !important', px: 1.5 }}>
              <WalletDisplay walletId={row.walletId} displayName={row.walletDisplayName} />
              <Box sx={{ mt: 1 }}>
                <Typography variant="body1">需：{row.requiredSpendTotal}</Typography>
                <Typography variant="body1" color="text.secondary">
                  已消費：{row.consumedSpendTotal}
                </Typography>
                <Typography variant="body1" color={row.remainingSpendToConsumeAll > 0 ? 'error.main' : 'success.main'}>
                  尚欠：{row.remainingSpendToConsumeAll}
                </Typography>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  點擊未消耗獎券可標記消耗
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, justifyContent: 'center' }}>
                  {data.prizeDenominations.flatMap((d) => {
                    const won = row.prizeCountByMop[String(d)] ?? 0;
                    const consumed = row.consumedCouponCountByMop[String(d)] ?? 0;
                    const reservedAsUnconsumed = newlyAddedUnconsumed[`${row.walletId}-${d}`] ?? 0;
                    const effectiveConsumed = Math.max(0, consumed - reservedAsUnconsumed);
                    return Array.from({ length: won }).map((_, idx) => {
                      const isConsumed = idx < effectiveConsumed;
                      const loading = Object.values(consumingKeys).some(Boolean);
                      return (
                        <Chip
                          key={`${row.walletId}-${d}-${idx}`}
                          label={
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  bgcolor: isConsumed ? 'rgba(120,120,120,0.55)' : 'rgba(76,120,220,0.24)',
                                }}
                              >
                                $
                              </Box>
                              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{d}</span>
                            </Box>
                          }
                          size="small"
                          onClick={isConsumed || loading ? undefined : () => consumeCoupon(row.walletId, d)}
                          sx={{
                            cursor: isConsumed ? 'default' : 'pointer',
                            bgcolor: isConsumed ? 'rgba(140,140,140,0.5)' : 'rgba(131,171,255,0.2)',
                            color: isConsumed ? 'rgba(220,220,220,0.8)' : 'inherit',
                            textDecoration: isConsumed ? 'line-through' : 'none',
                            flexShrink: 0,
                            height: 40,
                            '& .MuiChip-label': {
                              px: 1.25,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                          }}
                        />
                      );
                    });
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Fab
        variant="extended"
        color="primary"
        aria-label="消費計劃"
        onClick={() => {
          setPlanAmountInput('');
          setPlanDialogOpen(true);
        }}
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 30 },
          bottom: { xs: 178, sm: 354 },
          zIndex: 1300,
          ...IOS_FAB_SX,
        }}
      >
        消費計劃
      </Fab>

      <Fab
        variant="extended"
        color="primary"
        aria-label="新增中獎"
        onClick={() => setWalletPickerOpen(true)}
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 30 },
          bottom: { xs: 120, sm: 296 },
          zIndex: 1300,
          ...IOS_FAB_SX,
        }}
      >
        ＋ 新增中獎
      </Fab>

      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>消費計劃（本週未消耗獎券建議）</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="本次預計消費金額"
              value={planAmountInput}
              onChange={(e) => setPlanAmountInput(e.target.value)}
              placeholder="例如 900"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              fullWidth
            />
            {!hasPlanAmount ? (
              <Typography color="text.secondary">請輸入大於 0 的消費金額，系統會即時計算各支付工具建議可消耗券數。</Typography>
            ) : planScenarios.length === 0 ? (
              <Typography color="text.secondary">目前沒有可消耗的未消耗獎券。</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {planScenarios.map((scenario, idx) => (
                  <Card key={`scenario-${idx}`} variant="outlined">
                    <CardContent>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        方案 {idx + 1}：建議可消耗 {scenario.totalSuggestedCoupons} 張
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        對應消費：{scenario.totalSuggestedSpend}（剩餘預算：{scenario.remainingBudget}）
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        支付順序：{scenario.order || '無'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'grid', gap: 0.75 }}>
                        {scenario.wallets.map((wallet) => (
                          <Box key={`scenario-${idx}-${wallet.walletId}`}>
                            <WalletDisplay walletId={wallet.walletId} displayName={wallet.walletDisplayName} />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              建議明細：{wallet.breakdown.map((b) => `${b.denom}券 × ${b.suggested}`).join('、')}（小計消費：{wallet.suggestedSpend}）
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={walletPickerOpen} onClose={() => setWalletPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>選擇尚未有中獎記錄的支付工具</DialogTitle>
        <DialogContent>
          {rowsWithoutRecord.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              所有支付工具本週已有中獎記錄。
            </Typography>
          ) : (
            <Box sx={{ mt: 1, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              {rowsWithoutRecord.map((row) => (
                <Card
                  key={row.walletId}
                  variant="outlined"
                  onClick={() => {
                    setWalletPickerOpen(false);
                    openAddDialog(row.walletId);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <CardContent sx={{ py: '10px !important' }}>
                    <WalletDisplay walletId={row.walletId} displayName={row.walletDisplayName} />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalletPickerOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>新增本週中獎（最多 3 次）</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <Box>
              <Typography variant="caption" color="text.secondary">
                銀行/錢包
              </Typography>
              {targetWallet && (
                <WalletDisplay
                  walletId={targetWallet}
                  displayName={data.rows.find((x) => x.walletId === targetWallet)?.walletDisplayName ?? targetWallet}
                />
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2">最多 3 次獎券選擇</Typography>
              <Typography variant="caption" color="text.secondary">
                已選 {selectedPrizeTimes} / 3（可留空代表未中）
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
              {[0, 1, 2].map((idx) => (
                <Button
                  key={idx}
                  variant="outlined"
                  onClick={() => setSelectedPrizes((prev) => prev.filter((_, i) => i !== idx))}
                  sx={{ minHeight: 52 }}
                >
                  {selectedPrizes[idx] ? `${selectedPrizes[idx]}` : '空格'}
                </Button>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
              {QUICK_PRIZES.map((prize) => (
                <Button
                  key={prize}
                  variant="contained"
                  disabled={selectedPrizes.length >= 3}
                  onClick={() => setSelectedPrizes((prev) => [...prev, prize])}
                >
                  {prize}
                </Button>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !targetWallet || selectedPrizes.length === 0}>
            {saving ? '儲存中…' : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
