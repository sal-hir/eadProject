package com.swiftdrop.auth.config;

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
    public OpenAPI authOpenAPI(
            @Value("${app.swagger.server-url:http://localhost:4000}") String serverUrl,
            @Value("${info.app.version:0.1.0}") String version) {
        return new OpenAPI()
                .info(new Info()
                        .title("SwiftDrop Authentication & Identity Service API")
                        .description("Centralized authentication, user registration, JWT token issuance, OAuth2 social login, password recovery, session lifecycle, and administrative user management for the SwiftDrop Logistics Platform.")
                        .version(version)
                        .contact(new Contact().name("SwiftDrop Engineering Team").email("dev@swiftdrop.com"))
                        .license(new License().name("Proprietary").url("https://swiftdrop.com/terms")))
                .servers(List.of(
                        new Server().url(serverUrl).description("Auth Service (Direct / Local)"),
                        new Server().url("http://localhost:4000").description("Auth Service Localhost Port 4000")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter the JWT Bearer access token issued by POST /api/v1/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
