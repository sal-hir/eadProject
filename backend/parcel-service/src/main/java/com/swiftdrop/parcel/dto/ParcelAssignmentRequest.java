package com.swiftdrop.parcel.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ParcelAssignmentRequest(
        @NotNull UUID courierId
) {}