package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.*;
import com.swiftdrop.auth.exception.ApiException;
import com.swiftdrop.auth.security.SessionCookies;
import com.swiftdrop.auth.service.BrowserSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Session Management", description = "Browser session token rotation, refresh session cookies, and logout revocation")
public class SessionController {
    private final BrowserSessionService sessions;
    private final SessionCookies cookies;

    public SessionController(BrowserSessionService sessions, SessionCookies cookies) {
        this.sessions = sessions;
        this.cookies = cookies;
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token session", description = "Rotates the HttpOnly refresh token cookie and returns a fresh JWT access token.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Missing, invalid, expired, or revoked refresh cookie")
    public ResponseEntity<ApiResponse<LoginResult>> refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            var result = sessions.rotate(cookies.read(request));
            cookies.set(response, result);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(result.login()));
        } catch (ApiException ex) {
            cookies.clear(response);
            throw ex;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke session", description = "Revokes the active refresh token family and clears the browser session cookie.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Session revoked and cookie cleared")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.revoke(cookies.read(request));
        cookies.clear(response);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
