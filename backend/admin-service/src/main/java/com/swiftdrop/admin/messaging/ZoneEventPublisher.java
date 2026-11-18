
package com.swiftdrop.admin.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.admin.entity.Zone;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class ZoneEventPublisher {

    private static final Logger log =
            LoggerFactory.getLogger(ZoneEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.messaging.zone-exchange}")
    private String exchange;

    @Value("${app.messaging.zone-routing-key}")
    private String routingKey;

    public ZoneEventPublisher(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    // Publish zone creation or update
    public void publishZone(String eventType, Zone zone) {

        try {
            Map<String, Object> event = new LinkedHashMap<>();

            event.put("eventType", eventType);
            event.put("zoneId", zone.getId());
            event.put("zoneName", zone.getZoneName());
            event.put("description", zone.getDescription());
            event.put("active", zone.isActive());
            event.put("latitude", zone.getLatitude());
            event.put("longitude", zone.getLongitude());
            event.put("radiusKm", zone.getRadiusKm());

            String message = objectMapper.writeValueAsString(event);

            rabbitTemplate.convertAndSend(
                    exchange,
                    routingKey,
                    message
            );

            log.info(
                    "Zone event published successfully. Type: {}, ID: {}",
                    eventType,
                    zone.getId()
            );

        } catch (JsonProcessingException exception) {

            throw new IllegalStateException(
                    "Failed to convert zone event to JSON",
                    exception
            );
        }
    }

    // Publish zone deletion
    public void publishZoneDeleted(UUID zoneId) {

        try {
            Map<String, Object> event = new LinkedHashMap<>();

            event.put("eventType", "DELETED");
            event.put("zoneId", zoneId);
            event.put("active", false);

            String message = objectMapper.writeValueAsString(event);

            rabbitTemplate.convertAndSend(
                    exchange,
                    routingKey,
                    message
            );

            log.info(
                    "Zone deletion event published successfully. ID: {}",
                    zoneId
            );

        } catch (JsonProcessingException exception) {

            throw new IllegalStateException(
                    "Failed to convert zone deletion event to JSON",
                    exception
            );
        }
    }
}
