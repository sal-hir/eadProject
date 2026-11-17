package com.swiftdrop.dispatch_service.controller;

import com.swiftdrop.dispatch_service.dto.AssignCourierRequest;
import com.swiftdrop.dispatch_service.dto.CourierWorkloadResponse;
import com.swiftdrop.dispatch_service.entity.Parcel;
import com.swiftdrop.dispatch_service.service.DispatchService;
import com.swiftdrop.dispatch_service.client.AuthClient;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dispatch")
@CrossOrigin(origins = "*")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    // 1. GET /api/v1/dispatch/parcels
    @GetMapping("/parcels")
    public ResponseEntity<Page<Parcel>> getParcels(
            @RequestParam(defaultValue = "false") boolean unassigned,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "id") String sort) {
        int validatedLimit = Math.min(limit, 100);
        Page<Parcel> parcels = dispatchService.getParcels(unassigned, status, page, validatedLimit, sort);
        return ResponseEntity.ok(parcels);
    }

    // 2. GET /api/v1/dispatch/parcels/{id}
    @GetMapping("/parcels/{id}")
    public ResponseEntity<Parcel> getParcelById(@PathVariable Long id) {
        Parcel parcel = dispatchService.getParcelById(id);
        return ResponseEntity.ok(parcel);
    }

    // 3. POST /api/v1/dispatch/parcels/{id}/assignments
    @PostMapping("/parcels/{id}/assignments")
    public ResponseEntity<Parcel> assignCourierToParcel(
            @PathVariable("id") Long parcelId,
            @RequestBody AssignCourierRequest request) {
        Parcel updatedParcel = dispatchService.assignParcelToCourier(parcelId, request.getCourierId());
        return ResponseEntity.status(HttpStatus.OK).body(updatedParcel);
    }

    // 4. DELETE /api/v1/dispatch/parcels/{id}/assignments
    @DeleteMapping("/parcels/{id}/assignments")
    public ResponseEntity<Parcel> unassignCourierFromParcel(@PathVariable("id") Long parcelId) {
        Parcel unassignedParcel = dispatchService.unassignCourier(parcelId);
        return ResponseEntity.ok(unassignedParcel);
    }

    // 5. GET /api/v1/dispatch/couriers/workloads
    @GetMapping("/couriers/workloads")
    public ResponseEntity<List<CourierWorkloadResponse>> getAllCourierWorkloads() {
        List<CourierWorkloadResponse> workloads = dispatchService.getAllCourierWorkloadsList();
        return ResponseEntity.ok(workloads);
    }

    // 6. GET /api/v1/dispatch/couriers/{courierId}/workload
    @GetMapping("/couriers/{courierId}/workload")
    public ResponseEntity<CourierWorkloadResponse> getCourierWorkload(@PathVariable String courierId) {
        long activeCount = dispatchService.getCourierWorkload(courierId);
        CourierWorkloadResponse response = new CourierWorkloadResponse(courierId, activeCount);
        return ResponseEntity.ok(response);
    }

    // 7. GET /api/v1/dispatch/couriers/{courierId}/parcels
    @GetMapping("/couriers/{courierId}/parcels")
    public ResponseEntity<List<Parcel>> getParcelsByCourier(@PathVariable String courierId) {
        List<Parcel> courierParcels = dispatchService.getParcelsByCourierId(courierId);
        return ResponseEntity.ok(courierParcels);
    }

    // 8. GET /api/v1/dispatch/couriers (Courier Service එකෙන් Available Couriers
    // ලාව ගැනීම)
    @GetMapping("/couriers")
    public ResponseEntity<List<AuthClient.CourierDto>> getAvailableCouriers(
            @RequestHeader(value = "Authorization", required = false) String bearerToken) {

        List<AuthClient.CourierDto> couriers = dispatchService.getAvailableCouriers(bearerToken);

        return ResponseEntity.ok(couriers);
    }

    @PostMapping("/parcels/sync")
    public ResponseEntity<String> triggerParcelSync(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        try {
            String token = extractToken(authorization);
            String resultMessage = dispatchService.syncExistingParcelsFromParcelService(token);
            return ResponseEntity.ok(resultMessage);
        } catch (Exception e) {
            // මෙයින් actual error එක කෙලින්ම Postman එකට return කරයි
            return ResponseEntity.status(500).body("SYNC ERROR: " + e.getMessage() + " | Cause: "
                    + (e.getCause() != null ? e.getCause().getMessage() : "N/A"));
        }
    }

    private String extractToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required");
        }
        return authorization.substring(7).trim();
    }
}