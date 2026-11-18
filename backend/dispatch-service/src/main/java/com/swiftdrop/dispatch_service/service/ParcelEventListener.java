package com.swiftdrop.dispatch_service.service;

import com.swiftdrop.dispatch_service.entity.Parcel;
import com.swiftdrop.dispatch_service.repository.ParcelRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class ParcelEventListener {

    private final ParcelRepository parcelRepository;

    public ParcelEventListener(ParcelRepository parcelRepository) {
        this.parcelRepository = parcelRepository;
    }

    @RabbitListener(queues = "dispatch.parcel.created.queue")
    public void handleParcelEvent(Map<String, Object> eventData) {

        String sourceParcelId = getString(eventData, "id");

        if (sourceParcelId == null || sourceParcelId.isBlank()) {
            throw new IllegalArgumentException("Parcel ID is missing from RabbitMQ event");
        }

        String trackingNumber = getString(eventData, "trackingNumber");
        String status = getString(eventData, "status");
        String eventType = getString(eventData, "eventType");

        Optional<Parcel> existingParcel = parcelRepository.findBySourceParcelId(sourceParcelId);

        Parcel parcel;

        if (existingParcel.isPresent()) {
            // Update the existing Dispatch record
            parcel = existingParcel.get();

        } else {
            // Create a new Dispatch record
            parcel = new Parcel();
            parcel.setSourceParcelId(sourceParcelId);
            parcel.setTrackingNumber(trackingNumber);

            // Do not set the Long ID.
            // Dispatch database generates its own ID.
        }

        // Update tracking number when supplied
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            parcel.setTrackingNumber(trackingNumber);
        }

        if ("PARCEL_STATUS_UPDATED".equals(eventType)) {

            // Update status when Parcel Service sends a status event
            if (status != null) {
                parcel.setStatus(status);
            }

            // Update courier ID when provided
            String courierId = getString(eventData, "courierId");

            if (courierId != null) {
                parcel.setCourierId(courierId);
            }

        } else {

            // Parcel created event
            // Do not overwrite an existing status with CREATED.
            if (existingParcel.isEmpty()) {
                parcel.setStatus(
                        status != null ? status : "CREATED");
                parcel.setCourierId(null);
            }

            String pickupAddress = getString(eventData, "pickupAddress");
            String dropoffAddress = getString(eventData, "dropoffAddress");

            if (pickupAddress != null) {
                parcel.setPickupAddress(pickupAddress);
            }

            if (dropoffAddress != null) {
                parcel.setDropoffAddress(dropoffAddress);
            }
        }

        parcelRepository.save(parcel);

        System.out.println(
                "Successfully processed parcel event. Parcel ID: "
                        + sourceParcelId
                        + ", Status: "
                        + parcel.getStatus());
    }

    private String getString(Map<String, Object> eventData, String key) {

        Object value = eventData.get(key);

        return value != null ? value.toString() : null;
    }
}