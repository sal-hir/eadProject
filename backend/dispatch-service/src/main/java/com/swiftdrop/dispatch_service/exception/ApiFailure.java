package com.swiftdrop.dispatch_service.exception;

/**
 * Runtime exception representing a business-level API error with an explicit
 * HTTP status code. Caught by {@link GlobalExceptionHandler} and translated
 * into the standard error envelope.
 */
public class ApiFailure extends RuntimeException {

    private final int status;

    public ApiFailure(int status, String message) {
        super(message);
        this.status = status;
    }

    public int status() {
        return status;
    }
}
