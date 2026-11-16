package com.swiftdrop.merchant.controller;

import com.swiftdrop.merchant.client.IdentityGateway.Caller;
import com.swiftdrop.merchant.dto.MerchantDtos.*;
import com.swiftdrop.merchant.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/merchants")
@Tag(name = "Merchant Applications", description = "Merchant business onboarding applications, approval reviews, audits, and business profile lifecycle")
@SecurityRequirement(name = "bearerAuth")
public class ApplicationController {
    private final ApplicationService applications;
    private final ApprovalService approvals;

    public ApplicationController(ApplicationService applications, ApprovalService approvals) {
        this.applications = applications;
        this.approvals = approvals;
    }

    static <T> ResponseEntity<Envelope<T>> safe(T data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Envelope.ok(data));
    }

    @PostMapping("/applications")
    @Operation(summary = "Submit merchant application", description = "Submits a new merchant onboarding application for business verification.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Application submitted successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error on application fields"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires CUSTOMER or MERCHANT)"),
        @ApiResponse(responseCode = "409", description = "An application already exists for this user")
    })
    public ResponseEntity<Envelope<Profile>> submit(
            @AuthenticationPrincipal Caller caller,
            @Valid @RequestBody Business request) {
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(Envelope.ok(applications.submit(caller, request)));
    }

    @GetMapping("/applications/me")
    @Operation(summary = "Get own application", description = "Retrieves the current user's submitted merchant application status.")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires CUSTOMER or MERCHANT)"),
        @ApiResponse(responseCode = "404", description = "No application found for this user")
    })
    public ResponseEntity<Envelope<Profile>> own(@AuthenticationPrincipal Caller caller) {
        return safe(applications.own(caller));
    }

    @PutMapping("/applications/me")
    @Operation(summary = "Update pending application", description = "Modifies details of an application while still in PENDING status.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role"),
        @ApiResponse(responseCode = "404", description = "Application not found"),
        @ApiResponse(responseCode = "409", description = "Conflict or optimistic lock mismatch (can only edit PENDING or REJECTED)")
    })
    public ResponseEntity<Envelope<Profile>> edit(
            @AuthenticationPrincipal Caller caller,
            @Valid @RequestBody Update request) {
        return safe(applications.edit(caller, request));
    }

    @PostMapping("/applications/me/resubmit")
    @Operation(summary = "Resubmit rejected application", description = "Transitions a REJECTED application back to PENDING for re-review.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role"),
        @ApiResponse(responseCode = "404", description = "Application not found"),
        @ApiResponse(responseCode = "409", description = "Conflict (can only resubmit REJECTED application)")
    })
    public ResponseEntity<Envelope<Profile>> resubmit(
            @AuthenticationPrincipal Caller caller,
            @Valid @RequestBody Version request) {
        return safe(applications.resubmit(caller, request.version()));
    }

    @GetMapping("/profile")
    @Operation(summary = "Get merchant profile", description = "Returns the approved merchant's business profile and operational details.")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires approved MERCHANT)"),
        @ApiResponse(responseCode = "404", description = "Profile not found")
    })
    public ResponseEntity<Envelope<Profile>> business(@AuthenticationPrincipal Caller caller) {
        return safe(applications.business(caller));
    }

    @GetMapping("/admin/applications")
    @Operation(summary = "List merchant applications", description = "Paginated list of all merchant applications with optional status filter and search (requires ADMIN role).")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Invalid page number or search query"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)")
    })
    public ResponseEntity<Envelope<PageResult>> list(
            @AuthenticationPrincipal Caller caller,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page) {
        return safe(applications.list(caller, status, search, page));
    }

    @GetMapping("/admin/applications/{id}")
    @Operation(summary = "Get application by ID", description = "Retrieves full details of a specific merchant application (requires ADMIN role).")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "Application not found")
    })
    public ResponseEntity<Envelope<Profile>> get(
            @AuthenticationPrincipal Caller caller,
            @PathVariable UUID id) {
        return safe(applications.get(caller, id));
    }

    @GetMapping("/admin/applications/{id}/audit")
    @Operation(summary = "Get application audit log", description = "Chronological audit events for this application (requires ADMIN role).")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "Application not found")
    })
    public ResponseEntity<Envelope<List<Audit>>> audit(
            @AuthenticationPrincipal Caller caller,
            @PathVariable UUID id) {
        return safe(applications.history(caller, id));
    }

    @PostMapping("/admin/applications/{id}/approve")
    @Operation(summary = "Approve merchant application", description = "Approves a pending merchant application and triggers role synchronization (requires ADMIN role).")
    @ApiResponses({
        @ApiResponse(responseCode = "202", description = "Approval accepted locally; identity sync pending retry"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "Application not found"),
        @ApiResponse(responseCode = "409", description = "Optimistic lock version conflict")
    })
    public ResponseEntity<Envelope<Profile>> approve(
            @AuthenticationPrincipal Caller caller,
            @PathVariable UUID id,
            @Valid @RequestBody Version request,
            @RequestHeader("Authorization") String authorization) {
        var result = approvals.approve(caller, id, request.version(), authorization.substring(7));
        return ResponseEntity.status(result.status() == Status.APPROVED ? 200 : 202).cacheControl(CacheControl.noStore()).body(Envelope.ok(result));
    }

    @PostMapping("/admin/applications/{id}/reject")
    @Operation(summary = "Reject merchant application", description = "Rejects a merchant application with a specified reason (requires ADMIN role).")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Validation error (missing rejection reason)"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Insufficient role (requires ADMIN)"),
        @ApiResponse(responseCode = "404", description = "Application not found"),
        @ApiResponse(responseCode = "409", description = "Optimistic lock version conflict")
    })
    public ResponseEntity<Envelope<Profile>> reject(
            @AuthenticationPrincipal Caller caller,
            @PathVariable UUID id,
            @Valid @RequestBody Rejection request) {
        return safe(applications.reject(caller, id, request));
    }
}
