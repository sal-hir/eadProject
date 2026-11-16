package com.swiftdrop.admin.dto;

import java.time.LocalDate;

public record DailyDeliveryAnalyticsResponse(
        LocalDate date,
        long deliveries
) {
}