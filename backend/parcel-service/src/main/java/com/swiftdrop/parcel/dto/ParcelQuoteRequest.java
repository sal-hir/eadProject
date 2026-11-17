package com.swiftdrop.parcel.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ParcelQuoteRequest(

        @NotNull
        UUID pickupZoneId,

        @NotNull
        UUID dropoffZoneId,

        @NotNull
        @DecimalMin("0.001")
        BigDecimal weightKg

) {}