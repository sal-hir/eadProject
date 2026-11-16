package com.swiftdrop.admin.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdatePricingRequest(

        @NotNull
        UUID zoneId,

        @NotNull
        @DecimalMin("0.00")
        BigDecimal minWeight,

        @NotNull
        @DecimalMin("0.01")
        BigDecimal maxWeight,

        @NotNull
        @DecimalMin("0.01")
        BigDecimal deliveryFee,

        boolean active

) {}