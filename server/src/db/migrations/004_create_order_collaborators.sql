-- Migration: 004_create_order_collaborators.sql
-- Description: Create order_collaborators many-to-many junction table with unique constraint and indexes

CREATE TABLE IF NOT EXISTS order_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_collaborators_order_user UNIQUE (order_id, user_id)
);

-- Indexes for frequent queries and joins
CREATE INDEX IF NOT EXISTS idx_order_collaborators_order_id ON order_collaborators (order_id);
CREATE INDEX IF NOT EXISTS idx_order_collaborators_user_id ON order_collaborators (user_id);
