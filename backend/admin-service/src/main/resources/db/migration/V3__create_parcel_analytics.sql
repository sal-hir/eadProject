
CREATE TABLE IF NOT EXISTS parcel_analytics (
                                                parcel_id UUID PRIMARY KEY,
                                                current_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ
    );

CREATE INDEX IF NOT EXISTS idx_parcel_analytics_status
    ON parcel_analytics(current_status);

CREATE INDEX IF NOT EXISTS idx_parcel_analytics_delivered_at
    ON parcel_analytics(delivered_at);
