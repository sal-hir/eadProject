package com.swiftdrop.merchant.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.merchant.client.IdentityGateway;
import com.swiftdrop.merchant.exception.*;
import com.swiftdrop.merchant.service.ApiKeyService;
import com.swiftdrop.merchant.service.OAuthClientService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class IdentityFilter extends OncePerRequestFilter {

    private final IdentityGateway identities;
    private final ObjectMapper mapper;
    private final ApiKeyService keys;
    private final OAuthClientService oauth;

    public IdentityFilter(IdentityGateway identities, ObjectMapper mapper, ApiKeyService keys, OAuthClientService oauth) {
        this.identities = identities;
        this.mapper = mapper;
        this.keys = keys;
        this.oauth = oauth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        String method = request.getMethod();

        // Operations routes — enforce single Bearer, set no-store cache header
        if (uri.startsWith("/api/v1/merchants/operations/")) {
            response.setHeader("Cache-Control", "no-store");
            if (!"OPTIONS".equals(method) &&
                    (java.util.Collections.list(request.getHeaders("Authorization")).size() != 1
                            || request.getHeader("X-API-Key") != null)) {
                ApiErrors.write(mapper, response, 401, "A single browser Bearer token is required");
                return;
            }
        }

        // Public / pre-flight pass-through
        if (uri.startsWith("/actuator/health")
                || uri.equals("/api/v1/info")
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/swagger-ui")
                || uri.equals("/swagger-ui.html")
                || "OPTIONS".equals(method)) {
            chain.doFilter(request, response);
            return;
        }

        // OAuth token endpoint — no auth required
        if ("/api/v1/oauth/token".equals(uri) && "POST".equals(method)) {
            chain.doFilter(request, response);
            return;
        }

        // Merchant Orders routes — dual auth: API key OR OAuth Bearer with scope check
        if (uri.equals("/api/v1/merchant/orders") || uri.startsWith("/api/v1/merchant/orders/")) {
            response.setHeader("Cache-Control", "no-store");
            try {
                var apiHeaders = java.util.Collections.list(request.getHeaders("X-API-Key"));
                var bearerHeaders = java.util.Collections.list(request.getHeaders("Authorization"));
                java.util.UUID merchant;

                if (apiHeaders.size() == 1 && bearerHeaders.isEmpty()) {
                    // API key auth
                    merchant = keys.validate(apiHeaders.getFirst()).merchantId();
                } else if (apiHeaders.isEmpty()
                        && bearerHeaders.size() == 1
                        && bearerHeaders.getFirst().regionMatches(true, 0, "Bearer ", 0, 7)
                        && bearerHeaders.getFirst().length() <= 128) {
                    // OAuth Bearer auth with scope check
                    var identity = oauth.validate(bearerHeaders.getFirst().substring(7));
                    String scope = "POST".equals(method) ? "orders:write" : "merchant:read";
                    if (!identity.scopes().contains(scope)) {
                        response.setHeader("WWW-Authenticate",
                                "Bearer error=\"insufficient_scope\", scope=\"" + scope + "\"");
                        throw new ApiFailure(403, "Insufficient OAuth scope");
                    }
                    merchant = identity.merchantId();
                } else {
                    throw new ApiFailure(401, "Exactly one API key or OAuth Bearer token is required");
                }

                SecurityContextHolder.getContext().setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                merchant, null, List.of(new SimpleGrantedAuthority("ROLE_MERCHANT_ORDERS"))));
            } catch (ApiFailure failure) {
                if (failure.status() == 401 && request.getHeader("Authorization") != null)
                    response.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
                ApiErrors.write(mapper, response, failure.status(), failure.getMessage());
                return;
            } catch (org.springframework.dao.DataAccessException unavailable) {
                ApiErrors.write(mapper, response, 503, "Credential validation unavailable");
                return;
            }
            chain.doFilter(request, response);
            return;
        }

        // Merchant OAuth routes — Bearer token auth via OAuthClientService
        if (uri.startsWith("/api/v1/merchant-api/oauth/")) {
            try {
                var headers = java.util.Collections.list(request.getHeaders("Authorization"));
                if (headers.size() != 1
                        || !headers.getFirst().regionMatches(true, 0, "Bearer ", 0, 7)
                        || headers.getFirst().length() > 128
                        || request.getHeader("X-API-Key") != null)
                    throw new ApiFailure(401, "A single OAuth Bearer token is required");
                var identity = oauth.validate(headers.getFirst().substring(7));
                SecurityContextHolder.getContext().setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                identity, null, List.of(new SimpleGrantedAuthority("ROLE_MERCHANT_OAUTH"))));
            } catch (ApiFailure failure) {
                if (failure.status() == 401)
                    response.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
                ApiErrors.write(mapper, response, failure.status(), failure.getMessage());
                return;
            } catch (org.springframework.dao.DataAccessException unavailable) {
                ApiErrors.write(mapper, response, 503, "Token validation unavailable");
                return;
            }
            chain.doFilter(request, response);
            return;
        }

        // Merchant API routes — X-API-Key auth via ApiKeyService
        if (uri.startsWith("/api/v1/merchant-api/")) {
            try {
                var headers = java.util.Collections.list(request.getHeaders("X-API-Key"));
                if (headers.size() != 1 || request.getHeader("Authorization") != null)
                    throw new ApiFailure(401, "A single X-API-Key header is required");
                var identity = keys.validate(headers.getFirst());
                SecurityContextHolder.getContext().setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                identity, null, List.of(new SimpleGrantedAuthority("ROLE_MERCHANT_API"))));
            } catch (ApiFailure failure) {
                ApiErrors.write(mapper, response, failure.status(), failure.getMessage());
                return;
            } catch (org.springframework.dao.DataAccessException unavailable) {
                ApiErrors.write(mapper, response, 503, "Credential validation unavailable");
                return;
            }
            chain.doFilter(request, response);
            return;
        }

        // Default — standard Bearer token auth via IdentityGateway
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ") || header.length() > 8192) {
            ApiErrors.write(mapper, response, 401, "Authentication required");
            return;
        }
        try {
            var caller = identities.validate(header.substring(7));
            SecurityContextHolder.getContext().setAuthentication(
                    UsernamePasswordAuthenticationToken.authenticated(
                            caller, null, List.of(new SimpleGrantedAuthority("ROLE_" + caller.role()))));
        } catch (ApiFailure failure) {
            ApiErrors.write(mapper, response, failure.status(), failure.getMessage());
            return;
        }
        chain.doFilter(request, response);
    }
}
