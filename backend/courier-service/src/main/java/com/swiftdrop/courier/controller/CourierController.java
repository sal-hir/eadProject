package com.swiftdrop.courier.controller;

import com.swiftdrop.courier.client.IdentityGateway;
import com.swiftdrop.courier.dto.*;
import com.swiftdrop.courier.entity.DeliveryStatus;
import com.swiftdrop.courier.service.CourierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Courier Operations", description = "Courier driver assigned parcel task board, availability status, and delivery stage updates")
@SecurityRequirement(name = "bearerAuth")
public class CourierController {
    private final CourierService courierService;

    public CourierController(CourierService courierService) {
        this.courierService = courierService;
    }

    @GetMapping("/couriers/my-deliveries")
    @Operation(summary = "Get assigned deliveries", description = "Retrieves all parcel assignments for the authenticated courier, with optional delivery status filter.")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires COURIER)")
    })
    public ResponseEntity<Map<String, Object>> getMyDeliveries(
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestParam(required = false) DeliveryStatus status) {
        CourierDeliveriesResponse response = courierService.getMyDeliveries(caller, status);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", response
        ));
    }

    @PatchMapping("/couriers/availability")
    @Operation(summary = "Toggle duty availability", description = "Sets the courier driver duty availability status (available or off-duty).")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Invalid request format"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires COURIER)")
    })
    public ResponseEntity<Map<String, Object>> toggleAvailability(
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestBody AvailabilityRequest request) {
        CourierProfileDto profile = courierService.setAvailability(caller, request.isAvailable());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", profile
        ));
    }

    @PatchMapping({"/couriers/parcels/{id}/status", "/parcels/{id}/status"})
    @Operation(summary = "Update parcel delivery status", description = "Updates the delivery stage (e.g. PICKED_UP, DELIVERED, FAILED) with optional note, failure reason, and proof photo URL.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error or invalid status transition"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role or not assigned to this parcel"),
        @ApiResponse(responseCode = "404", description = "Parcel not found")
    })
    public ResponseEntity<Map<String, Object>> updateStatus(
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @PathVariable UUID id,
            @Valid @RequestBody StatusUpdateRequest request) {
        ParcelDto updated = courierService.updateParcelStatus(caller, id, request);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", updated
        ));
    }
}
