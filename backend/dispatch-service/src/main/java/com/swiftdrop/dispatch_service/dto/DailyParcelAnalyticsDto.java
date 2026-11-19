
package com.swiftdrop.dispatch_service.dto;

import java.time.LocalDate;

public record DailyParcelAnalyticsDto(
                LocalDate date,
                long totalParcels) {
}
