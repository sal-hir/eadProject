
package com.swiftdrop.dispatch_service.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ParcelSyncResponse {

    private String parcelId;
    private String trackingNumber;
    private String currentStatus;
    private String pickupAddress;
    private String dropoffAddress;
    private Double estimatedFee;
}
