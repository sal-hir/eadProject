package com.swiftdrop.dispatch_service.repository;

import com.swiftdrop.dispatch_service.entity.Parcel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParcelRepository extends JpaRepository<Parcel, Long> {

    // 1. Unassigned parcels
    List<Parcel> findByCourierIdIsNull();

    Page<Parcel> findByCourierIdIsNull(Pageable pageable);

    // 2. Status අනුව Parcels සෙවීම (Pagination සමඟ)
    Page<Parcel> findByStatus(String status, Pageable pageable);

    // 3. Workload ගණනය කිරීමට
    long countByCourierIdAndStatusNotIn(String courierId, List<String> finishedStatuses);

    List<Parcel> findByCourierIdIsNotNullAndStatusNotIn(List<String> finishedStatuses);

    // 4. Specific Courier කෙනෙකුගේ Parcels සෙවීම
    List<Parcel> findByCourierId(String courierId);

    // Active Deliveries ගණන ගණනය කිරීම සඳහා (Workload Limit Validation)
    long countByCourierIdAndStatusIn(String courierId, List<String> statuses);

    boolean existsBySourceParcelId(String sourceParcelId);

    boolean existsByTrackingNumber(String trackingNumber);

}