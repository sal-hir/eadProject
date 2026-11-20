ALTER TABLE parcel.parcels
    ADD COLUMN fragile BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE parcel.parcels
    ADD COLUMN delivery_priority VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE parcel.parcels
    ADD CONSTRAINT chk_parcel_delivery_priority
        CHECK (delivery_priority IN ('STANDARD', 'EXPRESS'));