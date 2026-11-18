package com.swiftdrop.dispatch_service.service;

import com.swiftdrop.dispatch_service.entity.Parcel;
import com.swiftdrop.dispatch_service.repository.ParcelRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.dispatch_service.dto.CourierWorkloadResponse;
import com.swiftdrop.dispatch_service.dto.ParcelStatusEvent;
import com.swiftdrop.dispatch_service.client.AuthClient;
import com.swiftdrop.dispatch_service.client.CourierClient;
import com.swiftdrop.dispatch_service.dto.ParcelSyncResponse;
import java.util.ArrayList;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DispatchService {

    private final ParcelRepository parcelRepository;
    private final EventPublisherService eventPublisherService;
    private final AuthClient authClient; // <--- මේ line එක එකතු කරන්න
    private final RestTemplate restTemplate = new RestTemplate(new JdkClientHttpRequestFactory());

    // 1. Unassigned parcels ලබාගැනීම (පවතින Method එක)
    public List<Parcel> getUnassignedParcels() {
        return parcelRepository.findByCourierIdIsNull();
    }

    // 2. Controller එකේ GET /api/v1/dispatch/parcels සඳහා (Pagination & Filtering
    // සමඟ)
    public Page<Parcel> getParcels(boolean unassigned, String status, int page, int limit, String sortBy) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by(sortBy).descending());

        if (unassigned) {
            return parcelRepository.findByCourierIdIsNull(pageable);
        } else if (status != null && !status.trim().isEmpty()) {
            return parcelRepository.findByStatus(status, pageable);
        } else {
            return parcelRepository.findAll(pageable);
        }
    }

    // 3. Single Parcel එකක් ID එකෙන් ලබාගැනීම
    public Parcel getParcelById(Long parcelId) {
        return parcelRepository.findById(parcelId)
                .orElseThrow(() -> new RuntimeException("Parcel not found with ID: " + parcelId));
    }

    // 4. Parcel එකක් Courier කෙනෙකුට Assign කිරීම (Workload Validation සහිතව)
    public Parcel assignParcelToCourier(
            Long parcelId,
            String courierId,
            String token) {

        // 1. Validate the courier UUID
        UUID courierUuid;

        try {
            courierUuid = UUID.fromString(courierId);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid courier UUID: " + courierId);
        }

        // 2. Get the local Dispatch parcel
        Parcel parcel = getParcelById(parcelId);

        // 3. We need the original Parcel Service UUID, not the Dispatch Long ID
        if (parcel.getSourceParcelId() == null ||
                parcel.getSourceParcelId().isBlank()) {
            throw new IllegalStateException(
                    "Original Parcel Service ID is missing for parcel: " + parcelId);
        }

        // 4. Check courier workload (maximum 5 active parcels)
        long activeDeliveries = parcelRepository.countByCourierIdAndStatusIn(
                courierId,
                List.of("ASSIGNED", "PICKED_UP", "IN_TRANSIT"));

        if (activeDeliveries >= 5) {
            throw new IllegalStateException(
                    "Courier " + courierId +
                            " has reached the maximum workload capacity limit (5 active parcels).");
        }

        // 5. Call Parcel Service to assign the courier and update its status
        String parcelServiceUrl = "http://parcel-service:4002/api/v1/parcels/"
                + parcel.getSourceParcelId()
                + "/assignment";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        Map<String, UUID> requestBody = Map.of("courierId", courierUuid);

        HttpEntity<Map<String, UUID>> requestEntity = new HttpEntity<>(requestBody, headers);

        // If Parcel Service rejects the assignment, this call throws an exception.
        // Dispatch will not save its local assignment or publish an event.
        restTemplate.exchange(
                parcelServiceUrl,
                HttpMethod.PATCH,
                requestEntity,
                String.class);

        // 6. Parcel Service succeeded. Now update Dispatch's local record.
        parcel.setCourierId(courierId);
        parcel.setStatus("ASSIGNED");

        Parcel savedParcel = parcelRepository.save(parcel);

        // 7. Publish the event only after both service updates succeed
        eventPublisherService.publishParcelStatusEvent(
                savedParcel.getId() != null
                        ? savedParcel.getId().toString()
                        : null,
                savedParcel.getTrackingNumber(),
                savedParcel.getStatus(),
                courierId,
                savedParcel.getPickupAddress(),
                savedParcel.getDropoffAddress());

        return savedParcel;
    }

    // 5. Courier Assignment එකක් ඉවත් කිරීම (Unassigning - Idempotency)
    public Parcel unassignCourier(Long parcelId) {
        Parcel parcel = getParcelById(parcelId);

        parcel.setCourierId(null);
        parcel.setStatus("CREATED");

        Parcel savedParcel = parcelRepository.save(parcel);

        // RabbitMQ එකට Event එක යවන්න
        eventPublisherService.publishParcelStatusEvent(
                parcel.getId().toString(), // parcelId (String ලෙස)
                parcel.getTrackingNumber(), // trackingNumber
                parcel.getStatus(), // status
                parcel.getCourierId() != null ? parcel.getCourierId().toString() : null, // courierId
                parcel.getPickupAddress(), // pickupAddress
                parcel.getDropoffAddress() // dropoffAddress
        );

        return savedParcel;
    }

    // 6. Specific Courier කෙනෙකුගේ Active Workload ගණනය කිරීම (පවතින Method එක)
    public long getCourierWorkload(String courierId) {
        List<String> finishedStatuses = Arrays.asList("DELIVERED", "FAILED");
        return parcelRepository.countByCourierIdAndStatusNotIn(courierId, finishedStatuses);
    }

    // 7. සියලුම Couriers ලාගේ Workloads Summary එකක් Map එකක් ලෙස ලබාගැනීම
    public Map<String, Long> getAllCourierWorkloads() {
        List<String> finishedStatuses = Arrays.asList("DELIVERED", "FAILED");
        List<Parcel> activeParcels = parcelRepository.findByCourierIdIsNotNullAndStatusNotIn(finishedStatuses);

        Map<String, Long> workloadMap = new HashMap<>();
        for (Parcel parcel : activeParcels) {
            String courierId = parcel.getCourierId();
            workloadMap.put(courierId, workloadMap.getOrDefault(courierId, 0L) + 1);
        }
        return workloadMap;
    }

    // 8. Specific Courier කෙනෙකුට අයත් සියලුම Parcels ලබාගැනීම
    public List<Parcel> getParcelsByCourierId(String courierId) {
        return parcelRepository.findByCourierId(courierId);
    }

    // List<CourierWorkloadResponse> return කරන නව Method එක
    public List<CourierWorkloadResponse> getAllCourierWorkloadsList() {
        Map<String, Long> workloadMap = getAllCourierWorkloads();
        List<CourierWorkloadResponse> workloadList = new ArrayList<>();

        for (Map.Entry<String, Long> entry : workloadMap.entrySet()) {
            workloadList.add(new CourierWorkloadResponse(entry.getKey(), entry.getValue()));
        }

        return workloadList;
    }

    public List<AuthClient.CourierDto> getAvailableCouriers(String bearerToken) {
        return authClient.getCouriers(bearerToken);
    }

    @Transactional
    public String syncExistingParcelsFromParcelService(String token) {

        try {
            String parcelServiceUrl = "http://parcel-service:4002/api/v1/parcels/all";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<List<ParcelSyncResponse>> response = restTemplate.exchange(
                    parcelServiceUrl,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<ParcelSyncResponse>>() {
                    });

            List<ParcelSyncResponse> remoteParcels = response.getBody();

            if (remoteParcels == null || remoteParcels.isEmpty()) {
                return "No parcels found in Parcel Service.";
            }

            int syncedCount = 0;

            for (ParcelSyncResponse dto : remoteParcels) {

                if (dto.getParcelId() == null ||
                        dto.getTrackingNumber() == null) {
                    continue;
                }

                // Avoid importing the same parcel more than once
                if (parcelRepository.existsBySourceParcelId(dto.getParcelId())
                        || parcelRepository.existsByTrackingNumber(dto.getTrackingNumber())) {
                    continue;
                }

                Parcel parcel = new Parcel();

                // Do NOT set the generated Long ID.
                // Store the original Parcel Service UUID separately.
                parcel.setSourceParcelId(dto.getParcelId());

                parcel.setTrackingNumber(dto.getTrackingNumber());

                parcel.setStatus(
                        dto.getCurrentStatus() != null
                                ? dto.getCurrentStatus()
                                : "CREATED");

                // Newly imported parcels are unassigned.
                parcel.setCourierId(null);

                parcel.setPickupAddress(dto.getPickupAddress());
                parcel.setDropoffAddress(dto.getDropoffAddress());
                parcel.setEstimatedFee(dto.getEstimatedFee());

                parcelRepository.save(parcel);

                syncedCount++;
            }

            return "Successfully synced " + syncedCount +
                    " new parcels from Parcel Service.";

        } catch (Exception e) {
            throw new RuntimeException(
                    "Parcel synchronization failed: " + e.getMessage(), e);
        }
    }

}