package com.swiftdrop.admin.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.admin.client.IdentityGateway;
import com.swiftdrop.admin.exception.ApiErrors;
import org.springframework.http.HttpMethod;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.frontend-url:http://localhost:3000}") String frontend
    ) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(frontend, "http://localhost:3000", "http://127.0.0.1:3000"));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        cors.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    @Bean
    SecurityFilterChain security(
            HttpSecurity http,
            IdentityGateway identities,
            ObjectMapper mapper
    ) throws Exception {

        return http
                .cors(c -> {})
                .csrf(c -> c.disable())
                .sessionManagement(s ->
                        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .requestCache(c -> c.disable())
                .formLogin(c -> c.disable())
                .httpBasic(c -> c.disable())
                .logout(c -> c.disable())

                .addFilterBefore(
                        new IdentityFilter(identities, mapper),
                        UsernamePasswordAuthenticationFilter.class
                )

                .authorizeHttpRequests(a -> a
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info"
                        ).permitAll()
                        .requestMatchers(
                                "/actuator/metrics",
                                "/actuator/metrics/**"
                        ).hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/zones").authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/admin/pricing/quote"
                                ).authenticated()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )

                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                ApiErrors.write(mapper, res, 401, "Authentication required")
                        )
                        .accessDeniedHandler((req, res, ex) ->
                                ApiErrors.write(mapper, res, 403, "Access denied")
                        )
                )

                .build();
    }
}
