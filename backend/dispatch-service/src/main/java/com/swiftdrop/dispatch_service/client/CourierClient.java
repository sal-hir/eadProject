package com.swiftdrop.dispatch_service.client;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
public class CourierClient {

    private final RestClient restClient;

    public CourierClient(@Value("${COURIER_SERVICE_URL:http://courier-service:4003}") String courierServiceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(courierServiceUrl)
                .build();
    }

    public record CourierDto(
            UUID id,
            UUID userId,
            String name,
            String phone,
            String vehicleType,
            String licenseNo,
            Boolean isAvailable,
            String zone
    ) {}

    public record CourierListResponse(
            boolean success,
            List<CourierDto> data
    ) {}

    public List<CourierDto> getAvailableCouriers(String bearerToken) {
        try {
            CourierListResponse response = restClient.get()
                    .uri("/api/v1/couriers")
                    .header("Authorization", bearerToken)
                    .retrieve()
                    .body(CourierListResponse.class);

            return (response != null && response.data() != null)
                    ? response.data()
                    : Collections.emptyList();
        } catch (Exception e) {
            System.err.println("Error fetching couriers from courier-service: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}
