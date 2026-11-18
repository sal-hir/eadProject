package com.swiftdrop.merchant.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.merchant.client.IdentityGateway;
import com.swiftdrop.merchant.exception.ApiErrors;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.frontend-url}") String frontend) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(
                frontend,
                "http://localhost:4000", "http://127.0.0.1:4000",
                "http://localhost:3000", "http://127.0.0.1:3000",
                "http://localhost:4001"));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, IdentityGateway identities, ObjectMapper mapper) throws Exception {
        return http
                .cors(c -> {})
                .csrf(c -> c.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(c -> c.disable())
                .formLogin(c -> c.disable())
                .httpBasic(c -> c.disable())
                .logout(c -> c.disable())
                .addFilterBefore(new IdentityFilter(identities, mapper), UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a
                        .requestMatchers(
                                "/api/v1/info",
                                "/actuator/health", "/actuator/health/**",
                                "/v3/api-docs", "/v3/api-docs/**",
                                "/swagger-ui/**", "/swagger-ui.html")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/oauth/token").permitAll()
                        .requestMatchers("/api/v1/merchant-api/oauth/**").hasRole("MERCHANT_OAUTH")
                        .requestMatchers("/api/v1/merchants/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> ApiErrors.write(mapper, res, 401, "Authentication required"))
                        .accessDeniedHandler((req, res, ex) -> ApiErrors.write(mapper, res, 403, "Access denied")))
                .build();
    }
}
