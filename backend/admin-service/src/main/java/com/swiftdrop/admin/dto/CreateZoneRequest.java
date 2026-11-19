package com.swiftdrop.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CreateZoneRequest(

        @NotBlank(message = "Zone name is required")
        @Size(max = 100, message = "Zone name is too long")
        String zoneName,

        @Size(max = 500)
        String description,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0")
        @DecimalMax(value = "90.0")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0")
        @DecimalMax(value = "180.0")
        Double longitude,

        @NotNull(message = "Coverage radius is required")
        @DecimalMin(value = "0.1")
        @DecimalMax(value = "500.0")
        Double radiusKm

) {}