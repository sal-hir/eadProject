
package com.swiftdrop.admin.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.admin.entity.PricingRate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PricingEventPublisher {

    private static final Logger log =
            LoggerFactory.getLogger(PricingEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.messaging.pricing-exchange}")
    private String exchange;

    @Value("${app.messaging.pricing-routing-key}")
    private String routingKey;

    public PricingEventPublisher(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishPricing(String eventType, PricingRate pricing) {

        try {
            Map<String, Object> event = new LinkedHashMap<>();

            event.put("eventType", eventType);
            event.put("pricingId", pricing.getId());
            event.put("zoneId", pricing.getZone().getId());
            event.put("zoneName", pricing.getZone().getZoneName());
            event.put("minWeight", pricing.getMinWeight());
            event.put("maxWeight", pricing.getMaxWeight());
            event.put("deliveryFee", pricing.getDeliveryFee());
            event.put("active", pricing.isActive());

            String message = objectMapper.writeValueAsString(event);

            rabbitTemplate.convertAndSend(
                    exchange,
                    routingKey,
                    message
            );

            log.info(
                    "Pricing event published successfully. Type: {}, ID: {}",
                    eventType,
                    pricing.getId()
            );

        } catch (JsonProcessingException exception) {

            throw new IllegalStateException(
                    "Failed to convert pricing event to JSON",
                    exception
            );
        }
    }
}
