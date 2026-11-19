package com.swiftdrop.dispatch_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParcelStatusEvent implements Serializable {
    private String parcelId;      // UUID එක string එකක් ලෙස ලැබෙන නිසා String ලෙස තැබීම ආරක්ෂිතයි
    private String trackingNumber;
    private String status;        // උදා: "CREATED", "ASSIGNED"
    private String courierId;     
    private String pickupAddress;
    private String dropoffAddress;
    private String timestamp;
}