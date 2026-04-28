package com.macaorewards.api.dto;

import com.macaorewards.domain.WalletProvider;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UndoExplicitConsumeRequest(
        @NotNull WalletProvider wallet,
        @NotNull @Positive Integer denom
) {
}

