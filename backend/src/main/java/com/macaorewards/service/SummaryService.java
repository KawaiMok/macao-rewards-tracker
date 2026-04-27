package com.macaorewards.service;

import com.macaorewards.api.dto.SummaryResponse;
import com.macaorewards.api.dto.WeeklyPrizeBoardResponse;
import com.macaorewards.domain.WalletProvider;
import com.macaorewards.domain.WeekendDrawOutcome;
import com.macaorewards.domain.WeekendDrawSession;
import com.macaorewards.domain.WalletConsumptionRecord;
import com.macaorewards.repo.WeekendDrawSessionRepository;
import com.macaorewards.repo.WalletConsumptionRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class SummaryService {
    private static final List<Integer> PRIZE_DENOMINATIONS = List.of(10, 20, 50, 100, 200);

    private final WeekendDrawSessionRepository sessions;
    private final WalletConsumptionRecordRepository consumptions;
    private final CampaignWeekService weeks;

    public SummaryService(
            WeekendDrawSessionRepository sessions,
            WalletConsumptionRecordRepository consumptions,
            CampaignWeekService weeks
    ) {
        this.sessions = sessions;
        this.consumptions = consumptions;
        this.weeks = weeks;
    }

    @Transactional(readOnly = true)
    public SummaryResponse summarize(Long userId, Integer campaignYear) {
        List<WeekendDrawSession> list = sessions.findAllByUserIdWithOutcomes(userId);
        int year = weeks.getCampaign().getYear();
        if (campaignYear != null && !campaignYear.equals(year)) {
            // 試行版僅單一年度；其他年度回傳空統計
            list = List.of();
        }

        int totalSessions = list.size();
        Instant[] bounds = weeks.currentCampaignWeekBounds();
        long sessionsThisWeek = list.stream()
                .filter(s -> !s.getOccurredAt().isBefore(bounds[0]) && s.getOccurredAt().isBefore(bounds[1]))
                .count();

        Map<Integer, Long> prizeCounts = new HashMap<>();
        for (WeekendDrawSession s : list) {
            for (WeekendDrawOutcome o : s.getOutcomes()) {
                if (o.getPrizeMop() != null) {
                    prizeCounts.merge(o.getPrizeMop(), 1L, Long::sum);
                }
            }
        }

        Map<String, Long> byWallet = new HashMap<>();
        for (WalletProvider w : WalletProvider.values()) {
            byWallet.put(w.name(), 0L);
        }
        for (WeekendDrawSession s : list) {
            byWallet.merge(s.getWallet().name(), 1L, Long::sum);
        }

        int maxWeek = weeks.getCampaign().getWeeksTotal();
        List<SummaryResponse.WeekWalletRow> matrix = new ArrayList<>();
        for (int wn = 1; wn <= maxWeek; wn++) {
            Map<String, Long> counts = new HashMap<>();
            for (WalletProvider w : WalletProvider.values()) {
                counts.put(w.name(), 0L);
            }
            int weekNum = wn;
            for (WeekendDrawSession s : list) {
                if (s.getWeekNumber() == weekNum) {
                    counts.merge(s.getWallet().name(), 1L, Long::sum);
                }
            }
            matrix.add(new SummaryResponse.WeekWalletRow(weekNum, Map.copyOf(counts)));
        }

        return new SummaryResponse(
                year,
                totalSessions,
                (int) sessionsThisWeek,
                Map.copyOf(prizeCounts),
                Map.copyOf(byWallet),
                matrix
        );
    }

    @Transactional(readOnly = true)
    public WeeklyPrizeBoardResponse weeklyPrizeBoard(Long userId, Integer campaignYear) {
        int year = weeks.getCampaign().getYear();
        Instant[] bounds = weeks.currentCampaignWeekBounds();
        int weekNumber = weeks.weekNumberFor(bounds[0]);

        List<WeekendDrawSession> list = sessions.findAllByUserIdWithOutcomes(userId).stream()
                .filter(s -> !s.getOccurredAt().isBefore(bounds[0]) && s.getOccurredAt().isBefore(bounds[1]))
                .toList();
        List<WalletConsumptionRecord> weekConsumptions = consumptions
                .findByUserIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(userId, bounds[0], bounds[1]);

        if (campaignYear != null && !campaignYear.equals(year)) {
            list = List.of();
            weekConsumptions = List.of();
        }

        List<WeeklyPrizeBoardResponse.WalletPrizeRow> rows = new ArrayList<>();
        for (WalletProvider wallet : WalletProvider.values()) {
            Map<Integer, Long> counts = new LinkedHashMap<>();
            Map<Integer, Long> consumedCoupons = new LinkedHashMap<>();
            for (Integer denom : PRIZE_DENOMINATIONS) {
                counts.put(denom, 0L);
                consumedCoupons.put(denom, 0L);
            }

            for (WeekendDrawSession s : list) {
                if (s.getWallet() != wallet) {
                    continue;
                }
                for (WeekendDrawOutcome o : s.getOutcomes()) {
                    Integer prize = o.getPrizeMop();
                    if (prize != null && counts.containsKey(prize)) {
                        counts.merge(prize, 1L, Long::sum);
                    }
                }
            }

            long consumedSpend = weekConsumptions.stream()
                    .filter(c -> c.getWallet() == wallet)
                    .map(c -> c.getAmount().longValue())
                    .reduce(0L, Long::sum);

            // 註解：依面額由小至大估算可消耗券數，讓使用者知道各面額已消耗多少。
            long spendBudget = consumedSpend;
            for (Integer denom : PRIZE_DENOMINATIONS) {
                long won = counts.getOrDefault(denom, 0L);
                long spendPerCoupon = denom * 3L;
                long affordable = spendPerCoupon > 0 ? spendBudget / spendPerCoupon : 0L;
                long consumed = Math.min(won, affordable);
                consumedCoupons.put(denom, consumed);
                spendBudget -= consumed * spendPerCoupon;
            }

            // 註解：需消費總額改為「尚未消耗券」的動態重算值。
            long dynamicRequiredSpend = 0L;
            for (Integer denom : PRIZE_DENOMINATIONS) {
                long won = counts.getOrDefault(denom, 0L);
                long consumed = consumedCoupons.getOrDefault(denom, 0L);
                long remainingCoupons = Math.max(0L, won - consumed);
                dynamicRequiredSpend += remainingCoupons * denom * 3L;
            }

            rows.add(new WeeklyPrizeBoardResponse.WalletPrizeRow(
                    wallet.name(),
                    wallet.getDisplayName(),
                    Map.copyOf(counts),
                    Map.copyOf(consumedCoupons),
                    dynamicRequiredSpend,
                    consumedSpend,
                    dynamicRequiredSpend
            ));
        }

        return new WeeklyPrizeBoardResponse(
                year,
                weekNumber,
                bounds[0],
                bounds[1],
                PRIZE_DENOMINATIONS,
                rows
        );
    }
}
