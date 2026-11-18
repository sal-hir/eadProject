package com.swiftdrop.parcel.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.swiftdrop.parcel.exception.ApiFailure;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class AuthGateway implements IdentityGateway {

    private final RestClient client;

    public AuthGateway(@Value("${app.auth-url}") String url) {

        URI uri = URI.create(url);

        boolean isLocalOrInternal = Set.of("localhost", "127.0.0.1", "[::1]", "auth-service").contains(uri.getHost())
                || !uri.getHost().contains(".");

        if (!"https".equals(uri.getScheme())
                && !("http".equals(uri.getScheme()) && isLocalOrInternal)) {

            throw new IllegalArgumentException(
                    "Auth Service communication requires HTTPS outside localhost"
            );
        }

        var factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(3))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build()
        );

        factory.setReadTimeout(Duration.ofSeconds(8));

        this.client = RestClient.builder()
                .baseUrl(url)
                .requestFactory(factory)
                .build();
    }

    @Override
    public Caller validate(String token) {

        try {

            JsonNode body = client.get()
                    .uri("/api/v1/auth/me")
                    .headers(headers -> headers.setBearerAuth(token))
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode profile = body == null ? null : body.path("data");

            if (profile == null
                    || !body.path("success").asBoolean()
                    || !profile.path("active").asBoolean()) {

                throw new ApiFailure(401, "Identity unavailable");
            }

            return new Caller(
                    UUID.fromString(profile.path("id").asText()),
                    profile.path("role").asText()
            );

        } catch (RestClientResponseException exception) {

            throw new ApiFailure(
                    exception.getStatusCode().value() == 401 ? 401 : 503,
                    "Authentication unavailable"
            );

        } catch (RestClientException | IllegalArgumentException exception) {

            throw new ApiFailure(503, "Authentication unavailable");
        }
    }
}
