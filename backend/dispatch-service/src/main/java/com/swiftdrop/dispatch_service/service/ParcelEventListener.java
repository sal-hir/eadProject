package com.swiftdrop.dispatch_service.service;

import com.swiftdrop.dispatch_service.entity.Parcel;
import com.swiftdrop.dispatch_service.repository.ParcelRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ParcelEventListener {

    private final ParcelRepository parcelRepository;

    public ParcelEventListener(ParcelRepository parcelRepository) {
        this.parcelRepository = parcelRepository;
    }

    @RabbitListener(queues = "dispatch.parcel.created.queue")
    public void handleParcelCreated(Map<String, Object> eventData) {
        try {
            Long parcelId = Long.valueOf(eventData.get("id").toString());

            // Duplicate වැළැක්වීමට check කිරීම
            if (parcelRepository.existsById(parcelId)) {
                return;
            }

            Parcel parcel = new Parcel();
            parcel.setId(parcelId);
            parcel.setStatus((String) eventData.getOrDefault("status", "CREATED"));
            parcel.setCourierId(null); // අලුත් parcel එකක් නිසා unassigned (courierId = null)

            parcelRepository.save(parcel);
            System.out.println("Successfully synced new parcel (ID: " + parcelId + ") to Dispatch Service database!");

        } catch (Exception e) {
            System.err.println("Error processing parcel event: " + e.getMessage());
        }
    }
}