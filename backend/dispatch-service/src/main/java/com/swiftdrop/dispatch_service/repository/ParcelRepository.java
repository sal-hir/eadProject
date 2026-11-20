package com.swiftdrop.dispatch_service.repository;

import com.swiftdrop.dispatch_service.entity.Parcel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParcelRepository extends JpaRepository<Parcel, Long> {

    // 1. Unassigned parcels
    List<Parcel> findByCourierIdIsNull();

    Page<Parcel> findByCourierIdIsNull(Pageable pageable);
    Page<Parcel> findAllByOrderByCreatedAtDesc(Pageable pageable);
    // 2. Search parcels by status (with pagination)
    Page<Parcel> findByStatus(String status, Pageable pageable);

    // 3. Calculate courier workload
    long countByCourierIdAndStatusNotIn(
            String courierId,
            List<String> finishedStatuses
    );

    List<Parcel> findByCourierIdIsNotNullAndStatusNotIn(
            List<String> finishedStatuses
    );

    // 4. Find parcels belonging to a specific courier
    List<Parcel> findByCourierId(String courierId);

    // Active deliveries count (workload limit validation)
    long countByCourierIdAndStatusIn(
            String courierId,
            List<String> statuses
    );

    // Existing duplicate checks
    boolean existsBySourceParcelId(String sourceParcelId);

    boolean existsByTrackingNumber(String trackingNumber);

    // Find parcel using the original Parcel Service UUID
    Optional<Parcel> findBySourceParcelId(String sourceParcelId);

    // Analytics: count parcels by status
    long countByStatusIgnoreCase(String status);
}