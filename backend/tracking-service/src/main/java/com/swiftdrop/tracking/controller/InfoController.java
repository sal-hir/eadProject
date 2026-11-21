package com.swiftdrop.tracking.controller;

import com.swiftdrop.tracking.dto.InfoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * Public system information endpoint.
 *
 * <p>Returns non-sensitive metadata about this service instance.
 * No authentication required — safe for monitoring, load-balancer
 * health dashboards, and Swagger/OpenAPI aggregation UIs.</p>
 */
@RestController
@Tag(name = "System Information", description = "Public service metadata, version, runtime details, and health status")
public class InfoController {

    private final @Nullable BuildProperties build;
    private final String applicationName;
    private final String description;
    private final String serviceVersion;

    public InfoController(
            @Nullable BuildProperties build,
            @Value("${spring.application.name:tracking-service}") String applicationName,
            @Value("${info.app.description:SwiftDrop Real-Time Tracking and AI Assistant Service}") String description,
            @Value("${info.app.version:${project.version:0.1.0}}") String serviceVersion) {
        this.build = build;
        this.applicationName = applicationName;
        this.description = description;
        this.serviceVersion = serviceVersion;
    }

    @GetMapping("/api/v1/info")
    @Operation(summary = "Get service metadata", description = "Returns service name, version, runtime stats, and health status for monitoring dashboards and API aggregators.")
    public ResponseEntity<InfoResponse> info() {
        String version = build != null ? build.getVersion() : serviceVersion;
        InfoResponse body = new InfoResponse(
                applicationName,
                description,
                version,
                "v1",
                "UP",
                Instant.now());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
