package com.swiftdrop.parcel.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ParcelQuoteResponse(
        UUID pricingId,
        UUID pickupZoneId,
        UUID dropoffZoneId,
        String pickupZoneName,
        BigDecimal weightKg,
        BigDecimal estimatedFee
) {}