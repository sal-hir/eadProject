
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built Spring Boot application
COPY target/*.jar app.jar

# Run as a non-root user
RUN useradd --system --uid 1001 appuser
USER appuser

EXPOSE 4009

ENTRYPOINT ["java", "-jar", "app.jar"]
