package com.swiftdrop.parcel.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ParcelEventPublisher {

    private static final String EXCHANGE = "swiftdrop.parcel.exchange";

    private final RabbitTemplate rabbitTemplate;

    public ParcelEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // 1. Publish parcel created event
    public void publishParcelCreated(
            UUID parcelId,
            String trackingNumber,
            String status,
            String pickupAddress,
            String dropoffAddress) {

        Map<String, Object> eventData = new HashMap<>();

        eventData.put("eventType", "PARCEL_CREATED");
        eventData.put("id", parcelId.toString());
        eventData.put("trackingNumber", trackingNumber);
        eventData.put("status", status != null ? status : "CREATED");
        eventData.put("pickupAddress", pickupAddress);
        eventData.put("dropoffAddress", dropoffAddress);

        rabbitTemplate.convertAndSend(
                EXCHANGE,
                "parcel.created",
                eventData);

        System.out.println(
                "Published Parcel Created Event: " + parcelId);
    }

    // 2. Publish parcel status updated event
    public void publishParcelStatusUpdated(
            UUID parcelId,
            String trackingNumber,
            String status,
            UUID courierId) {

        Map<String, Object> eventData = new HashMap<>();

        eventData.put("eventType", "PARCEL_STATUS_UPDATED");
        eventData.put("id", parcelId.toString());
        eventData.put("trackingNumber", trackingNumber);
        eventData.put("status", status);

        if (courierId != null) {
            eventData.put("courierId", courierId.toString());
        }

        rabbitTemplate.convertAndSend(
                EXCHANGE,
                "parcel.status.updated",
                eventData);

        System.out.println(
                "Published Parcel Status Updated Event: "
                        + parcelId
                        + " | Status: "
                        + status);
    }
}