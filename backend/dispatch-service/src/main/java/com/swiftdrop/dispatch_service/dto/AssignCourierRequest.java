package com.swiftdrop.dispatch_service.dto;

import lombok.Data;

@Data
public class AssignCourierRequest {
    private Long parcelId;
    private String courierId;
}
