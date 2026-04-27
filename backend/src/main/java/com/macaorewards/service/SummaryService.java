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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SummaryService {
    private static final List<Integer> PRIZE_DENOMINATIONS = List.of(10, 20, 50, 100, 200);
    private static final String AUTO_CONSUME_NOTE_PREFIX = "AUTO_CONSUME_DENOM=";
    private static final Pattern LEGACY_AUTO_CONSUME_PATTERN = Pattern.compile("^前端快速消耗\\s*(\\d+)\\s*券$");

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

            List<WalletConsumptionRecord> walletConsumptions = weekConsumptions.stream()
                    .filter(c -> c.getWallet() == wallet)
                    .toList();
            long consumedSpend = walletConsumptions.stream()
                    .map(c -> c.getAmount().longValue())
                    .reduce(0L, Long::sum);

            // 先處理「點哪張就消耗哪張」的明確消耗紀錄。
            Map<Integer, Long> explicitConsumed = new LinkedHashMap<>();
            for (Integer denom : PRIZE_DENOMINATIONS) {
                explicitConsumed.put(denom, 0L);
            }
            for (WalletConsumptionRecord c : walletConsumptions) {
                Integer explicitDenom = parseExplicitConsumedDenom(c.getNote());
                if (explicitDenom == null || !explicitConsumed.containsKey(explicitDenom)) {
                    continue;
                }
                explicitConsumed.put(explicitDenom, explicitConsumed.get(explicitDenom) + 1);
            }
            for (Integer denom : PRIZE_DENOMINATIONS) {
                long won = counts.getOrDefault(denom, 0L);
                long explicit = explicitConsumed.getOrDefault(denom, 0L);
                consumedCoupons.put(denom, Math.min(won, explicit));
            }

            // 剩餘未標記消費，再依原規則（小面額優先）推算。
            long explicitSpendUsed = PRIZE_DENOMINATIONS.stream()
                    .mapToLong(denom -> consumedCoupons.getOrDefault(denom, 0L) * denom * 3L)
                    .sum();
            long spendBudget = Math.max(0L, consumedSpend - explicitSpendUsed);
            for (Integer denom : PRIZE_DENOMINATIONS) {
                long won = counts.getOrDefault(denom, 0L);
                long alreadyConsumed = consumedCoupons.getOrDefault(denom, 0L);
                long remainingCoupons = Math.max(0L, won - alreadyConsumed);
                long spendPerCoupon = denom * 3L;
                long affordable = spendPerCoupon > 0 ? spendBudget / spendPerCoupon : 0L;
                long inferredConsumed = Math.min(remainingCoupons, affordable);
                consumedCoupons.put(denom, alreadyConsumed + inferredConsumed);
                spendBudget -= inferredConsumed * spendPerCoupon;
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

    private Integer parseExplicitConsumedDenom(String note) {
        if (note == null) {
            return null;
        }
        if (note.startsWith(AUTO_CONSUME_NOTE_PREFIX)) {
            String raw = note.substring(AUTO_CONSUME_NOTE_PREFIX.length()).trim();
            try {
                return Integer.parseInt(raw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        Matcher legacy = LEGACY_AUTO_CONSUME_PATTERN.matcher(note.trim());
        if (!legacy.matches()) return null;
        try {
            return Integer.parseInt(legacy.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
