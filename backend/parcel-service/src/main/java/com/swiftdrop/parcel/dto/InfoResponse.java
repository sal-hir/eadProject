package com.swiftdrop.parcel.dto;

import java.time.Instant;

public record InfoResponse(
        String applicationName,
        String description,
        String version,
        String apiVersion,
        String status,
        Instant timestamp) {}
