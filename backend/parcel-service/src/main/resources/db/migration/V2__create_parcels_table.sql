
CREATE TABLE parcel.parcels (
                                parcel_id UUID PRIMARY KEY,

                                customer_id UUID,
                                merchant_id UUID,

                                pickup_address TEXT NOT NULL,
                                dropoff_address TEXT NOT NULL,

                                pickup_zone_id UUID NOT NULL,
                                dropoff_zone_id UUID NOT NULL,

                                pricing_id UUID NOT NULL,

                                tracking_number VARCHAR(30) NOT NULL UNIQUE,

                                current_status VARCHAR(30) NOT NULL,

                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                estimated_fee NUMERIC(12, 2) NOT NULL
                                    CHECK (estimated_fee >= 0),

                                weight_kg NUMERIC(8, 3) NOT NULL
                                    CHECK (weight_kg > 0),

                                CONSTRAINT chk_parcel_booking_owner
                                    CHECK (
                                        (customer_id IS NOT NULL AND merchant_id IS NULL)
                                            OR
                                        (customer_id IS NULL AND merchant_id IS NOT NULL)
                                        )
);

CREATE INDEX idx_parcels_customer_id
    ON parcel.parcels(customer_id);

CREATE INDEX idx_parcels_merchant_id
    ON parcel.parcels(merchant_id);

CREATE INDEX idx_parcels_created_at
    ON parcel.parcels(created_at);
