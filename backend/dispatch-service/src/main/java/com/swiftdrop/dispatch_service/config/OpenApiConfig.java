package com.swiftdrop.dispatch_service.config;

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
    public OpenAPI dispatchOpenAPI(
            @Value("${app.swagger.server-url:http://localhost:8080}") String serverUrl,
            @Value("${info.app.version:0.0.1-SNAPSHOT}") String version) {
        return new OpenAPI()
                .info(new Info()
                        .title("SwiftDrop Dispatch Service API")
                        .description("Parcel dispatch assignment, courier allocation, analytics, and delivery workflow management for the SwiftDrop Logistics Platform.")
                        .version(version)
                        .contact(new Contact().name("SwiftDrop Engineering Team").email("dev@swiftdrop.com"))
                        .license(new License().name("Proprietary").url("https://swiftdrop.com/terms")))
                .servers(List.of(
                        new Server().url(serverUrl).description("Dispatch Service (Direct / Local)"),
                        new Server().url("http://localhost:8080").description("Dispatch Service Localhost Port 8080")
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
