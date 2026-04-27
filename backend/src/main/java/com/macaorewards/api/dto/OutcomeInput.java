package com.macaorewards.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OutcomeInput(
        @NotNull @Min(1) @Max(3) Integer drawIndex,
        /** 10/20/50/100/200 或 null */
        Integer prizeMop
) {
}
