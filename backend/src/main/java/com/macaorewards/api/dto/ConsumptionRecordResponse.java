package com.macaorewards.api.dto;

import com.macaorewards.domain.WalletProvider;

import java.math.BigDecimal;
import java.time.Instant;

public record ConsumptionRecordResponse(
        Long id,
        WalletProvider wallet,
        Instant occurredAt,
        BigDecimal amount,
        String note
) {
}
