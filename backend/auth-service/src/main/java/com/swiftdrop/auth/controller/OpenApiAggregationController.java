package com.swiftdrop.auth.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Aggregates OpenAPI specifications from downstream microservices
 * so that the centralized Swagger UI can display each backend service as a separate group.
 */
@RestController
@RequestMapping("/v3/api-docs/services")
public class OpenApiAggregationController {

    private static final Logger log = LoggerFactory.getLogger(OpenApiAggregationController.class);

    private final String merchantUrl;
    private final String courierUrl;
    private final String trackingUrl;
    private final String notificationUrl;
    private final String parcelUrl;
    private final String dispatchUrl;
    private final HttpClient httpClient;

    public OpenApiAggregationController(
            @Value("${services.merchant.url:${MERCHANT_SERVICE_URL:http://localhost:4001}}") String merchantUrl,
            @Value("${services.courier.url:${COURIER_SERVICE_URL:http://localhost:4003}}") String courierUrl,
            @Value("${services.tracking.url:${TRACKING_SERVICE_URL:http://localhost:4004}}") String trackingUrl,
            @Value("${services.notification.url:${NOTIFICATION_SERVICE_URL:http://localhost:4005}}") String notificationUrl,
            @Value("${services.parcel.url:${PARCEL_SERVICE_URL:http://localhost:4002}}") String parcelUrl,
            @Value("${services.dispatch.url:${DISPATCH_SERVICE_URL:http://localhost:8080}}") String dispatchUrl) {
        this.merchantUrl = merchantUrl.replaceAll("/+$", "");
        this.courierUrl = courierUrl.replaceAll("/+$", "");
        this.trackingUrl = trackingUrl.replaceAll("/+$", "");
        this.notificationUrl = notificationUrl.replaceAll("/+$", "");
        this.parcelUrl = parcelUrl.replaceAll("/+$", "");
        this.dispatchUrl = dispatchUrl.replaceAll("/+$", "");
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(2500))
                .build();
    }

    @GetMapping(value = "/merchant", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getMerchantOpenApi() {
        return fetchSpec(merchantUrl + "/v3/api-docs", "Merchant Management Service", merchantUrl);
    }

    @GetMapping(value = "/courier", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getCourierOpenApi() {
        return fetchSpec(courierUrl + "/v3/api-docs", "Courier & Delivery Service", courierUrl);
    }

    @GetMapping(value = "/tracking", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getTrackingOpenApi() {
        return fetchSpec(trackingUrl + "/v3/api-docs", "Real-Time Tracking Service", trackingUrl);
    }

    @GetMapping(value = "/parcel", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getParcelOpenApi() {
        return fetchSpec(parcelUrl + "/v3/api-docs", "Parcel Booking & Pricing Service", parcelUrl);
    }

    @GetMapping(value = "/dispatch", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getDispatchOpenApi() {
        return fetchSpec(dispatchUrl + "/v3/api-docs", "Dispatch Service", dispatchUrl);
    }

    @GetMapping(value = "/notification", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getNotificationOpenApi() {
        // Notification service is a Node.js worker with HTTP endpoints
        String healthTarget = notificationUrl + "/health";
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(healthTarget))
                    .timeout(Duration.ofMillis(2000))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                return ResponseEntity.ok(buildNotificationOpenApiSpec());
            }
        } catch (Exception e) {
            log.warn("Notification Service unavailable at {}: {}", healthTarget, e.getMessage());
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "success", false,
                "status", 503,
                "service", "Notification Service",
                "message", "Notification Service is currently unreachable at " + notificationUrl
        ));
    }

    private ResponseEntity<?> fetchSpec(String targetUrl, String serviceName, String baseUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofMillis(2500))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(response.body());
            } else {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                        "success", false,
                        "status", 503,
                        "service", serviceName,
                        "message", serviceName + " returned HTTP " + response.statusCode() + " at " + targetUrl
                ));
            }
        } catch (Exception e) {
            log.warn("Downstream OpenAPI fetch failed for {} at {}: {}", serviceName, targetUrl, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "status", 503,
                    "service", serviceName,
                    "message", serviceName + " is currently unreachable at " + baseUrl
            ));
        }
    }

    private Map<String, Object> buildNotificationOpenApiSpec() {
        return Map.of(
                "openapi", "3.0.1",
                "info", Map.of(
                        "title", "SwiftDrop Notification Service API",
                        "description", "Handles asynchronous event notifications (SMS, Email) via RabbitMQ and provides live notification streams and SMS logs.",
                        "version", "v1.0.0"
                ),
                "servers", java.util.List.of(
                        Map.of("url", notificationUrl, "description", "Notification Service Direct URL")
                ),
                "paths", Map.of(
                        "/health", Map.of(
                                "get", Map.of(
                                        "tags", java.util.List.of("Health"),
                                        "summary", "Service Health Check",
                                        "description", "Returns the consumer readiness and connection status to RabbitMQ.",
                                        "responses", Map.of(
                                                "200", Map.of("description", "Consumer is healthy and connected"),
                                                "503", Map.of("description", "Consumer is disconnected from RabbitMQ")
                                        )
                                )
                        ),
                        "/api/v1/notifications/sms-log", Map.of(
                                "get", Map.of(
                                        "tags", java.util.List.of("Notifications"),
                                        "summary", "Get SMS Delivery History",
                                        "description", "Returns recently dispatched SMS messages.",
                                        "responses", Map.of(
                                                "200", Map.of("description", "List of dispatched SMS messages")
                                        )
                                )
                        ),
                        "/api/v1/notifications/stream", Map.of(
                                "get", Map.of(
                                        "tags", java.util.List.of("Notifications"),
                                        "summary", "Server-Sent Events (SSE) Live Notification Stream",
                                        "description", "Subscribes to real-time parcel event notifications dispatched to clients.",
                                        "responses", Map.of(
                                                "200", Map.of("description", "Real-time SSE event stream")
                                        )
                                )
                        )
                )
        );
    }
}
