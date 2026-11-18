package com.swiftdrop.courier.dto;

import java.time.Instant;

public record InfoResponse(
        String service,
        String description,
        String version,
        String apiVersion,
        String status,
        Instant timestamp) {
}
