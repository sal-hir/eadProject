package com.swiftdrop.parcel.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ParcelResponse(
        UUID parcelId,
        UUID customerId,
        UUID merchantId,
        String pickupAddress,
        String dropoffAddress,
        UUID pickupZoneId,
        UUID dropoffZoneId,
        UUID pricingId,
        String trackingNumber,
        String currentStatus,
        Instant createdAt,
        BigDecimal estimatedFee,
        BigDecimal weightKg,
        boolean fragile,
        String deliveryPriority,
        String senderName,
        String senderPhone,
        String receiverName,
        String receiverPhone,
        String parcelDescription
) {}
