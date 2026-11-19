package com.swiftdrop.auth.controller;

import com.swiftdrop.auth.dto.AuthDtos.ApiResponse;
import com.swiftdrop.auth.service.PasswordRecoveryService;
import com.swiftdrop.auth.security.SessionCookies;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/password")
@Tag(name = "Password Recovery", description = "Self-service password recovery, reset email dispatch, and secure token verification")
public class PasswordRecoveryController {
    public record Forgot(@NotBlank @Email @Size(max = 254) String email) {
        @Override
        public String toString() {
            return "Forgot[redacted]";
        }
    }

    public record Reset(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token,
            @NotBlank @Size(min = 8, max = 72) @Pattern(regexp = "[\\x20-\\x7E]+") String newPassword) {
        @Override
        public String toString() {
            return "Reset[redacted]";
        }
    }

    private final PasswordRecoveryService recovery;
    private final SessionCookies cookies;

    public PasswordRecoveryController(PasswordRecoveryService recovery, SessionCookies cookies) {
        this.recovery = recovery;
        this.cookies = cookies;
    }

    @PostMapping("/forgot")
    @Operation(summary = "Request password reset", description = "Sends a single-use password reset link to the registered email address.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid email format")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgot(@Valid @RequestBody Forgot request, HttpServletRequest http) {
        recovery.forgot(request.email(), http.getRemoteAddr());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(Map.of("message", PasswordRecoveryService.MESSAGE)));
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset password with token", description = "Validates the recovery token and sets a new password.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Password successfully reset"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid or expired recovery token, or invalid new password format")
    })
    public ResponseEntity<Void> reset(@Valid @RequestBody Reset request, HttpServletResponse response) {
        recovery.reset(request.token(), request.newPassword());
        cookies.clear(response);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
