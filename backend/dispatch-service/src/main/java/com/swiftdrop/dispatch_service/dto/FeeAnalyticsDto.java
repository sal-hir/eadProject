
package com.swiftdrop.dispatch_service.dto;

public record FeeAnalyticsDto(
                long parcelsWithFee,
                double totalEstimatedFees,
                double averageEstimatedFee) {
}
