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
  FormControl,
  InputLabel,
  Fab,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchWallets } from '../api/metaApi';
import {
  createWeekendSession,
  deleteWeekendSession,
  listWeekendSessions,
  updateWeekendSession,
} from '../api/weekendApi';
import type { WalletId, WalletMeta, WeekendSessionRow } from '../api/types';
import { datetimeLocalToIso, isoToDatetimeLocalValue } from '../util/datetime';
import { WalletDisplay } from '../components/WalletDisplay';

const PRIZE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '未填／未中' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: '200', label: '200' },
];
const QUICK_PRIZES = [10, 20, 50, 100, 200];

function parsePrize(v: string): number | null {
  if (!v) return null;
  return Number(v);
}

export function WeekendSessionsPage() {
  const [rows, setRows] = useState<WeekendSessionRow[]>([]);
  const [wallets, setWallets] = useState<WalletMeta[]>([]);
  const [filterWallet, setFilterWallet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [occurredLocal, setOccurredLocal] = useState('');
  const [wallet, setWallet] = useState<WalletId | ''>('');
  const [spendStr, setSpendStr] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [selectedPrizes, setSelectedPrizes] = useState<number[]>([]);

  const load = useCallback(async () => {
    const list = await listWeekendSessions();
    setRows(list);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const w = await fetchWallets();
        setWallets(w);
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : '載入失敗');
      }
    })();
  }, [load]);

  useEffect(() => {
    // 初始化選擇週次：優先使用目前資料中的最大週次（通常是當前週）。
    if (rows.length === 0) return;
    setSelectedWeek((prev) => {
      const weeks = Array.from(new Set(rows.map((r) => r.weekNumber))).sort((a, b) => b - a);
      if (weeks.includes(prev)) return prev;
      return weeks[0];
    });
  }, [rows]);

  function openCreate() {
    setEditingId(null);
    setOccurredLocal(isoToDatetimeLocalValue(new Date().toISOString()));
    setWallet('');
    setSpendStr('');
    setMerchantName('');
    setP1('');
    setP2('');
    setP3('');
    setSelectedPrizes([]);
    setDialogOpen(true);
    setError(null);
  }

  function openCreateForWallet(walletId: WalletId, weekNumber: number) {
    openCreate();
    setWallet(walletId);
    // 讓新增資料時間落在指定週次：若該週無資料，會用既有週次當錨點推算 7 天區間。
    const directMatch = rows.find((r) => r.weekNumber === weekNumber)?.occurredAt;
    if (directMatch) {
      setOccurredLocal(isoToDatetimeLocalValue(directMatch));
      return;
    }
    if (rows.length > 0) {
      const anchor = rows[0];
      const anchorDate = new Date(anchor.occurredAt);
      const offsetWeeks = weekNumber - anchor.weekNumber;
      const estimated = new Date(anchorDate.getTime() + offsetWeeks * 7 * 24 * 60 * 60 * 1000);
      setOccurredLocal(isoToDatetimeLocalValue(estimated.toISOString()));
      return;
    }
    setOccurredLocal(isoToDatetimeLocalValue(new Date().toISOString()));
  }

  async function handleSave() {
    if (!wallet) {
      setError('請選擇錢包');
      return;
    }
    try {
      if (editingId != null) {
        const spendAmount = spendStr.trim() === '' ? null : Number(spendStr);
        const body = {
          occurredAt: datetimeLocalToIso(occurredLocal),
          wallet: wallet as WalletId,
          spendAmount: spendAmount != null && !Number.isNaN(spendAmount) ? spendAmount : null,
          merchantName: merchantName.trim() || null,
          outcomes: [
            { drawIndex: 1, prizeMop: parsePrize(p1) },
            { drawIndex: 2, prizeMop: parsePrize(p2) },
            { drawIndex: 3, prizeMop: parsePrize(p3) },
          ],
        };
        await updateWeekendSession(editingId, body);
      } else {
        if (selectedPrizes.length === 0) {
          setError('請至少選擇 1 張獎券');
          return;
        }
        await createWeekendSession({
          occurredAt: datetimeLocalToIso(occurredLocal),
          wallet: wallet as WalletId,
          spendAmount: null,
          merchantName: null,
          outcomes: [
            { drawIndex: 1, prizeMop: selectedPrizes[0] ?? null },
            { drawIndex: 2, prizeMop: selectedPrizes[1] ?? null },
            { drawIndex: 3, prizeMop: selectedPrizes[2] ?? null },
          ],
        });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '儲存失敗');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('確定刪除此筆紀錄？')) return;
    try {
      await deleteWeekendSession(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '刪除失敗');
    }
  }

  const label = (id: WalletId) => wallets.find((w) => w.id === id)?.displayName ?? id;

  const filtered = filterWallet
    ? rows.filter((r) => r.wallet === filterWallet)
    : rows;
  // 操作週數固定為第 1~10 週，避免受目前資料筆數影響。
  const weekOptions = Array.from({ length: 10 }, (_, i) => i + 1);
  const selectedWeekRows = rows.filter((r) => r.weekNumber === selectedWeek);
  // 指定週次下可新增的錢包：尚未出現在該週紀錄中的錢包。
  const selectableWallets = wallets.filter((w) => !selectedWeekRows.some((r) => r.wallet === w.id));

  return (
    <Box
      sx={{
        // 預留底部安全空間，避免最後一張卡片被懸浮按鈕遮住。
        pb: 'calc(140px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Stack direction="column" spacing={2} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">週末抽券紀錄</Typography>
        <Stack direction="column" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>篩選錢包</InputLabel>
            <Select
              value={filterWallet}
              label="篩選錢包"
              onChange={(e) => setFilterWallet(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              {wallets.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      {error && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'grid', gap: 1 }}>
        {filtered.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">目前沒有符合條件的抽券紀錄。</Typography>
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => {
            const o = [...r.outcomes].sort((a, b) => a.drawIndex - b.drawIndex);
            return (
              <Card
                key={r.id}
                variant="outlined"
                sx={{ cursor: 'default' }}
              >
                <CardContent sx={{ py: '10px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <WalletDisplay walletId={r.wallet} displayName={label(r.wallet)} />
                    <Typography variant="body2" color="text.secondary">
                      第 {r.weekNumber} 週
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {new Date(r.occurredAt).toLocaleString()}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, justifyContent: 'center' }}>
                    {o.map((draw, idx) => {
                      const prize = draw?.prizeMop ?? null;
                      const isEmpty = prize == null;
                      return (
                        <Chip
                          key={`${r.id}-${idx}`}
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
                                  bgcolor: isEmpty ? 'rgba(120,120,120,0.55)' : 'rgba(76,120,220,0.24)',
                                }}
                              >
                                $
                              </Box>
                              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                                {isEmpty ? '—' : prize}
                              </span>
                            </Box>
                          }
                          size="small"
                          sx={{
                            bgcolor: isEmpty ? 'rgba(140,140,140,0.5)' : 'rgba(131,171,255,0.2)',
                            color: isEmpty ? 'rgba(220,220,220,0.8)' : 'inherit',
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
                    })}
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={(e) => {
                        // 阻止卡片點擊事件，避免誤觸開啟編輯。
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                    >
                      刪除
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>

      <Fab
        variant="extended"
        color="primary"
        aria-label="新增中獎"
        onClick={() => setWalletPickerOpen(true)}
        sx={{
          // iOS 風格懸浮按鈕：玻璃感半透明底、柔和陰影、按下回饋。
          position: 'fixed',
          right: 20,
          bottom: 96,
          zIndex: 1300,
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
        }}
      >
        ＋ 新增中獎
      </Fab>

      <Dialog open={walletPickerOpen} onClose={() => setWalletPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>選擇本週可新增的支付工具</DialogTitle>
        <DialogContent>
          <FormControl size="small" fullWidth sx={{ mt: 1, mb: 1.5 }}>
            <InputLabel>操作週數</InputLabel>
            <Select
              value={String(selectedWeek)}
              label="操作週數"
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {weekOptions.map((w) => (
                <MenuItem key={w} value={String(w)}>
                  第 {w} 週
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectableWallets.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              此週所有支付工具都已有抽獎紀錄。
            </Typography>
          ) : (
            <Box sx={{ mt: 1, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              {selectableWallets.map((w) => (
                <Card
                  key={w.id}
                  variant="outlined"
                  onClick={() => {
                    setWalletPickerOpen(false);
                    openCreateForWallet(w.id, selectedWeek);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <CardContent sx={{ py: '10px !important' }}>
                    <WalletDisplay walletId={w.id} displayName={w.displayName} />
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
        <DialogTitle>{editingId != null ? '編輯紀錄' : `新增第 ${selectedWeek} 週中獎（最多 3 次）`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {editingId != null ? (
              <>
                <TextField
                  label="發生時間"
                  type="datetime-local"
                  value={occurredLocal}
                  onChange={(e) => setOccurredLocal(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormControl fullWidth>
                  <InputLabel>錢包</InputLabel>
                  <Select
                    value={wallet}
                    label="錢包"
                    onChange={(e) => setWallet(e.target.value as WalletId)}
                  >
                    {wallets.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.displayName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="金額（可空）"
                  value={spendStr}
                  onChange={(e) => setSpendStr(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="商戶（可空）"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  fullWidth
                />
                <Typography variant="subtitle2">三次抽獎結果</Typography>
                <FormControl fullWidth>
                  <InputLabel>第 1 次</InputLabel>
                  <Select value={p1} label="第 1 次" onChange={(e) => setP1(e.target.value)}>
                    {PRIZE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>第 2 次</InputLabel>
                  <Select value={p2} label="第 2 次" onChange={(e) => setP2(e.target.value)}>
                    {PRIZE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>第 3 次</InputLabel>
                  <Select value={p3} label="第 3 次" onChange={(e) => setP3(e.target.value)}>
                    {PRIZE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    銀行/錢包
                  </Typography>
                  {wallet && <WalletDisplay walletId={wallet as WalletId} displayName={label(wallet as WalletId)} />}
                </Box>
                <Box>
                  <Typography variant="subtitle2">最多 3 次獎券選擇</Typography>
                  <Typography variant="caption" color="text.secondary">
                    已選 {selectedPrizes.length} / 3（可留空代表未中）
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
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={editingId == null && selectedPrizes.length === 0}>
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
