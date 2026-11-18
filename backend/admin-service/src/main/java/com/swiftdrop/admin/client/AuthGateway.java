package com.swiftdrop.admin.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.swiftdrop.admin.exception.ApiFailure;

import java.net.URI;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class AuthGateway implements IdentityGateway {

    private final RestClient client;

    public AuthGateway(
            @Value("${app.auth-url}") String url
    ) {

        URI uri = URI.create(url);

        // Require HTTPS outside localhost
        if (!"https".equals(uri.getScheme())
                && !("http".equals(uri.getScheme())
                && Set.of("localhost", "127.0.0.1", "[::1]")
                .contains(uri.getHost()))) {

            throw new IllegalArgumentException(
                    "Auth Service communication requires HTTPS outside localhost"
            );
        }

        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(8));

        this.client = RestClient.builder()
                .baseUrl(url)
                .requestFactory(factory)
                .build();
    }

    // Validate JWT token using Auth Service
    @Override
    public Caller validate(String token) {

        try {

            JsonNode body = client.get()
                    .uri("/api/v1/auth/me")
                    .headers(headers -> headers.setBearerAuth(token))
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode profile = body == null
                    ? null
                    : body.path("data");

            if (profile == null
                    || !body.path("success").asBoolean()
                    || !profile.path("active").asBoolean()) {

                throw new ApiFailure(
                        401,
                        "Identity unavailable"
                );
            }

            return new Caller(
                    UUID.fromString(profile.path("id").asText()),
                    profile.path("role").asText()
            );

        } catch (RestClientResponseException e) {

            throw new ApiFailure(
                    e.getStatusCode().value() == 401 ? 401 : 503,
                    "Authentication unavailable"
            );

        } catch (RestClientException | IllegalArgumentException e) {

            throw new ApiFailure(
                    503,
                    "Authentication unavailable"
            );
        }
    }
}
