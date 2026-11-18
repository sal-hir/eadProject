
package com.swiftdrop.parcel.Security;

import com.swiftdrop.parcel.client.IdentityGateway;
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

    public IdentityFilter(IdentityGateway identities) {
        this.identities = identities;
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
            writeError(response, 401, "Authentication required");
            return;
        }

        String token = authorization.substring(7).trim();

        if (token.isEmpty()) {
            writeError(response, 401, "Authentication required");
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

            writeError(
                    response,
                    exception.status(),
                    exception.getMessage()
            );
        }
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String message
    ) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String safeMessage = message.replace("\\", "\\\\")
                .replace("\"", "\\\"");

        response.getWriter().write(
                "{\"success\":false,\"message\":\"" + safeMessage + "\"}"
        );
    }
}
