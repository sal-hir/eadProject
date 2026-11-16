package com.swiftdrop.admin.dto;

import java.math.BigDecimal;

public record DashboardAnalyticsResponse(
        long totalDeliveries,
        long successfulDeliveries,
        long failedDeliveries,
        BigDecimal successRate,
        BigDecimal failureRate
) {
}