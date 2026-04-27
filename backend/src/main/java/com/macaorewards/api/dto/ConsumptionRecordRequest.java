package com.macaorewards.api.dto;

import com.macaorewards.domain.WalletProvider;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

public record ConsumptionRecordRequest(
        @NotNull WalletProvider wallet,
        @NotNull Instant occurredAt,
        @NotNull @DecimalMin(value = "0.01", message = "消費金額必須大於 0") BigDecimal amount,
        String note
) {
}
