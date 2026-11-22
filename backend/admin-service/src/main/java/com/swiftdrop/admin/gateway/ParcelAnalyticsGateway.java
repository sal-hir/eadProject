
package com.swiftdrop.admin.gateway;

import java.time.LocalDate;
import java.util.Map;

public interface ParcelAnalyticsGateway {

    long getTotalDeliveries();

    long getSuccessfulDeliveries();

    long getFailedDeliveries();

    long getDeliveriesByDate(LocalDate date);

    Map<String, Long> getDeliveriesByStatus();
}
