package com.swiftdrop.tracking;

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
public class OpenApiEndpointTest {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("Tracking service exposes OpenAPI spec with public tracking and AI chat endpoints")
    void openApiSpecIsAccessible() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.openapi", notNullValue()))
                .andExpect(jsonPath("$.info.title", containsString("Tracking")))
                .andExpect(jsonPath("$.paths['/api/v1/tracking/{trackingNumber}'].get", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/v1/tracking/{trackingNumber}/stream'].get", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/v1/ai/chat'].post", notNullValue()));
    }

    @Test
    @DisplayName("Tracking service Swagger UI HTML loads successfully")
    void swaggerUiIsAccessible() throws Exception {
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML));
    }
}
