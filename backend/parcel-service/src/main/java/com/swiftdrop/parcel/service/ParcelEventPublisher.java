package com.swiftdrop.parcel.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ParcelEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public ParcelEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishParcelCreated(UUID parcelId, String trackingNumber, String status, String pickupAddress,
            String dropoffAddress) {
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("id", parcelId);
        eventData.put("trackingNumber", trackingNumber);
        eventData.put("status", status != null ? status : "CREATED");
        eventData.put("pickupAddress", pickupAddress);
        eventData.put("dropoffAddress", dropoffAddress);

        rabbitTemplate.convertAndSend(
                "swiftdrop.parcel.exchange",
                "parcel.created",
                eventData);
        System.out.println("Published Parcel Created Event for ID: " + parcelId);
    }
}