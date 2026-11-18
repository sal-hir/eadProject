package com.swiftdrop.parcel.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record ParcelBookingRequest(

        @NotBlank
        String pickupAddress,

        @NotBlank
        String dropoffAddress,

        @NotBlank
        @Size(max = 100)
        String senderName,

        @NotBlank
        @Pattern(
                regexp = "^0[0-9]{9}$",
                message = "Sender phone number must contain exactly 10 digits and start with 0"
        )
        String senderPhone,

        @NotBlank
        @Size(max = 100)
        String receiverName,

        @NotBlank
        @Pattern(
                regexp = "^0[0-9]{9}$",
                message = "Receiver phone number must contain exactly 10 digits and start with 0"
        )
        String receiverPhone,

        @NotBlank
        @Size(max = 500)
        String parcelDescription,

        @NotNull
        UUID pickupZoneId,

        @NotNull
        UUID dropoffZoneId,

        @NotNull
        @DecimalMin("0.001")
        @Digits(integer = 5, fraction = 3)
        BigDecimal weightKg,

        @NotNull
        Boolean fragile,

        @NotBlank
        @Pattern(regexp = "STANDARD|EXPRESS")
        String deliveryPriority

) {}
