package com.swiftdrop.admin.repository;

import com.swiftdrop.admin.entity.PricingRate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface PricingRateRepository
        extends JpaRepository<PricingRate, UUID> {

    List<PricingRate> findByZoneId(UUID zoneId);

    boolean existsByZone_IdAndMinWeightLessThanAndMaxWeightGreaterThan(
            UUID zoneId,
            BigDecimal maxWeight,
            BigDecimal minWeight
    );

    boolean existsByZone_IdAndMinWeightLessThanAndMaxWeightGreaterThanAndIdNot(
            UUID zoneId,
            BigDecimal maxWeight,
            BigDecimal minWeight,
            UUID excludeId
    );

}