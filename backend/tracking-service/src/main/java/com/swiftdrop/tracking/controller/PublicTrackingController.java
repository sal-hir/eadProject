package com.swiftdrop.tracking.controller;

import com.swiftdrop.tracking.dto.PublicTrackingResponse;
import com.swiftdrop.tracking.dto.StatusUpdateEventRequest;
import com.swiftdrop.tracking.service.TrackingRealTimeService;
import com.swiftdrop.tracking.service.TrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/tracking")
@Tag(name = "Public Tracking", description = "Public parcel delivery tracking, chronological event history, live SSE streaming, and status event ingestion")
public class PublicTrackingController {

    private final TrackingService trackingService;
    private final TrackingRealTimeService realTimeService;

    public PublicTrackingController(TrackingService trackingService, TrackingRealTimeService realTimeService) {
        this.trackingService = trackingService;
        this.realTimeService = realTimeService;
    }

    /**
     * Public Tracking REST API
     * Returns sanitized parcel state and chronological event timeline.
     * Cached via Redis for high-throughput public lookups.
     */
    @GetMapping("/{trackingNumber}")
    @Operation(summary = "Get parcel tracking status", description = "Public tracking lookup returning sanitized parcel status, current location, estimated delivery, and chronological lifecycle milestones.")
    @ApiResponse(responseCode = "404", description = "Tracking number not found")
    public ResponseEntity<?> getPublicTracking(
            @Parameter(description = "Unique parcel tracking number (e.g. SWIFT-849201)")
            @PathVariable String trackingNumber) {
        return trackingService.getPublicTracking(trackingNumber)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(404).body(
                (PublicTrackingResponse) null
            ));
    }

    /**
     * Real-time Server-Sent Events (SSE) push stream for live parcel updates.
     */
    @GetMapping(value = "/{trackingNumber}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to live tracking SSE stream", description = "Opens an HTTP Server-Sent Events stream for instant real-time status notifications for the parcel.")
    public SseEmitter streamTrackingUpdates(
            @Parameter(description = "Parcel tracking number to subscribe to")
            @PathVariable String trackingNumber) {
        return realTimeService.subscribe(trackingNumber);
    }

    /**
     * Internal/Webhook status event ingestion endpoint.
     * Invoked when Courier or Dispatcher updates a delivery stage.
     */
    @PostMapping("/{trackingNumber}/events")
    @Operation(summary = "Record parcel status update event", description = "Ingests a delivery transition event, updates Redis cache, and broadcasts to active SSE subscribers.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Invalid event request payload"),
        @ApiResponse(responseCode = "404", description = "Tracking number not found")
    })
    public ResponseEntity<PublicTrackingResponse> recordStatusUpdate(
            @Parameter(description = "Parcel tracking number")
            @PathVariable String trackingNumber,
            @Valid @RequestBody StatusUpdateEventRequest request) {
        PublicTrackingResponse updated = trackingService.recordStatusUpdate(trackingNumber, request);
        return ResponseEntity.ok(updated);
    }
}
