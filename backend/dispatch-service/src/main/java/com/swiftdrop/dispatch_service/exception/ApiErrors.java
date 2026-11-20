package com.swiftdrop.dispatch_service.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Static utility for writing a standard JSON error body directly to a servlet
 * response — used by security filters that run outside the MVC handler chain.
 * The {@link GlobalExceptionHandler} is responsible for all in-MVC exceptions.
 */
public final class ApiErrors {
    private ApiErrors() {}

    /** Standard error response body returned by every API error. */
    public record ErrorBody(boolean success, int status, String message,
                            Map<String, String> errors, String traceId, Instant timestamp) {}

    public static ErrorBody body(int status, String message, Map<String, String> errors) {
        return new ErrorBody(false, status, message, errors, UUID.randomUUID().toString(), Instant.now());
    }

    /** Writes a JSON error body directly to the servlet response (for use in filters). */
    public static void write(ObjectMapper mapper, HttpServletResponse response,
                             int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), body(status, message, Map.of()));
    }
}
