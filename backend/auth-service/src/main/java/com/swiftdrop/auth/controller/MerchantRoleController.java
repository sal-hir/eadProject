package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.*;
import com.swiftdrop.auth.service.MerchantRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/internal/merchant-approvals")
@Tag(name = "Internal Role Synchronization", description = "Internal secure inter-service endpoints for elevated role synchronization between services")
public class MerchantRoleController {
    public record Grant(@NotNull UUID userId) {}

    private final MerchantRoleService roles;

    public MerchantRoleController(MerchantRoleService roles) {
        this.roles = roles;
    }

    @PostMapping("/{application}")
    @Operation(summary = "Grant merchant role", description = "Internal service callback to upgrade approved applicant user account to MERCHANT role (requires ADMIN and internal service key).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Forbidden: requires ADMIN role and valid inter-service key"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile>> grant(
            Authentication actor,
            @PathVariable UUID application,
            @RequestHeader(value = "X-SwiftDrop-Service-Key", required = false) String key,
            @Valid @RequestBody Grant request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(roles.grant(UUID.fromString(actor.getName()), application, request.userId(), key)));
    }
}
