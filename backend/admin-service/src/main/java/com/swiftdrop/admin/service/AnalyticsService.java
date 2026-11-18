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
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private final ParcelAnalyticsRepository repository;

    public DashboardAnalyticsResponse getOverview() {

        long total = repository.count();

        long delivered =
                repository.countByCurrentStatusIgnoreCase("DELIVERED");

        long failed =
                repository.countByCurrentStatusIgnoreCase("FAILED");

        BigDecimal successRate =
                calculatePercentage(delivered, total);

        BigDecimal failureRate =
                calculatePercentage(failed, total);

        return new DashboardAnalyticsResponse(
                total,
                delivered,
                failed,
                successRate,
                failureRate
        );
    }

    public List<DailyDeliveryAnalyticsResponse> getDailyDeliveries(
            LocalDate from,
            LocalDate to) {

        if (from == null || to == null || from.isAfter(to)) {
            throw new IllegalArgumentException(
                    "Invalid date range"
            );
        }

        Instant start = from.atStartOfDay()
                .toInstant(ZoneOffset.UTC);

        Instant end = to.plusDays(1)
                .atStartOfDay()
                .toInstant(ZoneOffset.UTC);

        return repository.getDailyDeliveries(start, end)
                .stream()
                .map(row -> {

                    LocalDate date;

                    if (row[0] instanceof Date sqlDate) {
                        date = sqlDate.toLocalDate();
                    } else if (row[0] instanceof LocalDate localDate) {
                        date = localDate;
                    } else {
                        throw new IllegalStateException(
                                "Unexpected date type: " +
                                        row[0].getClass()
                        );
                    }

                    long count =
                            ((Number) row[1]).longValue();

                    return new DailyDeliveryAnalyticsResponse(
                            date,
                            count
                    );
                })
                .toList();
    }

    public List<DeliveryStatusAnalyticsResponse> getDeliveryStatus() {

        long total = repository.count();

        return repository.getDeliveryStatusCounts()
                .stream()
                .map(row -> {

                    String status = (String) row[0];

                    long count =
                            ((Number) row[1]).longValue();

                    BigDecimal percentage =
                            calculatePercentage(count, total);

                    return new DeliveryStatusAnalyticsResponse(
                            status,
                            count,
                            percentage
                    );
                })
                .toList();
    }

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
                        RoundingMode.HALF_UP
                );
    }
}