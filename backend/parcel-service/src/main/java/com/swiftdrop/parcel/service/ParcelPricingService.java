package com.swiftdrop.parcel.service;

import com.swiftdrop.parcel.client.PricingGateway;
import com.swiftdrop.parcel.dto.ParcelQuoteRequest;
import com.swiftdrop.parcel.dto.ParcelQuoteResponse;
import com.swiftdrop.parcel.dto.ZoneOptionResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParcelPricingService {

    private final PricingGateway pricingGateway;

    public List<ZoneOptionResponse> getActiveZones(String token) {

        return pricingGateway.getZones(token)
                .stream()
                .filter(PricingGateway.ZoneData::active)
                .map(zone -> new ZoneOptionResponse(
                        zone.id(),
                        zone.zoneName(),
                        zone.description()
                ))
                .toList();
    }

    public ParcelQuoteResponse calculateQuote(
            ParcelQuoteRequest request,
            String token
    ) {

        var zones = pricingGateway.getZones(token);

        var pickupZone = zones.stream()
                .filter(zone -> zone.id().equals(request.pickupZoneId()))
                .filter(PricingGateway.ZoneData::active)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid or inactive pickup zone"
                ));

        boolean dropoffZoneExists = zones.stream()
                .anyMatch(zone ->
                        zone.id().equals(request.dropoffZoneId())
                                && zone.active()
                );

        if (!dropoffZoneExists) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or inactive drop-off zone"
            );
        }

        // Reuse Admin Service's existing pricing quote API.
        var rule = pricingGateway.getPricingQuote(
                request.pickupZoneId(),
                request.weightKg(),
                token
        );

        return new ParcelQuoteResponse(
                rule.id(),
                pickupZone.id(),
                request.dropoffZoneId(),
                pickupZone.zoneName(),
                request.weightKg(),
                rule.deliveryFee()
        );
    }

    public String getZoneName(java.util.UUID zoneId, String token) {

        return pricingGateway.getZones(token)
                .stream()
                .filter(zone -> zone.id().equals(zoneId))
                .map(PricingGateway.ZoneData::zoneName)
                .findFirst()
                .orElse("Zone ID: " + zoneId);
    }

}