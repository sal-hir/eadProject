
package com.swiftdrop.dispatch_service.service;

import com.swiftdrop.dispatch_service.dto.*;
import com.swiftdrop.dispatch_service.entity.Parcel;
import com.swiftdrop.dispatch_service.repository.ParcelRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final ParcelRepository parcelRepository;

    public AnalyticsService(ParcelRepository parcelRepository) {
        this.parcelRepository = parcelRepository;
    }

    // 1. Dashboard overview
    @Transactional(readOnly = true)
    public AnalyticsOverviewDto getOverview() {

        long total = parcelRepository.count();

        long delivered =
                parcelRepository.countByStatusIgnoreCase("DELIVERED");

        long failed =
                parcelRepository.countByStatusIgnoreCase("FAILED");

        long pending = Math.max(0, total - delivered - failed);

        return new AnalyticsOverviewDto(
                total,
                delivered,
                failed,
                pending
        );
    }

    // 2. Recent parcels
    @Transactional(readOnly = true)
    public List<RecentParcelDto> getRecentParcels(int limit) {

        int safeLimit = Math.max(1, Math.min(limit, 100));

        return parcelRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit))
                .stream()
                .map(parcel -> new RecentParcelDto(
                        parcel.getId(),
                        parcel.getSourceParcelId(),
                        parcel.getTrackingNumber(),
                        parcel.getStatus(),
                        parcel.getCourierId(),
                        parcel.getPickupAddress(),
                        parcel.getDropoffAddress(),
                        parcel.getCreatedAt(),
                        parcel.getEstimatedFee()
                ))
                .toList();
    }

    // 3. Parcel status distribution
    @Transactional(readOnly = true)
    public List<StatusAnalyticsDto> getStatusAnalytics() {

        List<Parcel> parcels = parcelRepository.findAll();

        long total = parcels.size();

        if (total == 0) {
            return Collections.emptyList();
        }

        Map<String, Long> statusCounts = parcels.stream()
                .collect(Collectors.groupingBy(
                        parcel -> parcel.getStatus() == null
                                ? "UNKNOWN"
                                : parcel.getStatus().toUpperCase(),
                        Collectors.counting()
                ));

        return statusCounts.entrySet()
                .stream()
                .map(entry -> new StatusAnalyticsDto(
                        entry.getKey(),
                        entry.getValue(),
                        Math.round(
                                (entry.getValue() * 10000.0) / total
                        ) / 100.0
                ))
                .sorted(Comparator.comparingLong(
                        StatusAnalyticsDto::count
                ).reversed())
                .toList();
    }

    // 4. Daily parcel creation statistics (last 7 days)
    @Transactional(readOnly = true)
    public List<DailyParcelAnalyticsDto> getDailyAnalytics() {

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(6);

        List<Parcel> parcels = parcelRepository.findAll();

        Map<LocalDate, Long> dailyCounts = parcels.stream()
                .filter(parcel -> parcel.getCreatedAt() != null)
                .map(parcel -> parcel.getCreatedAt().toLocalDate())
                .filter(date ->
                        !date.isBefore(startDate) &&
                                !date.isAfter(today)
                )
                .collect(Collectors.groupingBy(
                        Function.identity(),
                        Collectors.counting()
                ));

        List<DailyParcelAnalyticsDto> result = new ArrayList<>();

        for (LocalDate date = startDate;
             !date.isAfter(today);
             date = date.plusDays(1)) {

            result.add(new DailyParcelAnalyticsDto(
                    date,
                    dailyCounts.getOrDefault(date, 0L)
            ));
        }

        return result;
    }

    // 5. Popular pickup locations
    @Transactional(readOnly = true)
    public List<LocationAnalyticsDto> getPickupLocations() {
        return getLocationCounts(Parcel::getPickupAddress);
    }

    // 6. Popular drop-off locations
    @Transactional(readOnly = true)
    public List<LocationAnalyticsDto> getDropoffLocations() {
        return getLocationCounts(Parcel::getDropoffAddress);
    }

    private List<LocationAnalyticsDto> getLocationCounts(
            Function<Parcel, String> addressGetter
    ) {

        Map<String, Long> counts = parcelRepository.findAll()
                .stream()
                .map(addressGetter)
                .filter(address ->
                        address != null && !address.isBlank()
                )
                .map(String::trim)
                .collect(Collectors.groupingBy(
                        address -> address,
                        Collectors.counting()
                ));

        return counts.entrySet()
                .stream()
                .map(entry -> new LocationAnalyticsDto(
                        entry.getKey(),
                        entry.getValue()
                ))
                .sorted(Comparator.comparingLong(
                        LocationAnalyticsDto::parcelCount
                ).reversed())
                .limit(10)
                .toList();
    }

    // 7. Estimated delivery fee statistics
    @Transactional(readOnly = true)
    public FeeAnalyticsDto getFeeAnalytics() {

        List<Double> fees = parcelRepository.findAll()
                .stream()
                .map(Parcel::getEstimatedFee)
                .filter(Objects::nonNull)
                .filter(fee -> fee >= 0)
                .toList();

        long count = fees.size();

        double total = fees.stream()
                .mapToDouble(Double::doubleValue)
                .sum();

        double average = count == 0 ? 0 : total / count;

        return new FeeAnalyticsDto(
                count,
                Math.round(total * 100.0) / 100.0,
                Math.round(average * 100.0) / 100.0
        );
    }
}
