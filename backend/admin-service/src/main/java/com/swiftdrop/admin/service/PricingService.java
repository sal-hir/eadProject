package com.swiftdrop.admin.service;

import com.swiftdrop.admin.dto.*;
import com.swiftdrop.admin.entity.PricingRate;
import com.swiftdrop.admin.entity.Zone;

import com.swiftdrop.admin.repository.PricingRateRepository;
import com.swiftdrop.admin.repository.ZoneRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PricingService {

    private final PricingRateRepository pricingRepository;
    private final ZoneRepository zoneRepository;

    public PricingService(
            PricingRateRepository pricingRepository,
            ZoneRepository zoneRepository
    ) {
        this.pricingRepository = pricingRepository;
        this.zoneRepository = zoneRepository;
    }

    public PricingResponse create(CreatePricingRequest request) {

        validateWeights(request.minWeight(), request.maxWeight());

        Zone zone = findZone(request.zoneId());

        PricingRate rate = new PricingRate();

        rate.setZone(zone);
        rate.setMinWeight(request.minWeight());
        rate.setMaxWeight(request.maxWeight());
        rate.setDeliveryFee(request.deliveryFee());

        return toResponse(pricingRepository.save(rate));
    }

    @Transactional(readOnly = true)
    public List<PricingResponse> getAll() {

        return pricingRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PricingResponse getById(UUID id) {

        return toResponse(findPricing(id));
    }

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

        return toResponse(pricingRepository.save(rate));
    }

    public void delete(UUID id) {

        PricingRate rate = findPricing(id);

        pricingRepository.delete(rate);
    }

    private void validateWeights(
            java.math.BigDecimal min,
            java.math.BigDecimal max
    ) {

        if (min.compareTo(max) >= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum weight must be greater than minimum weight"
            );
        }
    }

    private Zone findZone(UUID id) {

        return zoneRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Zone not found"
                        )
                );
    }

    private PricingRate findPricing(UUID id) {

        return pricingRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Pricing rule not found"
                        )
                );
    }

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