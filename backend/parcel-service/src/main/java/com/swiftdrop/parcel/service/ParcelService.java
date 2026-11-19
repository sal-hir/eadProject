
package com.swiftdrop.parcel.service;

import com.swiftdrop.parcel.client.IdentityGateway;
import com.swiftdrop.parcel.client.MerchantGateway;
import com.swiftdrop.parcel.dto.ParcelBookingRequest;
import com.swiftdrop.parcel.dto.ParcelResponse;
import com.swiftdrop.parcel.dto.ParcelStatusHistoryItem;
import com.swiftdrop.parcel.dto.ParcelTrackingResponse;
import com.swiftdrop.parcel.entity.Parcel;
import com.swiftdrop.parcel.entity.ParcelStatus;
import com.swiftdrop.parcel.entity.ParcelStatusHistory;
import com.swiftdrop.parcel.repository.ParcelRepository;

import com.swiftdrop.parcel.repository.ParcelStatusHistoryRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParcelService {

    private final ParcelRepository parcelRepository;
    private final MerchantGateway merchantGateway;
    private final ParcelPricingService parcelPricingService;
    private final ParcelStatusHistoryRepository statusHistoryRepository;

    @Transactional
    public ParcelResponse createParcel(
            ParcelBookingRequest request,
            IdentityGateway.Caller caller,
            String token
    ) {

        var quote = parcelPricingService.calculateQuote(
                new com.swiftdrop.parcel.dto.ParcelQuoteRequest(
                        request.pickupZoneId(),
                        request.dropoffZoneId(),
                        request.weightKg()
                ),
                token
        );

        Parcel parcel = new Parcel();

        if ("CUSTOMER".equalsIgnoreCase(caller.role())) {

            parcel.setCustomerId(caller.id());
            parcel.setMerchantId(null);

        } else if ("MERCHANT".equalsIgnoreCase(caller.role())) {

            UUID merchantId = merchantGateway.getApprovedMerchantId(
                    token,
                    caller.id()
            );

            parcel.setMerchantId(merchantId);
            parcel.setCustomerId(null);

        } else {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your role cannot create parcel bookings"
            );
        }

        parcel.setPickupAddress(request.pickupAddress());
        parcel.setDropoffAddress(request.dropoffAddress());

        //added
        parcel.setSenderName(request.senderName());
        parcel.setSenderPhone(request.senderPhone());

        parcel.setReceiverName(request.receiverName());
        parcel.setReceiverPhone(request.receiverPhone());

        parcel.setParcelDescription(request.parcelDescription());//

        parcel.setPickupZoneId(request.pickupZoneId());
        parcel.setDropoffZoneId(request.dropoffZoneId());

        parcel.setPricingId(quote.pricingId());
        //changed
        BigDecimal finalFee = quote.estimatedFee();

        if ("EXPRESS".equals(request.deliveryPriority())) {
            finalFee = finalFee.add(new BigDecimal("200.00"));
        }

        parcel.setEstimatedFee(finalFee);
        parcel.setWeightKg(request.weightKg());
        parcel.setFragile(request.fragile());
        parcel.setDeliveryPriority(request.deliveryPriority());

        parcel.setTrackingNumber(generateTrackingNumber());
        parcel.setCurrentStatus(ParcelStatus.CREATED.name());

        Parcel savedParcel = parcelRepository.save(parcel);

        recordStatusChange(savedParcel, ParcelStatus.CREATED, caller);

        return mapToResponse(savedParcel);
    }

    @Transactional(readOnly = true)
    public List<ParcelResponse> getMyParcels(
            IdentityGateway.Caller caller,
            String token
    ) {

        if ("CUSTOMER".equalsIgnoreCase(caller.role())) {

            return parcelRepository
                    .findByCustomerIdOrderByCreatedAtDesc(caller.id())
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        if ("MERCHANT".equalsIgnoreCase(caller.role())) {

            UUID merchantId = merchantGateway.getApprovedMerchantId(
                    token,
                    caller.id()
            );

            return parcelRepository
                    .findByMerchantIdOrderByCreatedAtDesc(merchantId)
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Your role cannot access parcel bookings"
        );
    }

    @Transactional(readOnly = true)
    public ParcelResponse getParcelById(
            UUID parcelId,
            IdentityGateway.Caller caller,
            String token
    ) {

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Parcel not found"
                ));

        boolean owner = false;

        if ("CUSTOMER".equalsIgnoreCase(caller.role())) {

            owner = caller.id().equals(parcel.getCustomerId());

        } else if ("MERCHANT".equalsIgnoreCase(caller.role())) {

            UUID merchantId = merchantGateway.getApprovedMerchantId(
                    token,
                    caller.id()
            );

            owner = merchantId.equals(parcel.getMerchantId());
        }

        if (!owner) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not allowed to access this parcel"
            );
        }

        return mapToResponse(parcel);
    }

    @Transactional(readOnly = true)
    public ParcelTrackingResponse getParcelByTrackingNumber(
            String trackingNumber
    ) {

        Parcel parcel = parcelRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Parcel not found"
                ));

        List<ParcelStatusHistoryItem> history =
                statusHistoryRepository
                        .findByParcel_ParcelIdOrderByChangedAtAsc(
                                parcel.getParcelId()
                        )
                        .stream()
                        .map(item -> new ParcelStatusHistoryItem(
                                item.getStatus(),
                                item.getChangedAt()
                        ))
                        .toList();

        return new ParcelTrackingResponse(
                parcel.getTrackingNumber(),
                parcel.getCurrentStatus(),
                parcel.getCreatedAt(),
                history
        );
    }

    private String generateTrackingNumber() {

        return "SD" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 12)
                .toUpperCase();
    }

    private ParcelResponse mapToResponse(Parcel parcel) {

        return new ParcelResponse(
                parcel.getParcelId(),
                parcel.getCustomerId(),
                parcel.getMerchantId(),
                parcel.getPickupAddress(),
                parcel.getDropoffAddress(),
                parcel.getPickupZoneId(),
                parcel.getDropoffZoneId(),
                parcel.getPricingId(),
                parcel.getTrackingNumber(),
                parcel.getCurrentStatus(),
                parcel.getCreatedAt(),
                parcel.getEstimatedFee(),
                parcel.getWeightKg(),
                parcel.isFragile(),
                parcel.getDeliveryPriority(),
                parcel.getSenderName(),
                parcel.getSenderPhone(),
                parcel.getReceiverName(),
                parcel.getReceiverPhone(),
                parcel.getParcelDescription()
        );
    }

    @Transactional
    public ParcelResponse assignCourier(
            UUID parcelId,
            UUID courierId,
            IdentityGateway.Caller caller
    ) {

        requireRole(caller, "DISPATCHER" , "ADMIN");

        if (courierId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Courier ID is required"
            );
        }

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Parcel not found"
                ));

        if (!ParcelStatus.CREATED.name().equals(parcel.getCurrentStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only CREATED parcels can be assigned"
            );
        }

        parcel.setAssignedCourierId(courierId);
        parcel.setCurrentStatus(ParcelStatus.ASSIGNED_TO_COURIER.name());

        Parcel savedParcel = parcelRepository.save(parcel);

        recordStatusChange(
                savedParcel,
                ParcelStatus.ASSIGNED_TO_COURIER,
                caller
        );

        return mapToResponse(savedParcel);
    }

    @Transactional
    public ParcelResponse updateCourierStatus(
            UUID parcelId,
            ParcelStatus newStatus,
            IdentityGateway.Caller caller
    ) {

        requireRole(caller, "COURIER");

        if (newStatus == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "New parcel status is required"
            );
        }

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Parcel not found"
                ));

        if (parcel.getAssignedCourierId() == null
                || !parcel.getAssignedCourierId().equals(caller.id())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This parcel is not assigned to you"
            );
        }

        ParcelStatus currentStatus;

        try {
            currentStatus = ParcelStatus.valueOf(parcel.getCurrentStatus());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Parcel has an unsupported current status"
            );
        }

        if (!isAllowedCourierTransition(currentStatus, newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid parcel status transition: "
                            + currentStatus + " to " + newStatus
            );
        }

        parcel.setCurrentStatus(newStatus.name());

        Parcel savedParcel = parcelRepository.save(parcel);

        recordStatusChange(savedParcel, newStatus, caller);

        return mapToResponse(savedParcel);
    }

    private boolean isAllowedCourierTransition(
            ParcelStatus current,
            ParcelStatus next
    ) {

        return switch (current) {

            case ASSIGNED_TO_COURIER ->
                    next == ParcelStatus.PENDING_PICKUP;

            case PENDING_PICKUP ->
                    next == ParcelStatus.PICKED_UP
                            || next == ParcelStatus.FAILED;

            case PICKED_UP ->
                    next == ParcelStatus.IN_TRANSIT
                            || next == ParcelStatus.FAILED;

            case IN_TRANSIT ->
                    next == ParcelStatus.OUT_FOR_DELIVERY
                            || next == ParcelStatus.FAILED;

            case OUT_FOR_DELIVERY ->
                    next == ParcelStatus.DELIVERED
                            || next == ParcelStatus.FAILED;

            default -> false;
        };
    }


    private void requireRole(
            IdentityGateway.Caller caller,
            String... allowedRoles) {

        if (caller == null
                || caller.role() == null
                || Arrays.stream(allowedRoles)
                .noneMatch(role -> role.equalsIgnoreCase(caller.role()))) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not authorized to perform this action");
        }
    }


    private void recordStatusChange(
            Parcel parcel,
            ParcelStatus status,
            IdentityGateway.Caller caller
    ) {

        statusHistoryRepository.save(
                new ParcelStatusHistory(
                        parcel,
                        status.name(),
                        caller.id(),
                        caller.role()
                )
        );
    }
}
