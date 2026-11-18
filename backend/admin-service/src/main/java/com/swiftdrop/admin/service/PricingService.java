
package com.swiftdrop.admin.service;

import com.swiftdrop.admin.dto.*;
import com.swiftdrop.admin.entity.PricingRate;
import com.swiftdrop.admin.entity.Zone;
import com.swiftdrop.admin.messaging.PricingEventPublisher;
import com.swiftdrop.admin.repository.PricingRateRepository;
import com.swiftdrop.admin.repository.ZoneRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PricingService {

    private final PricingRateRepository pricingRepository;
    private final ZoneRepository zoneRepository;
    private final PricingEventPublisher pricingEventPublisher;

    public PricingService(
            PricingRateRepository pricingRepository,
            ZoneRepository zoneRepository,
            PricingEventPublisher pricingEventPublisher
    ) {
        this.pricingRepository = pricingRepository;
        this.zoneRepository = zoneRepository;
        this.pricingEventPublisher = pricingEventPublisher;
    }

    // =========================================
    // CREATE PRICING
    // =========================================

    public PricingResponse create(CreatePricingRequest request) {

        validateWeights(request.minWeight(), request.maxWeight());

        Zone zone = findZone(request.zoneId());

        PricingRate rate = new PricingRate();

        rate.setZone(zone);
        rate.setMinWeight(request.minWeight());
        rate.setMaxWeight(request.maxWeight());
        rate.setDeliveryFee(request.deliveryFee());

        PricingRate savedRate = pricingRepository.save(rate);

        publishAfterCommit("CREATED", savedRate);

        return toResponse(savedRate);
    }

    // =========================================
    // GET ALL PRICING
    // =========================================

    @Transactional(readOnly = true)
    public List<PricingResponse> getAll() {

        return pricingRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================
    // GET PRICING BY ID
    // =========================================

    @Transactional(readOnly = true)
    public PricingResponse getById(UUID id) {

        return toResponse(findPricing(id));
    }

    // =========================================
    // UPDATE PRICING
    // =========================================

    public PricingResponse update(
            UUID id,
            UpdatePricingRequest request
    ) {

        validateWeights(request.minWeight(), request.maxWeight());

        PricingRate rate = findPricing(id);

        Zone zone = findZone(request.zoneId());

        rate.setZone(zone);
        rate.setMinWeight(request.minWeight());
        rate.setMaxWeight(request.maxWeight());
        rate.setDeliveryFee(request.deliveryFee());
        rate.setActive(request.active());

        PricingRate updatedRate = pricingRepository.save(rate);

        publishAfterCommit("UPDATED", updatedRate);

        return toResponse(updatedRate);
    }

    // =========================================
    // DELETE PRICING
    // =========================================

    public void delete(UUID id) {

        PricingRate rate = findPricing(id);

        // Publish the event only after the database
        // transaction successfully commits.
        publishAfterCommit("DELETED", rate);

        pricingRepository.delete(rate);
    }

    // =========================================
    // PUBLISH EVENT AFTER DATABASE COMMIT
    // =========================================

    private void publishAfterCommit(
            String eventType,
            PricingRate rate
    ) {

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {

                        pricingEventPublisher.publishPricing(
                                eventType,
                                rate
                        );
                    }
                }
        );
    }

    // =========================================
    // VALIDATE WEIGHT
    // =========================================

    private void validateWeights(
            BigDecimal min,
            BigDecimal max
    ) {

        if (min == null || max == null || min.compareTo(max) >= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum weight must be greater than minimum weight"
            );
        }
    }

    // =========================================
    // FIND ZONE
    // =========================================

    private Zone findZone(UUID id) {

        return zoneRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Zone not found"
                        )
                );
    }

    // =========================================
    // FIND PRICING
    // =========================================

    private PricingRate findPricing(UUID id) {

        return pricingRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Pricing rule not found"
                        )
                );
    }

    // =========================================
    // CONVERT ENTITY TO RESPONSE DTO
    // =========================================

    private PricingResponse toResponse(PricingRate rate) {

        return new PricingResponse(
                rate.getId(),
                rate.getZone().getId(),
                rate.getZone().getZoneName(),
                rate.getMinWeight(),
                rate.getMaxWeight(),
                rate.getDeliveryFee(),
                rate.isActive(),
                rate.getCreatedAt(),
                rate.getUpdatedAt()
        );
    }
}
