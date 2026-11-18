
package com.swiftdrop.parcel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parcel_status_history", schema = "parcel")
@Getter
@NoArgsConstructor
public class ParcelStatusHistory {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "history_id", nullable = false, updatable = false)
    private UUID historyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parcel_id", nullable = false)
    private Parcel parcel;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "updated_by", nullable = false)
    private UUID updatedBy;

    @Column(name = "updated_by_role", nullable = false, length = 30)
    private String updatedByRole;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    public ParcelStatusHistory(
            Parcel parcel,
            String status,
            UUID updatedBy,
            String updatedByRole
    ) {
        this.parcel = parcel;
        this.status = status;
        this.updatedBy = updatedBy;
        this.updatedByRole = updatedByRole;
    }

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }
}
