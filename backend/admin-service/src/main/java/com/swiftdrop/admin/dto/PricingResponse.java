package com.swiftdrop.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PricingResponse(

        UUID id,
        UUID zoneId,
        String zoneName,
        BigDecimal minWeight,
        BigDecimal maxWeight,
        BigDecimal deliveryFee,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt

) {}
