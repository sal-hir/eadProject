package com.swiftdrop.admin.exception;

import com.swiftdrop.admin.exception.ApiErrors.ErrorBody;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Centralized exception handler for the admin-service.
 * Translates exceptions thrown within the MVC handler chain into consistent
 * {@link ErrorBody} responses with an HTTP status, human-readable message,
 * per-field validation errors, traceId, and timestamp.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ResponseEntity<ErrorBody> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiErrors.body(status.value(), message, Map.of()));
    }

    // ── Domain / business errors ─────────────────────────────────────────
    @ExceptionHandler(ApiFailure.class)
    public ResponseEntity<ErrorBody> domain(ApiFailure e) {
        HttpStatus status = HttpStatus.resolve(e.getStatus());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        return response(status, e.getMessage());
    }

    // ── 400 Bad Request ──────────────────────────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiErrors.body(400, "Invalid request", fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorBody> constraintViolation(ConstraintViolationException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getConstraintViolations().forEach(v -> {
            String path = v.getPropertyPath().toString();
            String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            fields.putIfAbsent(field, v.getMessage());
        });
        return ResponseEntity.badRequest().body(ApiErrors.body(400, "Invalid request parameter", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorBody> malformed() { return response(HttpStatus.BAD_REQUEST, "Invalid request body"); }

    @ExceptionHandler({org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
                       org.springframework.web.bind.MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorBody> parameters() { return response(HttpStatus.BAD_REQUEST, "Invalid request parameter"); }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorBody> missingHeader(MissingRequestHeaderException e) {
        return response(HttpStatus.BAD_REQUEST, "Missing required header: " + e.getHeaderName());
    }

    // ── 403 Forbidden ────────────────────────────────────────────────────
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> forbidden() { return response(HttpStatus.FORBIDDEN, "Access denied"); }

    // ── 404 Not Found ────────────────────────────────────────────────────
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorBody> missing() { return response(HttpStatus.NOT_FOUND, "Endpoint unavailable"); }

    // ── 405 Method Not Allowed ───────────────────────────────────────────
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorBody> method(HttpRequestMethodNotSupportedException e) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (e.getSupportedHttpMethods() != null && !e.getSupportedHttpMethods().isEmpty()) {
            builder.allow(e.getSupportedHttpMethods().toArray(new HttpMethod[0]));
        }
        return builder.body(ApiErrors.body(405, "HTTP method unavailable", Map.of()));
    }

    // ── 406 Not Acceptable ───────────────────────────────────────────────
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ErrorBody> notAcceptable() {
        return response(HttpStatus.NOT_ACCEPTABLE, "Requested media type is not supported");
    }

    // ── 409 Conflict ─────────────────────────────────────────────────────
    @ExceptionHandler({DataIntegrityViolationException.class,
                       org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ErrorBody> conflict() {
        return response(HttpStatus.CONFLICT, "Resource already exists or was concurrently modified");
    }

    // ── 415 Unsupported Media Type ───────────────────────────────────────
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorBody> mediaType() { return response(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Use application/json"); }

    // ── 500 Internal Server Error (catch-all) ────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> unexpected(Exception e) {
        ErrorBody body = ApiErrors.body(500, "Unexpected server error", Map.of());
        log.error("Unexpected request failure [traceId={}]", body.traceId(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
