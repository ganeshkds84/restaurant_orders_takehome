-- 006_create_order_alert_acknowledgements.sql
-- Table persisting slow-order alert acknowledgements with actor information and timestamps

CREATE TABLE IF NOT EXISTS order_alert_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT NULL
);

-- Index for quickly fetching the most recent acknowledgement for an order
CREATE INDEX IF NOT EXISTS idx_order_alert_acks_order_time 
    ON order_alert_acknowledgements (order_id, acknowledged_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_alert_acks_user 
    ON order_alert_acknowledgements (user_id);
