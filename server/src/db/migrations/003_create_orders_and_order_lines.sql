-- Migration: 003_create_orders_and_order_lines.sql
-- Description: Create orders and order_lines tables with historical price snapshotting and constraints

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number VARCHAR(50) NOT NULL,
    primary_waiter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled')),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent queries and filtering
CREATE INDEX IF NOT EXISTS idx_orders_primary_waiter_id ON orders (primary_waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON orders (is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders (table_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    special_instructions TEXT NOT NULL DEFAULT '',
    is_voided BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines (order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_menu_item_id ON order_lines (menu_item_id);
