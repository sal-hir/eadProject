CREATE TABLE zones (
                       id UUID PRIMARY KEY,
                       zone_name VARCHAR(100) NOT NULL UNIQUE,
                       description VARCHAR(500),
                       active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at TIMESTAMP,
                       updated_at TIMESTAMP
);

CREATE TABLE pricing_rates (
                               id UUID PRIMARY KEY,

                               zone_id UUID NOT NULL,

                               min_weight NUMERIC(10,2) NOT NULL,
                               max_weight NUMERIC(10,2) NOT NULL,

                               delivery_fee NUMERIC(10,2) NOT NULL,

                               active BOOLEAN NOT NULL DEFAULT TRUE,

                               created_at TIMESTAMP,
                               updated_at TIMESTAMP,

                               CONSTRAINT fk_pricing_zone
                                   FOREIGN KEY (zone_id)
                                       REFERENCES zones(id),

                               CONSTRAINT chk_weight_range
                                   CHECK (min_weight >= 0 AND max_weight > min_weight),

                               CONSTRAINT chk_delivery_fee
                                   CHECK (delivery_fee > 0)
);

CREATE INDEX idx_pricing_zone
    ON pricing_rates(zone_id);