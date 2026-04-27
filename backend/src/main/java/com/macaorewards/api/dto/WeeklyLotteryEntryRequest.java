package com.macaorewards.api.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyLotteryEntryRequest(
        @NotNull LocalDate entryDate,
        BigDecimal spendAmount,
        String merchantName,
        String note
) {
}
