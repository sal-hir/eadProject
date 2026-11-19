package com.swiftdrop.dispatch_service.dto;

public record AnalyticsOverviewDto(
                long totalParcels,
                long deliveredParcels,
                long failedParcels,
                long pendingParcels) {
}