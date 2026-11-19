
package com.swiftdrop.dispatch_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class AuthClient {

    private final RestClient restClient;

    public AuthClient(
            @Value("${AUTH_SERVICE_URL:http://auth-service:4000}") String authServiceUrl) {

        this.restClient = RestClient.builder()
                .baseUrl(authServiceUrl)
                .build();
    }

    // Matches Auth Service Profile
    public record AuthUser(
            UUID id,
            String name,
            String email,
            String phone,
            String role,
            boolean active
    ) {}

    // Matches Auth Service UserPage
    public record UserPage(
            List<AuthUser> users,
            int page,
            long total,
            int pages
    ) {}

    // Matches Auth Service ApiResponse
    public record ApiResponse<T>(
            boolean success,
            T data
    ) {}

    // Keep the same fields currently expected by the Dispatch frontend.
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

    public List<CourierDto> getCouriers(String bearerToken) {

        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Valid Authorization Bearer token is required");
        }

        List<CourierDto> couriers = new ArrayList<>();

        int page = 0;
        int totalPages;

        do {
            final int currentPage = page;

            ApiResponse<UserPage> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/auth/admin/users")
                            .queryParam("page", currentPage)
                            .build())
                    .header("Authorization", bearerToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<UserPage>>() {});

            if (response == null || response.data() == null) {
                throw new IllegalStateException("Invalid response from Auth Service");
            }

            UserPage userPage = response.data();

            if (userPage.users() != null) {
                userPage.users().stream()
                        .filter(user -> "COURIER".equalsIgnoreCase(user.role()))
                        .filter(AuthUser::active)
                        .forEach(user -> couriers.add(new CourierDto(
                                user.id(),
                                user.id(),
                                user.name(),
                                user.phone(),
                                "NOT_SPECIFIED",
                                null,
                                true,
                                "NOT_ASSIGNED"
                        )));
            }

            totalPages = userPage.pages();
            page++;

        } while (page < totalPages);

        return couriers;
    }
}
