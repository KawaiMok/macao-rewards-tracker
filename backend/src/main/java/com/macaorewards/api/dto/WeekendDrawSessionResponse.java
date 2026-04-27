package com.macaorewards.api.dto;

import com.macaorewards.domain.WalletProvider;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record WeekendDrawSessionResponse(
        Long id,
        Integer weekNumber,
        Instant occurredAt,
        WalletProvider wallet,
        BigDecimal spendAmount,
        String merchantName,
        List<OutcomeRow> outcomes
) {
    public record OutcomeRow(Long id, int drawIndex, Integer prizeMop) {
    }
}
