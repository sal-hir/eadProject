package com.swiftdrop.admin.messaging;

import com.swiftdrop.admin.dto.ParcelAnalyticsEvent;
import com.swiftdrop.admin.entity.ParcelAnalytics;
import com.swiftdrop.admin.repository.ParcelAnalyticsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ParcelAnalyticsConsumer {

    private final ParcelAnalyticsRepository repository;

    @RabbitListener(
            queues = "${app.messaging.parcel-analytics-queue}"
    )
    @Transactional
    public void receiveParcelEvent(ParcelAnalyticsEvent event) {

        log.info(
                "Received parcel event: {} for parcel: {}",
                event.eventType(),
                event.parcelId()
        );

        if (event.parcelId() == null ||
                event.currentStatus() == null ||
                event.currentStatus().isBlank() ||
                event.createdAt() == null) {

            throw new IllegalArgumentException(
                    "Parcel event is missing required information"
            );
        }

        ParcelAnalytics parcel = repository
                .findById(event.parcelId())
                .orElseGet(ParcelAnalytics::new);

        parcel.setParcelId(event.parcelId());
        parcel.setCurrentStatus(event.currentStatus());
        parcel.setCreatedAt(event.createdAt());
        parcel.setDeliveredAt(event.deliveredAt());

        repository.save(parcel);

        log.info(
                "Parcel analytics saved successfully: {}",
                event.parcelId()
        );
    }
}