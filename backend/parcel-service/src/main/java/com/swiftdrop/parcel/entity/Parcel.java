
package com.swiftdrop.parcel.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parcels", schema = "parcel")
@Getter
@Setter
@NoArgsConstructor
public class Parcel {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "parcel_id", nullable = false, updatable = false)
    private UUID parcelId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "merchant_id")
    private UUID merchantId;

    @Column(name = "assigned_courier_id")
    private UUID assignedCourierId;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(name = "dropoff_address", nullable = false, columnDefinition = "TEXT")
    private String dropoffAddress;
    //added
    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(name = "sender_phone", nullable = false, length = 10)
    private String senderPhone;

    @Column(name = "receiver_name", nullable = false, length = 100)
    private String receiverName;

    @Column(name = "receiver_phone", nullable = false, length = 10)
    private String receiverPhone;

    @Column(name = "parcel_description", nullable = false, length = 500)
    private String parcelDescription; //end

    @Column(name = "pickup_zone_id", nullable = false)
    private UUID pickupZoneId;

    @Column(name = "dropoff_zone_id", nullable = false)
    private UUID dropoffZoneId;

    @Column(name = "pricing_id", nullable = false)
    private UUID pricingId;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 30)
    private String trackingNumber;

    @Column(name = "current_status", nullable = false, length = 30)
    private String currentStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "estimated_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedFee;

    @Column(name = "weight_kg", nullable = false, precision = 8, scale = 3)
    private BigDecimal weightKg;

    @Column(name = "fragile", nullable = false)
    private boolean fragile;

    @Column(name = "delivery_priority", nullable = false, length = 20)
    private String deliveryPriority;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
