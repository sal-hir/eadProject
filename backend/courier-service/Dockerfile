FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads
COPY --chown=app:app target/*.jar app.jar
USER app
EXPOSE 4003
VOLUME ["/app/uploads"]
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
