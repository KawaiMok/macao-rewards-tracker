package com.macaorewards.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 本週中獎總覽（依錢包 × 面額）
 */
public record WeeklyPrizeBoardResponse(
        int campaignYear,
        int weekNumber,
        Instant weekStartInclusive,
        Instant weekEndExclusive,
        List<Integer> prizeDenominations,
        List<WalletPrizeRow> rows
) {
    public record WalletPrizeRow(
            String walletId,
            String walletDisplayName,
            Map<Integer, Long> prizeCountByMop,
            Map<Integer, Long> consumedCouponCountByMop,
            long requiredSpendTotal,
            long consumedSpendTotal,
            long remainingSpendToConsumeAll
    ) {
    }
}
