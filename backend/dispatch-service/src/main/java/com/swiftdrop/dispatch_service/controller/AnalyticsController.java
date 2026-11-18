
package com.swiftdrop.dispatch_service.controller;

import com.swiftdrop.dispatch_service.dto.*;
import com.swiftdrop.dispatch_service.service.AnalyticsService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dispatch/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // 1. Overview cards
    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewDto> getOverview() {
        return ResponseEntity.ok(
                analyticsService.getOverview());
    }

    // 2. Recent parcels
    @GetMapping("/recent")
    public ResponseEntity<List<RecentParcelDto>> getRecentParcels(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(
                analyticsService.getRecentParcels(limit));
    }

    // 3. Status distribution
    @GetMapping("/status")
    public ResponseEntity<List<StatusAnalyticsDto>> getStatusAnalytics() {
        return ResponseEntity.ok(
                analyticsService.getStatusAnalytics());
    }

    // 4. Daily parcel creation
    @GetMapping("/daily")
    public ResponseEntity<List<DailyParcelAnalyticsDto>> getDailyAnalytics() {
        return ResponseEntity.ok(
                analyticsService.getDailyAnalytics());
    }

    // 5. Popular pickup locations
    @GetMapping("/locations/pickup")
    public ResponseEntity<List<LocationAnalyticsDto>> getPickupLocations() {
        return ResponseEntity.ok(
                analyticsService.getPickupLocations());
    }

    // 6. Popular drop-off locations
    @GetMapping("/locations/dropoff")
    public ResponseEntity<List<LocationAnalyticsDto>> getDropoffLocations() {
        return ResponseEntity.ok(
                analyticsService.getDropoffLocations());
    }

    // 7. Estimated fee analytics
    @GetMapping("/fees")
    public ResponseEntity<FeeAnalyticsDto> getFeeAnalytics() {
        return ResponseEntity.ok(
                analyticsService.getFeeAnalytics());
    }
}
