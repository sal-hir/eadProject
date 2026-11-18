package com.swiftdrop.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SwaggerOpenApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("Centralized Swagger UI redirect / endpoint is accessible without authentication")
    void swaggerUiIsAccessible() throws Exception {
        mvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is3xxRedirection());

        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML));
    }

    @Test
    @DisplayName("Swagger configuration returns all aggregated service URLs")
    void swaggerConfigContainsAggregatedServices() throws Exception {
        mvc.perform(get("/v3/api-docs/swagger-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urls", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.urls[*].name", hasItems(
                        containsString("Authentication"),
                        containsString("Merchant"),
                        containsString("Courier")
                )))
                .andExpect(jsonPath("$.urls[*].url", hasItems(
                        "/v3/api-docs",
                        "/v3/api-docs/services/merchant",
                        "/v3/api-docs/services/courier"
                )));
    }

    @Test
    @DisplayName("Auth service OpenAPI specification contains required metadata, tags, and JWT security")
    void authOpenApiSpecHasMetadataAndSecurity() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.openapi", notNullValue()))
                .andExpect(jsonPath("$.info.title", containsString("SwiftDrop")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type", is("http")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme", is("bearer")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.bearerFormat", is("JWT")))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/v1/auth/register'].post", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/v1/auth/me'].get", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/v1/info'].get", notNullValue()));
    }

    @Test
    @DisplayName("Unavailable downstream service returns 503 instead of false or empty documentation")
    void unavailableServiceReturns503() throws Exception {
        // Since merchant and tracking are not running in this test runner context,
        // the aggregation controller must return 503 Service Unavailable with an informative message.
        mvc.perform(get("/v3/api-docs/services/merchant"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status", is(503)))
                .andExpect(jsonPath("$.service", containsString("Merchant")));
    }
}
