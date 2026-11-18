package com.swiftdrop.dispatch_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourierWorkloadResponse {
    private String courierId;
    private long activeDeliveriesCount;
}