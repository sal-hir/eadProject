package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.*;
import com.swiftdrop.auth.dto.IdentityDtos.*;
import com.swiftdrop.auth.service.IdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Identity Management", description = "Administrator user provisioning, role assignments, lifecycle auditing, and user activation")
public class IdentityController {
    private final IdentityService identities;

    public IdentityController(IdentityService identities) {
        this.identities = identities;
    }

    UUID actor(Authentication a) {
        return UUID.fromString(a.getName());
    }

    @GetMapping("/admin/users")
    @Operation(summary = "List users", description = "Paginated search and list of all platform users (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<UserPage>> list(
            Authentication a,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page) {
        return safe(identities.list(actor(a), search, page));
    }

    @GetMapping("/admin/users/{id}")
    @Operation(summary = "Get user details", description = "Retrieves user record by ID (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile>> get(
            Authentication a,
            @PathVariable UUID id) {
        return safe(identities.get(actor(a), id));
    }

    @GetMapping("/admin/users/{id}/audit")
    @Operation(summary = "Get user audit trail", description = "Returns chronological audit log of changes made to the user account (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<List<Audit>>> audits(
            Authentication a,
            @PathVariable UUID id) {
        return safe(identities.audits(actor(a), id));
    }

    @PostMapping("/admin/users")
    @Operation(summary = "Provision user", description = "Creates a staff account (COURIER, DISPATCHER, ADMIN, MERCHANT) and generates an activation link (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User provisioned successfully with activation link"),
        @ApiResponse(responseCode = "400", description = "Validation error on provision fields"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "409", description = "Email already registered")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Activation>> provision(
            Authentication a,
            @Valid @RequestBody ProvisionRequest request) {
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(identities.provision(actor(a), request)));
    }

    @PostMapping("/admin/users/{id}/activation")
    @Operation(summary = "Reissue activation link", description = "Generates a new activation token for an inactive user (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "409", description = "User is already active")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Activation>> reissue(
            Authentication a,
            @PathVariable UUID id) {
        return safe(identities.reissue(actor(a), id));
    }

    @PostMapping("/admin/users/{id}/status")
    @Operation(summary = "Toggle user active status", description = "Suspends or reactivates a user account (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile>> status(
            Authentication a,
            @PathVariable UUID id,
            @Valid @RequestBody StatusRequest request) {
        return safe(identities.status(actor(a), id, request.active()));
    }

    @PostMapping("/admin/users/{id}/role")
    @Operation(summary = "Change user role", description = "Updates a user's assigned role (requires ADMIN role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error or invalid role transition"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile>> role(
            Authentication a,
            @PathVariable UUID id,
            @Valid @RequestBody RoleRequest request) {
        return safe(identities.role(actor(a), id, request.role()));
    }

    @PostMapping("/activate")
    @Operation(summary = "Activate account", description = "Public endpoint for invited users to set their initial password using their activation token.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Account activated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid or expired activation token")
    })
    public ResponseEntity<Void> activate(@Valid @RequestBody ActivationRequest request) {
        identities.activate(request);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private <T> ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<T>> safe(T data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(data));
    }
}
