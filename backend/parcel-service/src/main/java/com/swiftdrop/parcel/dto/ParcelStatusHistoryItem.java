package com.swiftdrop.parcel.dto;

import java.time.Instant;

public record ParcelStatusHistoryItem(
        String status,
        Instant changedAt
) {}