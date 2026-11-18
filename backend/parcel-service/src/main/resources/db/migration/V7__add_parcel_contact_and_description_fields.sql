ALTER TABLE parcel.parcels
    ADD COLUMN sender_name VARCHAR(100),
    ADD COLUMN sender_phone VARCHAR(10),
    ADD COLUMN receiver_name VARCHAR(100),
    ADD COLUMN receiver_phone VARCHAR(10),
    ADD COLUMN parcel_description VARCHAR(500);