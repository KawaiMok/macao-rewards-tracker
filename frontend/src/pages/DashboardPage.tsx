import {
  Button,
  Box,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ApiError } from '../api/client';
import { useDisplayMode } from '../context/DisplayModeContext';
import { fetchSummary } from '../api/summaryApi';
import { fetchWallets } from '../api/metaApi';
import { listWeekendSessions } from '../api/weekendApi';
import type { SummaryResponse, WalletMeta, WeekendSessionRow } from '../api/types';
import { WalletDisplay } from '../components/WalletDisplay';

type AnalysisViewMode = 'table' | 'pie';
type PieDatum = { label: string; value: number; color: string };

const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#00838f', '#455a64', '#6d4c41'];

function PieChartPanel({ title, data }: { title: string; data: PieDatum[] }) {
  const size = 220;
  const radius = 82;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = -Math.PI / 2;

  const paths = data.map((item) => {
    const ratio = total === 0 ? 0 : item.value / total;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { ...item, d };
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {total === 0 ? (
        <Typography color="text.secondary">暫無可分析資料。</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title} style={{ maxWidth: '100%', height: 'auto' }}>
            {paths.map((p) => (
              <path key={p.label} d={p.d} fill={p.color} stroke="#fff" strokeWidth={1} />
            ))}
          </svg>
          <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {data.map((item) => {
              const percentage = total === 0 ? 0 : (item.value / total) * 100;
              return (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.value}（{percentage.toFixed(1)}%）
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const { mode } = useDisplayMode();
  const isSmallViewport = useMediaQuery(theme.breakpoints.down('sm'));
  // 手機模式由 Toolbar 開關控制；桌面模式仍保留小螢幕自動適配。
  const isMobile = mode === 'mobile' || isSmallViewport;
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [wallets, setWallets] = useState<WalletMeta[]>([]);
  const [sessions, setSessions] = useState<WeekendSessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // 暫時保留「週次 × 錢包筆數」需求，之後恢復時再打開：
  // const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  // const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisView, setAnalysisView] = useState<AnalysisViewMode>('table');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, w, allSessions] = await Promise.all([
          fetchSummary(),
          fetchWallets(),
          listWeekendSessions(),
        ]);
        if (!cancelled) {
          setSummary(s);
          setWallets(w);
          setSessions(allSessions);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : '載入失敗');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!summary) {
    return <Typography>載入中…</Typography>;
  }

  const walletLabel = (id: string) => wallets.find((w) => w.id === id)?.displayName ?? id;
  const denominations = Object.keys(summary.prizeCountsByMop)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const effectiveDenominations = denominations.length > 0 ? denominations : [10, 20, 50, 100, 200];

  // 暫時保留「週次 × 錢包筆數」需求，之後恢復時再打開：
  // const weekDetails = selectedWeek == null
  //   ? []
  //   : sessions
  //       .filter((s) => s.weekNumber === selectedWeek)
  //       .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  //
  // function renderPrize(session: WeekendSessionRow, drawIndex: number) {
  //   const row = session.outcomes.find((o) => o.drawIndex === drawIndex);
  //   return row?.prizeMop ?? '—';
  // }

  // 將中獎結果整理成「週次 × 面額金額」統計（單位 MOP），供分析圖直接使用。
  const weekDenominationMatrix = sessions.reduce<Record<number, Record<number, number>>>((acc, session) => {
    if (!acc[session.weekNumber]) {
      acc[session.weekNumber] = {};
    }
    for (const outcome of session.outcomes) {
      if (outcome.prizeMop == null) continue;
      acc[session.weekNumber][outcome.prizeMop] =
        (acc[session.weekNumber][outcome.prizeMop] ?? 0) + outcome.prizeMop;
    }
    return acc;
  }, {});

  // 將中獎結果整理成「支付工具 × 面額金額」統計（單位 MOP），供分析圖直接使用。
  const walletDenominationMatrix = sessions.reduce<Record<string, Record<number, number>>>((acc, session) => {
    if (!acc[session.wallet]) {
      acc[session.wallet] = {};
    }
    for (const outcome of session.outcomes) {
      if (outcome.prizeMop == null) continue;
      acc[session.wallet][outcome.prizeMop] = (acc[session.wallet][outcome.prizeMop] ?? 0) + outcome.prizeMop;
    }
    return acc;
  }, {});

  const weekNumbers = Object.keys(weekDenominationMatrix)
    .map((x) => Number(x))
    .sort((a, b) => a - b);
  const maxWeekCell = Math.max(
    1,
    ...weekNumbers.flatMap((week) => effectiveDenominations.map((m) => weekDenominationMatrix[week]?.[m] ?? 0)),
  );
  const maxWalletCell = Math.max(
    1,
    ...wallets.flatMap((w) => effectiveDenominations.map((m) => walletDenominationMatrix[w.id]?.[m] ?? 0)),
  );
  const weekPieData: PieDatum[] = weekNumbers.map((week, idx) => ({
    label: `第 ${week} 週`,
    value: effectiveDenominations.reduce((sum, m) => sum + (weekDenominationMatrix[week]?.[m] ?? 0), 0),
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));
  const walletPieData: PieDatum[] = wallets.map((w, idx) => ({
    label: walletLabel(w.id),
    value: effectiveDenominations.reduce((sum, m) => sum + (walletDenominationMatrix[w.id]?.[m] ?? 0), 0),
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));
  // 暫時保留「週次 × 錢包筆數」需求，之後恢復時再打開：
  // const activeWeekWalletRows = summary.weekWalletMatrix.filter((row) =>
  //   wallets.some((w) => (row.sessionCountByWallet[w.id] ?? 0) > 0),
  // );
  const weekTotalRows = weekNumbers.map((week) => ({
    week,
    total: effectiveDenominations.reduce((sum, m) => sum + (weekDenominationMatrix[week]?.[m] ?? 0), 0),
  }));
  const walletTotalRows = wallets.map((w) => ({
    walletId: w.id,
    label: walletLabel(w.id),
    total: effectiveDenominations.reduce((sum, m) => sum + (walletDenominationMatrix[w.id]?.[m] ?? 0), 0),
  }));

  function heatCellColor(value: number, maxValue: number) {
    if (value <= 0) return 'transparent';
    const alpha = 0.15 + (value / maxValue) * 0.45;
    return `rgba(25, 118, 210, ${alpha.toFixed(3)})`;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          總覽
        </Typography>
        <Typography color="text.secondary" variant="body2" gutterBottom>
          活動年度 {summary.campaignYear} · 週末抽券紀錄 {summary.totalSessions} 筆 · 本活動週內已登記{' '}
          {summary.sessionsThisWeek} 筆
        </Typography>
      </Box>
      <Box>
        <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
          <Typography variant="h6">分析視圖</Typography>
          <Button
            size="small"
            variant={analysisView === 'table' ? 'contained' : 'outlined'}
            onClick={() => setAnalysisView('table')}
            sx={{ width: { xs: '100%', sm: 180 }, alignSelf: 'center' }}
          >
            表格
          </Button>
          <Button
            size="small"
            variant={analysisView === 'pie' ? 'contained' : 'outlined'}
            onClick={() => setAnalysisView('pie')}
            sx={{ width: { xs: '100%', sm: 180 }, alignSelf: 'center' }}
          >
            PIE CHART
          </Button>
        </Box>
        {analysisView === 'table' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                週次 × 抽券面額總數分析圖
              </Typography>
              {isMobile ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {weekTotalRows.length === 0 ? (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">暫無可分析資料。</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    weekTotalRows.map((row) => (
                      <Card key={row.week} variant="outlined">
                        <CardContent sx={{ py: '10px !important' }}>
                          <Typography variant="subtitle2">第 {row.week} 週</Typography>
                          <Typography variant="h6" color="primary.main">
                            {row.total} MOP
                          </Typography>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>週次</TableCell>
                        {effectiveDenominations.map((m) => (
                          <TableCell key={m} align="center">
                            {m} MOP
                          </TableCell>
                        ))}
                        <TableCell align="right">總計</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weekNumbers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={effectiveDenominations.length + 2}>
                            <Typography color="text.secondary">暫無可分析資料。</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        weekNumbers.map((week) => {
                          const total = effectiveDenominations.reduce(
                            (sum, m) => sum + (weekDenominationMatrix[week]?.[m] ?? 0),
                            0,
                          );
                          return (
                            <TableRow key={week}>
                              <TableCell>第 {week} 週</TableCell>
                              {effectiveDenominations.map((m) => {
                                const value = weekDenominationMatrix[week]?.[m] ?? 0;
                                return (
                                  <TableCell key={m} align="center" sx={{ bgcolor: heatCellColor(value, maxWeekCell) }}>
                                    {value}
                                  </TableCell>
                                );
                              })}
                              <TableCell align="right">{total}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                支付工具 × 抽券面額總數分析圖
              </Typography>
              {isMobile ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {walletTotalRows.map((row) => (
                    <Card key={row.walletId} variant="outlined">
                      <CardContent sx={{ py: '10px !important' }}>
                        <WalletDisplay walletId={row.walletId} displayName={row.label} />
                        <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
                          {row.total} MOP
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>支付工具</TableCell>
                        {effectiveDenominations.map((m) => (
                          <TableCell key={m} align="center">
                            {m} MOP
                          </TableCell>
                        ))}
                        <TableCell align="right">總計</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {wallets.map((w) => {
                        const total = effectiveDenominations.reduce(
                          (sum, m) => sum + (walletDenominationMatrix[w.id]?.[m] ?? 0),
                          0,
                        );
                        return (
                          <TableRow key={w.id}>
                            <TableCell>
                              <WalletDisplay walletId={w.id} displayName={walletLabel(w.id)} />
                            </TableCell>
                            {effectiveDenominations.map((m) => {
                              const value = walletDenominationMatrix[w.id]?.[m] ?? 0;
                              return (
                                <TableCell key={m} align="center" sx={{ bgcolor: heatCellColor(value, maxWalletCell) }}>
                                  {value}
                                </TableCell>
                              );
                            })}
                            <TableCell align="right">{total}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* PIE CHART 模式下以「獎券總額（MOP）」作為切片值，便於快速看出占比。 */}
            <PieChartPanel title="週次 × 抽券面額總數（PIE CHART）" data={weekPieData} />
            <PieChartPanel title="支付工具 × 抽券面額總數（PIE CHART）" data={walletPieData} />
          </Box>
        )}
      </Box>
      {/* 暫時註解「週次 × 錢包筆數」與明細對話框，留待後續再開啟。
      <Box>
        <Typography variant="h6" gutterBottom>
          週次 × 錢包筆數
        </Typography>
        {isMobile ? (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {activeWeekWalletRows.map((row) => (
              <Card key={row.weekNumber} variant="outlined">
                <CardContent>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setSelectedWeek(row.weekNumber);
                      setDialogOpen(true);
                    }}
                  >
                    第 {row.weekNumber} 週
                  </Button>
                  <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                    {wallets.map((w) => (
                      <Box key={w.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <WalletDisplay walletId={w.id} displayName={walletLabel(w.id)} logoSize={20} />
                        <Typography variant="body2">{row.sessionCountByWallet[w.id] ?? 0}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>週</TableCell>
                  {wallets.map((w) => (
                    <TableCell key={w.id} align="center" sx={{ width: 56 }}>
                      <WalletDisplay
                        walletId={w.id}
                        displayName={walletLabel(w.id)}
                        logoSize={22}
                        textVariant="subtitle2"
                        showText={false}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeWeekWalletRows.map((row) => (
                  <TableRow key={row.weekNumber}>
                    <TableCell>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          setSelectedWeek(row.weekNumber);
                          setDialogOpen(true);
                        }}
                      >
                        第 {row.weekNumber} 週
                      </Button>
                    </TableCell>
                    {wallets.map((w) => (
                      <TableCell key={w.id} align="right">
                        {row.sessionCountByWallet[w.id] ?? 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>第 {selectedWeek ?? '-'} 週抽獎詳細記錄</DialogTitle>
        <DialogContent>
          {weekDetails.length === 0 ? (
            <Typography color="text.secondary">此週暫無記錄。</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>時間</TableCell>
                  <TableCell>銀行/錢包</TableCell>
                  <TableCell align="right">第1次</TableCell>
                  <TableCell align="right">第2次</TableCell>
                  <TableCell align="right">第3次</TableCell>
                  <TableCell align="right">金額</TableCell>
                  <TableCell>商戶</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {weekDetails.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.occurredAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <WalletDisplay walletId={s.wallet as WalletId} displayName={walletLabel(s.wallet as WalletId)} />
                    </TableCell>
                    <TableCell align="right">{renderPrize(s, 1)}</TableCell>
                    <TableCell align="right">{renderPrize(s, 2)}</TableCell>
                    <TableCell align="right">{renderPrize(s, 3)}</TableCell>
                    <TableCell align="right">{s.spendAmount ?? '—'}</TableCell>
                    <TableCell>{s.merchantName ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
      */}
    </Box>
  );
}
