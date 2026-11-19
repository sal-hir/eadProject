package com.swiftdrop.parcel.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.swiftdrop.parcel.exception.ApiFailure;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@ConditionalOnProperty(name = "app.merchant-url", matchIfMissing = false)
public class MerchantGateway {

    private final RestClient client;

    public MerchantGateway(@Value("${app.merchant-url}") String url) {

        URI uri = URI.create(url);

        boolean isLocalOrInternal = Set.of("localhost", "127.0.0.1", "[::1]", "merchant-service").contains(uri.getHost())
                || !uri.getHost().contains(".");

        if (!"https".equals(uri.getScheme())
                && !("http".equals(uri.getScheme()) && isLocalOrInternal)) {

            throw new IllegalArgumentException(
                    "Merchant Service communication requires HTTPS outside localhost"
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

    public UUID getApprovedMerchantId(String token, UUID expectedUserId) {

        try {

            JsonNode body = client.get()
                    .uri("/api/v1/merchants/profile")
                    .headers(headers -> headers.setBearerAuth(token))
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode profile = body == null ? null : body.path("data");

            if (profile == null || !body.path("success").asBoolean()) {
                throw new ApiFailure(503, "Merchant profile unavailable");
            }

            UUID merchantId = UUID.fromString(
                    profile.path("id").asText()
            );

            UUID userId = UUID.fromString(
                    profile.path("userId").asText()
            );

            String status = profile.path("status").asText();

            if (!userId.equals(expectedUserId)
                    || !"APPROVED".equals(status)) {

                throw new ApiFailure(
                        403,
                        "An approved merchant profile is required"
                );
            }

            return merchantId;

        } catch (RestClientResponseException exception) {

            int status = exception.getStatusCode().value();

            if (status == 401) {
                throw new ApiFailure(401, "Authentication required");
            }

            if (status == 403) {
                throw new ApiFailure(403, "Approved merchant access required");
            }

            throw new ApiFailure(503, "Merchant Service unavailable");

        } catch (RestClientException | IllegalArgumentException exception) {

            throw new ApiFailure(503, "Merchant Service unavailable");
        }
    }
}
