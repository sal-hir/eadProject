
package com.swiftdrop.admin.service;

import com.swiftdrop.admin.dto.*;
import com.swiftdrop.admin.repository.ParcelAnalyticsRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

        private final ParcelAnalyticsRepository repository;

        public AnalyticsService(ParcelAnalyticsRepository repository) {// changed..
                this.repository = repository;
        }

        // 1. Dashboard overview
        public DashboardAnalyticsResponse getOverview() {

                long total = repository.count();

                long successful = repository.countByCurrentStatusIgnoreCase("DELIVERED");

                long failed = repository.countByCurrentStatusIgnoreCase("FAILED");

                BigDecimal successRate = calculatePercentage(successful, total);

                BigDecimal failureRate = calculatePercentage(failed, total);

                return new DashboardAnalyticsResponse(
                                total,
                                successful,
                                failed,
                                successRate,
                                failureRate);
        }

        // 2. Daily deliveries
        public List<DailyDeliveryAnalyticsResponse> getDailyDeliveries(
                        LocalDate from,
                        LocalDate to) {

                if (from == null || to == null || from.isAfter(to)) {
                        throw new IllegalArgumentException(
                                        "Invalid date range");
                }

                Instant start = from.atStartOfDay()
                                .toInstant(ZoneOffset.UTC);

                Instant end = to.plusDays(1)
                                .atStartOfDay()
                                .toInstant(ZoneOffset.UTC);

                return repository.getDailyDeliveries(start, end)
                                .stream()
                                .map(row -> new DailyDeliveryAnalyticsResponse(
                                                ((Date) row[0]).toLocalDate(),
                                                ((Number) row[1]).longValue()))
                                .toList();
        }

        // 3. Delivery status distribution
        public List<DeliveryStatusAnalyticsResponse> getDeliveryStatus() {

                long total = repository.count();

                return repository.getDeliveryStatusCounts()
                                .stream()
                                .map(row -> {

                                        String status = (String) row[0];

                                        long count = ((Number) row[1]).longValue();

                                        BigDecimal percentage = calculatePercentage(count, total);

                                        return new DeliveryStatusAnalyticsResponse(
                                                        status,
                                                        count,
                                                        percentage);
                                })
                                .toList();
        }

        // Percentage calculation
        private BigDecimal calculatePercentage(
                        long value,
                        long total) {

                if (total == 0) {
                        return BigDecimal.ZERO;
                }

                return BigDecimal.valueOf(value)
                                .multiply(BigDecimal.valueOf(100))
                                .divide(
                                                BigDecimal.valueOf(total),
                                                2,
                                                RoundingMode.HALF_UP);
        }
}
