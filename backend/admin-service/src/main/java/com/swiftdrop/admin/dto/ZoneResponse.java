package com.swiftdrop.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ZoneResponse(

        UUID id,
        String zoneName,
        String description,
        boolean active,

        Double latitude,
        Double longitude,
        Double radiusKm,

        LocalDateTime createdAt,
        LocalDateTime updatedAt

) {}