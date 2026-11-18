
package com.swiftdrop.parcel.controller;

import com.swiftdrop.parcel.client.IdentityGateway;
import com.swiftdrop.parcel.dto.*;
import com.swiftdrop.parcel.service.ParcelPricingService;
import com.swiftdrop.parcel.service.ParcelReceiptPdfService;
import com.swiftdrop.parcel.service.ParcelService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/parcels")
@RequiredArgsConstructor
public class ParcelController {

    private final ParcelService parcelService;
    private final ParcelPricingService parcelPricingService;

    private final ParcelReceiptPdfService parcelReceiptPdfService;

    @PostMapping
    public ResponseEntity<ParcelResponse> createParcel(
            @Valid @RequestBody ParcelBookingRequest request,
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {

        String token = extractToken(authorization);

        ParcelResponse response = parcelService.createParcel(
                request,
                caller,
                token
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<ParcelResponse>> getMyParcels(
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {

        return ResponseEntity.ok(
                parcelService.getMyParcels(
                        caller,
                        extractToken(authorization)
                )
        );
    }

    @GetMapping("/all")
    public ResponseEntity<List<ParcelResponse>> getAllParcels(
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        String token = extractToken(authorization);

        if (caller == null || (!"DISPATCHER".equalsIgnoreCase(caller.role()) && !"ADMIN".equalsIgnoreCase(caller.role()))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not authorized to access parcel synchronization"
            );
        }

        List<ParcelResponse> parcels = parcelService.getAllParcelsForSync(caller);

        return ResponseEntity.ok(parcels);
    }
    @GetMapping("/{parcelId}")
    public ResponseEntity<ParcelResponse> getParcelById(
            @PathVariable UUID parcelId,
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {

        return ResponseEntity.ok(
                parcelService.getParcelById(
                        parcelId,
                        caller,
                        extractToken(authorization)
                )
        );
    }

    @GetMapping("/tracking/{trackingNumber}")
    public ResponseEntity<ParcelTrackingResponse> getParcelByTrackingNumber(
            @PathVariable String trackingNumber
    ) {

        return ResponseEntity.ok(
                parcelService.getParcelByTrackingNumber(trackingNumber)
        );
    }

    private String extractToken(String authorization) {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        return authorization.substring(7).trim();
    }

    @GetMapping("/booking/zones")
    public ResponseEntity<List<com.swiftdrop.parcel.dto.ZoneOptionResponse>> getBookingZones(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return ResponseEntity.ok(
                parcelPricingService.getActiveZones(extractToken(authorization))
        );
    }

    @PostMapping("/booking/quote")
    public ResponseEntity<com.swiftdrop.parcel.dto.ParcelQuoteResponse> getBookingQuote(
            @Valid @RequestBody com.swiftdrop.parcel.dto.ParcelQuoteRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return ResponseEntity.ok(
                parcelPricingService.calculateQuote(
                        request,
                        extractToken(authorization)
                )
        );
    }



    @GetMapping(value = "/{parcelId}/receipt", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadReceipt(
            @PathVariable UUID parcelId,
            @AuthenticationPrincipal IdentityGateway.Caller caller,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {

        String token = extractToken(authorization);

        // Reuse existing ownership verification.
        ParcelResponse parcel = parcelService.getParcelById(
                parcelId,
                caller,
                token
        );

        // Retrieve zone names from the existing Admin integration.
        String pickupZoneName = parcelPricingService.getZoneName(
                parcel.pickupZoneId(),
                token
        );

        String dropoffZoneName = parcelPricingService.getZoneName(
                parcel.dropoffZoneId(),
                token
        );

        // Generate PDF.
        byte[] pdf = parcelReceiptPdfService.generateReceipt(
                parcel,
                pickupZoneName,
                dropoffZoneName
        );

        String filename = "SwiftDrop-Receipt-" + parcel.trackingNumber() + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .body(pdf);
    }


    //status chamging methosd
    @PatchMapping("/{parcelId}/assignment")
    public ResponseEntity<ParcelResponse> assignCourier(
            @PathVariable UUID parcelId,
            @Valid @RequestBody ParcelAssignmentRequest request,
            @AuthenticationPrincipal IdentityGateway.Caller caller
    ) {

        return ResponseEntity.ok(
                parcelService.assignCourier(
                        parcelId,
                        request.courierId(),
                        caller
                )
        );
    }

    //Courier status update endpoint
    @PatchMapping("/{parcelId}/status")
    public ResponseEntity<ParcelResponse> updateCourierStatus(
            @PathVariable UUID parcelId,
            @Valid @RequestBody ParcelStatusUpdateRequest request,
            @AuthenticationPrincipal IdentityGateway.Caller caller
    ) {

        return ResponseEntity.ok(
                parcelService.updateCourierStatus(
                        parcelId,
                        request.status(),
                        caller
                )
        );
    }

}
