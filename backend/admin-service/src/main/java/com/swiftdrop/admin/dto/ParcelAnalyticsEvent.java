package com.swiftdrop.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record ParcelAnalyticsEvent(
        String eventId,
        String eventType,
        UUID parcelId,
        String currentStatus,
        Instant createdAt,
        Instant deliveredAt
) {
}