package com.swiftdrop.parcel.dto;

import com.swiftdrop.parcel.entity.ParcelStatus;
import jakarta.validation.constraints.NotNull;

public record ParcelStatusUpdateRequest(
        @NotNull ParcelStatus status
) {}