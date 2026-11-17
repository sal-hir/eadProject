
package com.swiftdrop.admin.gateway;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

@Component
public class MockParcelAnalyticsGateway implements ParcelAnalyticsGateway {

    @Override
    public long getTotalDeliveries() {
        return 1200;
    }

    @Override
    public long getSuccessfulDeliveries() {
        return 850;
    }

    @Override
    public long getFailedDeliveries() {
        return 50;
    }

    @Override
    public long getDeliveriesByDate(LocalDate date) {
        // Temporary sample data for daily analytics
        return 15;
    }

    @Override
    public Map<String, Long> getDeliveriesByStatus() {
        return Map.of(
                "DELIVERED", 850L,
                "FAILED", 50L,
                "IN_TRANSIT", 200L,
                "PENDING", 100L
        );
    }
}
