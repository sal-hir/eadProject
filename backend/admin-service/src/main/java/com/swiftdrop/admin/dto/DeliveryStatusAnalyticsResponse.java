package com.swiftdrop.admin.dto;

import java.math.BigDecimal;

public record DeliveryStatusAnalyticsResponse(
        String status,
        long count,
        BigDecimal percentage
) {
}