package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.*;
import com.swiftdrop.auth.service.OAuthService;
import com.swiftdrop.auth.service.BrowserSessionService;
import com.swiftdrop.auth.security.SessionCookies;
import com.swiftdrop.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "OAuth2 Authentication", description = "OAuth2 social identity providers, linked accounts, and PKCE authorization code exchange")
public class OAuthController {
    private final OAuthService oauth;
    private final ClientRegistrationRepository registrations;
    private final BrowserSessionService sessions;
    private final SessionCookies cookies;
    private final UserRepository users;

    public OAuthController(OAuthService oauth, ClientRegistrationRepository registrations, BrowserSessionService sessions, SessionCookies cookies, UserRepository users) {
        this.oauth = oauth;
        this.registrations = registrations;
        this.sessions = sessions;
        this.cookies = cookies;
        this.users = users;
    }

    @GetMapping("/account")
    @Operation(summary = "Get linked social account status", description = "Checks whether Google OAuth2 is linked and password authentication is enabled for the current user.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Map<String, Boolean>>> account(JwtAuthenticationToken authentication) {
        var user = users.findById(UUID.fromString(authentication.getName())).orElseThrow();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(Map.of(
                "googleLinked", user.getGoogleSubject() != null,
                "passwordEnabled", user.getPasswordHash() != null,
                "googleAvailable", registrations.findByRegistrationId("google") != null)));
    }

    @GetMapping("/providers")
    @Operation(summary = "List available OAuth2 providers", description = "Returns the active external social identity providers available on this environment.")
    public com.swiftdrop.auth.dto.AuthDtos.ApiResponse<Map<String, Boolean>> providers() {
        return com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(Map.of("google", registrations.findByRegistrationId("google") != null));
    }

    @PostMapping("/oauth/exchange")
    @Operation(summary = "Exchange authorization code", description = "Exchanges a PKCE authorization code and code verifier for a SwiftDrop JWT access token.")
    @ApiResponse(responseCode = "400", description = "Invalid or expired authorization code or verifier")
    public ResponseEntity<com.swiftdrop.auth.dto.AuthDtos.ApiResponse<LoginResult>> exchange(
            @Valid @RequestBody ExchangeRequest request,
            HttpServletRequest http,
            HttpServletResponse response) {
        LoginResult result = oauth.exchange(request.code(), request.verifier());
        if (cookies.requested(http)) {
            var session = sessions.start(result.user().id(), cookies.read(http));
            cookies.set(response, session);
            result = session.login();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(com.swiftdrop.auth.dto.AuthDtos.ApiResponse.ok(result));
    }
}
