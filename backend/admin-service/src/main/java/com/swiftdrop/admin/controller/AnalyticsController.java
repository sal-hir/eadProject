
package com.swiftdrop.admin.controller;

import com.swiftdrop.admin.dto.*;
import com.swiftdrop.admin.service.AnalyticsService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {// changed
        this.analyticsService = analyticsService;
    }

    // Dashboard overview
    @GetMapping("/overview")
    public ResponseEntity<DashboardAnalyticsResponse> getOverview() {

        return ResponseEntity.ok(
                analyticsService.getOverview());
    }

    // Daily delivery analytics
    @GetMapping("/deliveries/daily")
    public ResponseEntity<List<DailyDeliveryAnalyticsResponse>> getDailyDeliveries(

            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(
                analyticsService.getDailyDeliveries(from, to));
    }

    // Delivery status distribution
    @GetMapping("/delivery-status")
    public ResponseEntity<List<DeliveryStatusAnalyticsResponse>> getDeliveryStatus() {

        return ResponseEntity.ok(
                analyticsService.getDeliveryStatus());
    }
}
