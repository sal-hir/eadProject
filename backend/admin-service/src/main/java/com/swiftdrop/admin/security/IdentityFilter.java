package com.swiftdrop.admin.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.admin.client.IdentityGateway;
import com.swiftdrop.admin.exception.ApiErrors;
import com.swiftdrop.admin.exception.ApiFailure;

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

    public IdentityFilter(
            IdentityGateway identities,
            ObjectMapper mapper
    ) {
        this.identities = identities;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

        // Skip mandatory Bearer check for health, info, and preflight requests
        boolean isPublicPath = request.getRequestURI().startsWith("/actuator/health")
                || request.getRequestURI().startsWith("/actuator/info")
                || request.getRequestURI().equals("/api/v1/info")
                || "OPTIONS".equals(request.getMethod());

        // Get Authorization header
        String header = request.getHeader("Authorization");

        if (header == null
                || !header.startsWith("Bearer ")
                || header.length() > 8192
                || header.length() <= 7) {

            if (isPublicPath) {
                chain.doFilter(request, response);
                return;
            }

            ApiErrors.write(
                    mapper,
                    response,
                    401,
                    "Authentication required"
            );
            return;
        }

        try {

            // Validate access token
            var caller = identities.validate(header.substring(7));

            // Create authenticated user
            var authentication =
                    UsernamePasswordAuthenticationToken.authenticated(
                            caller,
                            null,
                            List.of(
                                    new SimpleGrantedAuthority(
                                            "ROLE_" + caller.role()
                                    )
                            )
                    );

            // Set authentication in Security Context
            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

            // Continue request
            chain.doFilter(request, response);

        } catch (ApiFailure failure) {

            // Clear security context
            SecurityContextHolder.clearContext();

            // Return API error response
            ApiErrors.write(
                    mapper,
                    response,
                    failure.getStatus(),
                    failure.getMessage()
            );

        } catch (Exception e) {

            // Clear security context
            SecurityContextHolder.clearContext();

            // Return generic 503 error
            ApiErrors.write(
                    mapper,
                    response,
                    503,
                    "Authentication unavailable"
            );
        }
    }
}
