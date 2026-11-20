
package com.swiftdrop.dispatch_service.dto;

import java.time.LocalDateTime;

public record RecentParcelDto(
                Long id,
                String sourceParcelId,
                String trackingNumber,
                String status,
                String courierId,
                String pickupAddress,
                String dropoffAddress,
                LocalDateTime createdAt,
                Double estimatedFee) {
}
