package com.swiftdrop.parcel;

import com.swiftdrop.parcel.client.IdentityGateway;
import com.swiftdrop.parcel.exception.ApiFailure;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InfoEndpointTest {

    @MockitoBean
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class MockIdentityConfig {

        @Bean
        @Primary
        IdentityGateway mockIdentityGateway() {
            return token -> {
                throw new ApiFailure(401, "Invalid token");
            };
        }
    }

    @Test
    void infoEndpointIsPublicAndReturnsExpectedFields() throws Exception {
        mockMvc.perform(get("/api/v1/info").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.applicationName").value("parcel-service"))
                .andExpect(jsonPath("$.apiVersion").value("v1"))
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void infoEndpointDoesNotLeakSensitiveData() throws Exception {
        String body = mockMvc.perform(get("/api/v1/info").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String[] forbidden = {"jdbc:", "password", "secret", "token", "apiKey", "host:", "127.0.0.1"};
        for (String term : forbidden) {
            if (body.contains(term)) {
                throw new AssertionError("Response body contains sensitive term: " + term);
            }
        }
    }

    @Test
    void infoEndpointRejectsPost() throws Exception {
        mockMvc.perform(post("/api/v1/info").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isMethodNotAllowed());
    }
}