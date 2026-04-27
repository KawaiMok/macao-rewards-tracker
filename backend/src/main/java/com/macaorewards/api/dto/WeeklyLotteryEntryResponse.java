package com.macaorewards.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyLotteryEntryResponse(
        Long id,
        LocalDate entryDate,
        BigDecimal spendAmount,
        String merchantName,
        String note
) {
}
