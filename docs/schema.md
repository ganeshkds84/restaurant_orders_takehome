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
| `filename` | VARCHAR(255) | UNIQUE, NOT NULL | Filename of the migration (e.g. `001_create_users.sql`) |
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

## Constraints: Database vs. Application Enforcement

### Enforced by Database:
1. **Primary Key Uniqueness**: `id` UUID primary key ensures entity uniqueness across distributed or concurrent insertions.
2. **Email Uniqueness**: `CONSTRAINT uq_users_email UNIQUE (email)` prevents duplicate account registrations at the storage layer.
3. **Role Domain Validation**: `CONSTRAINT chk_users_role CHECK (role IN ('manager', 'waiter'))` guarantees that no invalid role string can ever enter the database.
4. **Not-Null Invariants**: Guarantees that `email`, `name`, `password_hash`, and `role` are never null.

### Enforced by Application Layer:
1. **Input Normalization & Parsing**: Trimming and lowercasing emails before hashing/querying.
2. **Credential Verification**: Bcrypt password comparison against stored salted hash.
3. **Server-Side RBAC Enforcement**: Role checks verified against authenticated identity directly on the server before dispatching protected handlers.
4. **Output Sanitization**: Stripping `password_hash` from all user objects before JSON serialization.

---

## Performance & Scalability (100x Data Analysis)
- **Email Lookups**: With `idx_users_email` (B-Tree on lowercased email), login lookups scale logarithmically ($O(\log N)$) even at $10^7$ users.
- **Connection Pooling**: `pg.Pool` connection pooling manages socket allocation to prevent database resource exhaustion under high concurrency.
- **Stateless Tokens**: JWT authorization eliminates database session bottleneck on read-heavy routes when cached or short-lived, while maintaining full server-side role validation.
