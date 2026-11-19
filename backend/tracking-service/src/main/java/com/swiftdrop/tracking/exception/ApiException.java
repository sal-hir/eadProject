package com.swiftdrop.tracking.exception;

import org.springframework.http.HttpStatus;

/**
 * Domain exception for the tracking-service.
 * Carry an HTTP status code and a human-readable message; handled by
 * {@link GlobalExceptionHandler} to produce a consistent error response.
 */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
