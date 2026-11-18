-- Store the courier assigned to each parcel.
ALTER TABLE parcel.parcels
    ADD COLUMN assigned_courier_id UUID;


-- Store every parcel status change.
CREATE TABLE parcel.parcel_status_history (
                                              history_id UUID PRIMARY KEY,

                                              parcel_id UUID NOT NULL,

                                              status VARCHAR(30) NOT NULL,

                                              updated_by UUID NOT NULL,

                                              updated_by_role VARCHAR(30) NOT NULL,

                                              changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                              CONSTRAINT fk_parcel_status_history_parcel
                                                  FOREIGN KEY (parcel_id)
                                                      REFERENCES parcel.parcels(parcel_id)
                                                      ON DELETE CASCADE
);


-- Improve status-history lookup performance.
CREATE INDEX idx_parcel_status_history_parcel_id
    ON parcel.parcel_status_history(parcel_id);


-- Convert the old initial status to the new initial status.
UPDATE parcel.parcels
SET current_status = 'CREATED'
WHERE current_status = 'BOOKED';


-- Preserve an initial history record for existing parcels.
INSERT INTO parcel.parcel_status_history (
    history_id,
    parcel_id,
    status,
    updated_by,
    updated_by_role,
    changed_at
)
SELECT
    gen_random_uuid(),
    parcel_id,
    current_status,
    COALESCE(customer_id, merchant_id),
    CASE
        WHEN customer_id IS NOT NULL THEN 'CUSTOMER'
        ELSE 'MERCHANT'
        END,
    created_at
FROM parcel.parcels;