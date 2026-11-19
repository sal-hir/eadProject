package com.swiftdrop.parcel.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;
import java.util.UUID;

public record ParcelBookingRequest(

        @NotBlank
        String pickupAddress,

        @NotBlank
        String dropoffAddress,

        @NotNull
        UUID pickupZoneId,

        @NotNull
        UUID dropoffZoneId,

        @NotNull
        @DecimalMin("0.001")
        @Digits(integer = 5, fraction = 3)
        BigDecimal weightKg

) {}