package com.swiftdrop.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parcel_analytics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParcelAnalytics {

    @Id
    @Column(name = "parcel_id", nullable = false)
    private UUID parcelId;

    @Column(name = "current_status", nullable = false)
    private String currentStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;
}