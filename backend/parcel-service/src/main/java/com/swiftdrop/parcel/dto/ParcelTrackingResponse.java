package com.swiftdrop.parcel.dto;

import java.time.Instant;
import java.util.List;

public record ParcelTrackingResponse(
        String trackingNumber,
        String currentStatus,
        Instant createdAt,
        List<ParcelStatusHistoryItem> statusHistory
) {}