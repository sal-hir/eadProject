
package com.swiftdrop.parcel.repository;

import com.swiftdrop.parcel.entity.Parcel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParcelRepository extends JpaRepository<Parcel, UUID> {

    Optional<Parcel> findByTrackingNumber(String trackingNumber);

    List<Parcel> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<Parcel> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId);
}
