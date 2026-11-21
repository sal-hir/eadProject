package com.swiftdrop.dispatch_service.dto;

import java.time.Instant;

/**
 * Response DTO for {@code GET /api/v1/info}.
 *
 * <p>Contains non-sensitive, publicly visible metadata about this service.</p>
 *
 * @param applicationName short identifier for this service
 * @param description     human-readable purpose of the service
 * @param version         artifact version from build metadata or pom fallback
 * @param apiVersion      API version prefix in use (always {@code "v1"})
 * @param status          coarse health indicator — always {@code "UP"} when running
 * @param timestamp       server wall-clock time at the moment of the response
 */
public record InfoResponse(
        String applicationName,
        String description,
        String version,
        String apiVersion,
        String status,
        Instant timestamp) {}
