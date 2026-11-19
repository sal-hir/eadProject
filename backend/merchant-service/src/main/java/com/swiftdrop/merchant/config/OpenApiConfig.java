package com.swiftdrop.merchant.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI merchantOpenAPI(
            @Value("${app.swagger.server-url:http://localhost:4001}") String serverUrl,
            @Value("${info.app.version:0.1.0}") String version) {
        return new OpenAPI()
                .info(new Info()
                        .title("SwiftDrop Merchant Management Service API")
                        .description("Manages merchant business applications, onboarding verification workflows, approval/rejection lifecycle, and merchant profiles.")
                        .version(version)
                        .contact(new Contact().name("SwiftDrop Merchant Operations").email("merchants@swiftdrop.com"))
                        .license(new License().name("Proprietary").url("https://swiftdrop.com/terms")))
                .servers(List.of(
                        new Server().url(serverUrl).description("Merchant Service (Direct / Local)"),
                        new Server().url("http://localhost:4001").description("Merchant Service Localhost Port 4001")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter the JWT Bearer access token issued by Auth Service")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
