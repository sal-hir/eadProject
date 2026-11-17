
package com.swiftdrop.parcel.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.parcel.exception.ApiFailure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
public class PricingGateway {

    private final RestClient client;
    private final ObjectMapper objectMapper;

    public PricingGateway(
            @Value("${app.admin-url}") String adminUrl,
            ObjectMapper objectMapper
    ) {
        this.client = RestClient.builder()
                .baseUrl(adminUrl)
                .build();

        this.objectMapper = objectMapper;
    }

    public List<ZoneData> getZones(String token) {
        try {
            String response = client.get()
                    .uri("/api/v1/pricing/zones")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .body(String.class);

            return objectMapper.readValue(
                    response,
                    new TypeReference<List<ZoneData>>() {}
            );

        } catch (RestClientResponseException exception) {
            throw new ApiFailure(
                    exception.getStatusCode().value(),
                    "Unable to retrieve delivery zones"
            );
        } catch (Exception exception) {
            throw new ApiFailure(503, "Unable to retrieve delivery zones");
        }
    }

    public PricingData getPricingQuote(
            UUID zoneId,
            BigDecimal weightKg,
            String token
    ) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/pricing/quote")
                            .queryParam("zoneId", zoneId)
                            .queryParam("weightKg", weightKg)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .body(PricingData.class);

        } catch (RestClientResponseException exception) {
            throw new ApiFailure(
                    exception.getStatusCode().value(),
                    "Unable to calculate delivery price"
            );
        } catch (Exception exception) {
            throw new ApiFailure(503, "Unable to calculate delivery price");
        }
    }

    public record ZoneData(
            UUID id,
            String zoneName,
            String description,
            boolean active,
            Double latitude,
            Double longitude,
            Double radiusKm
    ) {}

    public record PricingData(
            UUID id,
            UUID zoneId,
            String zoneName,
            BigDecimal minWeight,
            BigDecimal maxWeight,
            BigDecimal deliveryFee,
            boolean active
    ) {}
}
