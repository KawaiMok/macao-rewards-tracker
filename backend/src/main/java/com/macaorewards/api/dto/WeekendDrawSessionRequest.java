package com.macaorewards.api.dto;

import com.macaorewards.domain.WalletProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record WeekendDrawSessionRequest(
        @NotNull Instant occurredAt,
        @NotNull WalletProvider wallet,
        BigDecimal spendAmount,
        String merchantName,
        @NotNull @Valid @Size(min = 3, max = 3) List<OutcomeInput> outcomes
) {
}
