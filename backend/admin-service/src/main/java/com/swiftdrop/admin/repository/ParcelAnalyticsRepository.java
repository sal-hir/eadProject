package com.swiftdrop.admin.repository;




import com.swiftdrop.admin.entity.ParcelAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ParcelAnalyticsRepository
        extends JpaRepository<ParcelAnalytics, UUID> {

    long countByCurrentStatusIgnoreCase(String status);

    @Query(value = """
        SELECT current_status AS status,
               COUNT(*) AS total
        FROM parcel_analytics
        GROUP BY current_status
        ORDER BY current_status
        """, nativeQuery = true)
    List<Object[]> getDeliveryStatusCounts();

    @Query(value = """
        SELECT CAST(delivered_at AT TIME ZONE 'UTC' AS DATE),
               COUNT(*)
        FROM parcel_analytics
        WHERE delivered_at >= :fromDate
          AND delivered_at < :toDate
        GROUP BY CAST(delivered_at AT TIME ZONE 'UTC' AS DATE)
        ORDER BY CAST(delivered_at AT TIME ZONE 'UTC' AS DATE)
        """, nativeQuery = true)
    List<Object[]> getDailyDeliveries(
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate
    );
}
