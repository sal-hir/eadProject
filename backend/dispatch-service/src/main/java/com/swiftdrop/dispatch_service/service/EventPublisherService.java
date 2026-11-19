package com.swiftdrop.dispatch_service.service;

import com.swiftdrop.dispatch_service.config.RabbitMQConfig;
import com.swiftdrop.dispatch_service.dto.ParcelStatusEvent;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class EventPublisherService {

    private final RabbitTemplate rabbitTemplate;

    public EventPublisherService(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishParcelStatusEvent(String parcelId, String trackingNumber, String status, String courierId,
            String pickupAddress, String dropoffAddress) {
        ParcelStatusEvent event = new ParcelStatusEvent(
                parcelId,
                trackingNumber,
                status,
                courierId,
                pickupAddress,
                dropoffAddress,
                LocalDateTime.now().toString());

        // RabbitMQConfig එකේ තියෙන constants මෙතනට හරියටම match කරන්න
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.PARCEL_EXCHANGE,
                "parcel.assigned", // හෝ RabbitMQConfig එකේ routing key එක
                event);

        System.out.println("Published Event to RabbitMQ: " + event);
    }

}