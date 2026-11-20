
package com.swiftdrop.parcel.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.parcel.client.IdentityGateway;
import com.swiftdrop.parcel.exception.ApiErrors;
import com.swiftdrop.parcel.exception.ApiFailure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class IdentityFilter extends OncePerRequestFilter {

    private final IdentityGateway identities;
    private final ObjectMapper mapper;

    public IdentityFilter(IdentityGateway identities, ObjectMapper mapper) {
        this.identities = identities;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String path = request.getServletPath();

        return request.getMethod().equals("OPTIONS")
                || path.equals("/actuator/health")
                || path.startsWith("/actuator/health/")
                || path.startsWith("/api/v1/parcels/tracking/");
    }


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            ApiErrors.write(mapper, response, 401, "Authentication required");
            return;
        }

        String token = authorization.substring(7).trim();

        if (token.isEmpty()) {
            ApiErrors.write(mapper, response, 401, "Authentication required");
            return;
        }

        try {

            IdentityGateway.Caller caller = identities.validate(token);

            var authentication = UsernamePasswordAuthenticationToken.authenticated(
                    caller,
                    null,
                    List.of(new SimpleGrantedAuthority(
                            "ROLE_" + caller.role()
                    ))
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);

        } catch (ApiFailure exception) {

            SecurityContextHolder.clearContext();

            ApiErrors.write(mapper, response, exception.status(), exception.getMessage());

        } catch (Exception e) {

            SecurityContextHolder.clearContext();

            ApiErrors.write(mapper, response, 503, "Authentication unavailable");
        }
    }
}
