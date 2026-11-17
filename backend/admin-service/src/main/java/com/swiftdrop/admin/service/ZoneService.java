
package com.swiftdrop.admin.service;

import com.swiftdrop.admin.dto.*;
import com.swiftdrop.admin.entity.Zone;
import com.swiftdrop.admin.repository.ZoneRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ZoneService {

    private final ZoneRepository repository;

    public ZoneService(ZoneRepository repository) {
        this.repository = repository;
    }

    // Create a new zone
    public ZoneResponse create(CreateZoneRequest request) {

        if (repository.existsByZoneNameIgnoreCase(
                request.zoneName().trim())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Zone already exists"
            );
        }

        Zone zone = new Zone();

        zone.setZoneName(request.zoneName().trim());
        zone.setDescription(request.description());

        // Save map location and coverage radius
        zone.setLatitude(request.latitude());
        zone.setLongitude(request.longitude());
        zone.setRadiusKm(request.radiusKm());

        Zone saved = repository.save(zone);

        return toResponse(saved);
    }

    // Get all zones
    @Transactional(readOnly = true)
    public List<ZoneResponse> getAll() {

        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Get zone by ID
    @Transactional(readOnly = true)
    public ZoneResponse getById(UUID id) {

        Zone zone = findZone(id);

        return toResponse(zone);
    }

    // Update zone
    public ZoneResponse update(
            UUID id,
            UpdateZoneRequest request
    ) {

        Zone zone = findZone(id);

        boolean duplicate = repository
                .existsByZoneNameIgnoreCase(
                        request.zoneName().trim()
                );

        if (duplicate && !zone.getZoneName()
                .equalsIgnoreCase(request.zoneName().trim())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Zone name already exists"
            );
        }

        zone.setZoneName(request.zoneName().trim());
        zone.setDescription(request.description());
        zone.setActive(request.active());

        // Update map location and coverage radius
        zone.setLatitude(request.latitude());
        zone.setLongitude(request.longitude());
        zone.setRadiusKm(request.radiusKm());

        return toResponse(repository.save(zone));
    }

    // Delete zone
    public void delete(UUID id) {

        Zone zone = findZone(id);

        repository.delete(zone);
    }

    // Find zone
    private Zone findZone(UUID id) {

        return repository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Zone not found"
                        )
                );
    }

    // Convert entity to response DTO
    private ZoneResponse toResponse(Zone zone) {

        return new ZoneResponse(
                zone.getId(),
                zone.getZoneName(),
                zone.getDescription(),
                zone.isActive(),
                zone.getLatitude(),
                zone.getLongitude(),
                zone.getRadiusKm(),
                zone.getCreatedAt(),
                zone.getUpdatedAt()
        );
    }
}
