# Schema Documentation

## Database Overview
The PostgreSQL database persists application entities with strict relational constraints, strong types, indexes, and automated schema migration tracking (`schema_migrations`).

---

## Tables

### 1. `schema_migrations`
Tracks executed SQL migrations idempotently.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Sequential migration identifier |
| `filename` | VARCHAR(255) | UNIQUE, NOT NULL | Filename of the migration (e.g. `001_create_users.sql`, `002_create_menu_items.sql`) |
| `executed_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp when migration was executed |

---

### 2. `users`
Persists user accounts, hashed credentials, and server-side roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY DEFAULT `gen_random_uuid()` | Unique immutable user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Unique lowercased login email |
| `name` | VARCHAR(255) | NOT NULL | User's display name |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt password hash (salt rounds = 10) |
| `role` | VARCHAR(32) | NOT NULL, CHECK (`role IN ('manager', 'waiter')`) | Assigned authorization role |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record last update timestamp |

**Indexes**:
- `idx_users_email`: B-Tree index on `LOWER(email)` for fast case-insensitive lookups.
- `idx_users_role`: B-Tree index on `role` for efficient role filtering.

---

### 3. `menu_items`
Persists restaurant menu dishes, beverage items, fixed prices, and real-time availability status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY DEFAULT `gen_random_uuid()` | Unique menu item UUID identifier |
| `name` | VARCHAR(255) | NOT NULL | Menu item display title |
| `description` | TEXT | NOT NULL DEFAULT '' | Dish description, ingredients, notes |
| `category` | VARCHAR(100) | NOT NULL | Category grouping (e.g. Appetizers, Mains, Desserts, Beverages) |
| `price` | NUMERIC(10, 2) | NOT NULL, CHECK (`price >= 0`) | Monetary price representation (exact 2 decimal places) |
| `is_available` | BOOLEAN | NOT NULL DEFAULT TRUE | Real-time availability indicator (86'd status) |
| `is_archived` | BOOLEAN | NOT NULL DEFAULT FALSE | Soft-archive flag removing item from active catalog |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record last update timestamp |

**Indexes**:
- `uq_menu_items_name_lower`: Unique index on `LOWER(name)` preventing duplicate item names.
- `idx_menu_items_category`: B-Tree index on `category` for fast category filtering.
- `idx_menu_items_available`: B-Tree index on `is_available` for filtering orderable items.
- `idx_menu_items_archived`: B-Tree index on `is_archived` for default catalog filtering.

---

## Constraints: Database vs. Application Enforcement

### Enforced by Database:
1. **Primary Key Uniqueness**: `id` UUID primary keys ensure entity uniqueness across distributed or concurrent insertions.
2. **Email Uniqueness**: `CONSTRAINT uq_users_email UNIQUE (email)` prevents duplicate account registrations.
3. **Menu Item Name Uniqueness**: `CREATE UNIQUE INDEX uq_menu_items_name_lower ON menu_items (LOWER(name))` guarantees dish name uniqueness.
4. **Monetary Decimal Safety**: `price NUMERIC(10, 2) CHECK (price >= 0)` eliminates floating-point rounding errors and rejects negative values at the storage engine level.
5. **Role Domain Validation**: `CONSTRAINT chk_users_role CHECK (role IN ('manager', 'waiter'))` guarantees valid roles.
6. **Not-Null Invariants**: Guarantees that essential entity attributes are never null.

### Enforced by Application Layer:
1. **Zod Schema Parsing & Normalization**: Validating payload schemas, string lengths, trimming whitespaces, and limiting decimal precision before SQL execution.
2. **Credential Verification**: Bcrypt password comparison against stored salted hash.
3. **Server-Side RBAC Enforcement**: Role checks verified against authenticated token identity directly on the server before dispatching handlers. Waiters are blocked from create/update/archive/availability mutation endpoints with `403 Forbidden`.
4. **Archive Filtering**: Silently isolating archived items from waiters and regular order queues unless explicitly requested by authorized managers.
5. **Output Sanitization**: Stripping sensitive fields (`password_hash`) and formatting monetary values consistently.

---

## Performance & Scalability (100x Data Analysis)
- **Menu Filtering**: With composite and B-Tree indexes on `is_archived`, `category`, and `is_available`, menu listings execute in sub-millisecond time ($O(\log N)$) even across tens of thousands of menu revisions.
- **Monetary Safety**: Using `NUMERIC(10, 2)` eliminates IEEE 754 floating-point inaccuracies that compound when calculating order lines and revenue totals.
- **Connection Pooling**: `pg.Pool` connection pooling manages socket allocation to prevent database resource exhaustion under high concurrency.
- **Stateless Tokens**: JWT authorization eliminates database session bottleneck on read-heavy routes when cached or short-lived, while maintaining full server-side role validation.
