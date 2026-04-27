package com.macaorewards.api.dto;

import java.util.List;
import java.util.Map;

public record SummaryResponse(
        int campaignYear,
        int totalSessions,
        int sessionsThisWeek,
        /** 面額 -> 中獎次數（僅統計非 null 之 prizeMop） */
        Map<Integer, Long> prizeCountsByMop,
        /** WalletProvider.name() -> session 筆數 */
        Map<String, Long> sessionCountByWallet,
        /** 週次 × 各錢包筆數（第二階段儀表板用） */
        List<WeekWalletRow> weekWalletMatrix
) {
    public record WeekWalletRow(int weekNumber, Map<String, Long> sessionCountByWallet) {
    }
}
