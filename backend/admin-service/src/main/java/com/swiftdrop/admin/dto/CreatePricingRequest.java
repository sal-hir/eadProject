package com.swiftdrop.admin.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.UUID;

public record CreatePricingRequest(

        @NotNull(message = "Zone ID is required")
        UUID zoneId,

        @NotNull
        @DecimalMin(value = "0.00")
        BigDecimal minWeight,

        @NotNull
        @DecimalMin(value = "0.01")
        BigDecimal maxWeight,

        @NotNull
        @DecimalMin(value = "0.01")
        BigDecimal deliveryFee

) {}