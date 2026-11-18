package com.swiftdrop.tracking.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI trackingOpenAPI(
            @Value("${app.swagger.server-url:http://localhost:4004}") String serverUrl,
            @Value("${info.app.version:0.1.0}") String version) {
        return new OpenAPI()
                .info(new Info()
                        .title("SwiftDrop Real-Time Tracking & AI Assistant Service API")
                        .description("Real-time parcel tracking timeline, live Server-Sent Events (SSE) updates, courier status event ingestion, and GenAI Delivery Assistant chatbot.")
                        .version(version)
                        .contact(new Contact().name("SwiftDrop Tracking Operations").email("support@swiftdrop.com"))
                        .license(new License().name("Proprietary").url("https://swiftdrop.com/terms")))
                .servers(List.of(
                        new Server().url(serverUrl).description("Tracking Service (Direct / Local)"),
                        new Server().url("http://localhost:4004").description("Tracking Service Port 4004"),
                        new Server().url("http://localhost:4003").description("Tracking Service Alternate Port 4003")
                ));
    }
}
