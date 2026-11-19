package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.*;
import com.swiftdrop.auth.service.AuthService;
import com.swiftdrop.auth.service.BrowserSessionService;
import com.swiftdrop.auth.security.SessionCookies;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Customer registration, user login, JWT token issuance, and current profile verification")
public class AuthController {
    private final AuthService auth;
    private final BrowserSessionService sessions;
    private final SessionCookies cookies;

    public AuthController(AuthService auth, BrowserSessionService sessions, SessionCookies cookies) {
        this.auth = auth;
        this.sessions = sessions;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register customer", description = "Public self-service customer registration. Creates user account and returns profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User successfully registered"),
        @ApiResponse(responseCode = "400", description = "Validation error on registration fields"),
        @ApiResponse(responseCode = "409", description = "Email address already registered")
    })
    public com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile> register(@Valid @RequestBody RegisterRequest request) {
        return com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(auth.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Authenticates user credentials and issues a signed JWT access token. Optionally issues refresh cookie.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Invalid request format"),
        @ApiResponse(responseCode = "401", description = "Bad credentials or disabled account")
    })
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<LoginResult>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        LoginResult result = auth.login(request);
        if (cookies.requested(http)) {
            var session = sessions.start(result.user().id(), cookies.read(http));
            cookies.set(response, session);
            result = session.login();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(result));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Returns profile of the user identified by the Bearer access token.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "401", description = "Invalid, expired, or missing Bearer token")
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile>> me(Authentication principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(Profile.from(auth.current(UUID.fromString(principal.getName())))));
    }

    @GetMapping("/admin/me")
    @Operation(summary = "Staff identity verification", description = "Demonstrates staff authorization (requires ADMIN or DISPATCHER role).")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
        @ApiResponse(responseCode = "401", description = "Authentication required"),
        @ApiResponse(responseCode = "403", description = "Access denied: insufficient permissions")
    })
    public com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Profile> staff(Authentication principal) {
        return com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(Profile.from(auth.current(UUID.fromString(principal.getName()))));
    }
}
