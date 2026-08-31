-- Migration: 002_create_menu_items.sql
-- Description: Create menu_items table with monetary numeric price, constraints, and indexes

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on menu item name
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_name_lower ON menu_items (LOWER(name));

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items (is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_archived ON menu_items (is_archived);
