-- Migration: 005_create_order_audit_events.sql
-- Description: Create append-only immutable order_audit_events table for order timeline history

CREATE TABLE IF NOT EXISTS order_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    item_name VARCHAR(255),
    quantity INT,
    unit_price NUMERIC(10, 2),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast chronological timeline retrieval per order
CREATE INDEX IF NOT EXISTS idx_order_audit_events_order_id_created_at ON order_audit_events (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_order_audit_events_actor_id ON order_audit_events (actor_id);
