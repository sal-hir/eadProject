package com.swiftdrop.admin;

import com.swiftdrop.admin.client.IdentityGateway;
import com.swiftdrop.admin.exception.ApiFailure;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(InfoEndpointTest.TestConfig.class)
class InfoEndpointTest {

    @MockitoBean
    RabbitTemplate rabbitTemplate;

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        IdentityGateway fakeIdentity() {
            return token -> {
                throw new ApiFailure(401, "Invalid token");
            };
        }
    }

    @Autowired
    MockMvc mvc;

    @Test
    void infoEndpointIsPublicAndReturnsExpectedFields() throws Exception {
        mvc.perform(get("/api/v1/info"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.applicationName").value("admin-service"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.version").exists())
            .andExpect(jsonPath("$.apiVersion").value("v1"))
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void infoEndpointDoesNotLeakSensitiveData() throws Exception {
        String body = mvc.perform(get("/api/v1/info"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(body)
            .doesNotContain("jdbc:", "password", "secret", "token",
                    "apiKey", "host:", "127.0.0.1");
    }

    @Test
    void infoEndpointRejectsPost() throws Exception {
        mvc.perform(post("/api/v1/info"))
            .andExpect(status().isMethodNotAllowed());
    }
}