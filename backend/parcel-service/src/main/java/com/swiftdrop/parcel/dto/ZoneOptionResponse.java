package com.swiftdrop.parcel.dto;

import java.util.UUID;

public record ZoneOptionResponse(
        UUID id,
        String zoneName,
        String description
) {}