# Submission — Assignment 09: Restaurant Orders

## 1. Project Summary

**Spice Route Restaurant Orders Platform** is an end-to-end, full-stack restaurant operations platform built to replace manual paper tickets and chalkboard menus with an authoritative, real-time digital system.

Designed for high-reliability dining room operations, the application provides dual-role access control for Managers and Waiters, formal order lifecycle progression (*Placed → Accepted → Preparing → Ready → Served*), historical price snapshotting on order lines, multi-waiter order collaboration, server-side search and pagination, bulk menu administration, daily order CSV exports, real-time analytics dashboards, an immutable audit event ledger, and dynamic slow-order alerts.

---

## 2. Links

- **GitHub repository:** `https://github.com/ganeshkds84/restaurant_orders_takehome.git`
- **Live application:** Live deployment: To be configured in Phase 17.

---

## 3. Demo Credentials

The application is pre-seeded with authentic Indian restaurant staff accounts and menu items. For evaluator convenience, the login interface features **quick one-click demo login buttons** that auto-fill these credentials.

| Role | Name | Email | Password | Intended Use / Permissions |
|---|---|---|---|---|
| **Manager** | Rajesh Sharma | `manager@restaurant.com` | `ManagerPassword123!` | Full administrative access: menu creation/editing, bulk updates, operations dashboard, all orders |
| **Waiter** (Primary) | Arjun Kumar | `waiter@restaurant.com` | `WaiterPassword123!` | Order creation, ticket updates, adding collaborating waiters, acknowledging slow-order alerts |
| **Waiter** (Staff 2) | Ananya Rao | `waiter2@restaurant.com` | `WaiterPassword123!` | Collaboration testing: can be added as collaborator to orders created by other waiters |
| **Waiter** (Staff 3) | Rahul Verma | `waiter3@restaurant.com` | `WaiterPassword123!` | Collaboration testing and multi-waiter order assignment |
| **Waiter** (Staff 4) | Sneha Reddy | `waiter4@restaurant.com` | `WaiterPassword123!` | Additional waitstaff identity |

---

## 4. Technology Stack

| Layer | Technologies Used | Architecture Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS | Fast compile and HMR times, strict type safety, zero-overhead styling with tailored responsive design system, and localized Spice Route Restaurant branding. |
| **Backend** | Node.js, Express, TypeScript, Zod, bcryptjs, jsonwebtoken, Winston | Decoupled layered architecture (`Route → Validation → Service → Repository`), runtime validation via Zod, salted password hashing, and stateless JWT Bearer authorization. |
| **Database** | PostgreSQL 14+, `pg` Connection Pool, SQL Migrations | ACID transactional integrity, relational constraints (`ON DELETE CASCADE` / `RESTRICT`), check constraints, and `NUMERIC(10, 2)` monetary precision. Native PostgreSQL is used (not Supabase). |
| **Testing** | Vitest, React Testing Library, Supertest, jsdom | Fast, unified test runner across client and server with 205 passing automated tests. |

---

## 5. Architecture & Server-Side Enforcement

The backend follows a strict layered pattern:

```
Route (HTTP/CORS) ➔ Validation (Zod) ➔ Service (Business Rules) ➔ Repository (SQL) ➔ PostgreSQL
```

- **Server-Authoritative Security**: Authentication, RBAC (`manager` vs `waiter`), and order ownership checks are enforced server-side via middleware (`authenticate`, `requireRole`, `order.auth.ts`). Client state cannot bypass or spoof permissions.
- **Financial Precision**: Dish prices and order totals use `NUMERIC(10, 2)` in PostgreSQL and exact arithmetic in Node.js, snapshotting unit prices at the instant each line is added to protect historical orders from subsequent menu price changes.
- **Dual-Mode Data Access**: Repositories operate against a live PostgreSQL pool with an automated in-memory store fallback for offline test execution.

---

## 6. Assignment Requirements Checklist

All 10 compulsory requirements specified in the assignment brief are fully implemented, verified, and backed by automated tests:

| # | Requirement | Status | Implementation Details & Evidence |
|---|---|---|---|
| **1** | **Accounts and Roles** | **Completed** | Implemented `users` schema (`001_create_users.sql`), salted `bcryptjs` password hashing, stateless JWT Bearer tokens, and server-side RBAC middleware (`requireManager`, `requireStaff`, `requireWaiter`). Waiters cannot alter menu items or modify unassigned orders. Verified by 16 backend tests (`tests/auth.test.ts`, `tests/rbac.test.ts`) and 8 frontend tests. |
| **2** | **Orders** | **Completed** | Implemented `orders` table (`003_create_orders_and_order_lines.sql`) with table number, status, timestamps, and primary waiter attribution (`primary_waiter_id`). Implemented soft-archiving (`archived_at IS NOT NULL`) and restoration endpoints (`PATCH /api/orders/:id/archive`, `PATCH /api/orders/:id/restore`) that hide archived orders from active queues without deleting records. Verified by automated order tests. |
| **3** | **Order Lines** | **Completed** | Implemented `order_lines` table with mandatory foreign keys, positive quantity validation (`quantity > 0`), and optional special instructions. Stored immutable `unit_price` snapshots at line creation time so subsequent menu price edits never alter past totals. Server calculates authoritative totals dynamically. Verified by automated order tests including historical price mutation tests. |
| **4** | **Order Lifecycle with Rules** | **Completed** | Authoritative server-side state machine (`order.state-machine.ts`) enforces legal sequential progression (*Placed → Accepted → Preparing → Ready → Served*), rejecting state skips and backwards transitions. Cancellations (`POST /api/orders/:id/cancel`) are strictly permitted only during *Placed* or *Accepted*, and rejected once *Preparing*. Non-destructive line voiding (`PATCH /api/orders/:id/lines/:lineId/void`) requires a reason and recalculates order totals while preserving records. Verified by 25 backend tests (`tests/order.test.ts`) and 4 frontend tests. |
| **5** | **Collaborators** | **Completed** | Implemented `order_collaborators` junction table (`004_create_order_collaborators.sql`) with unique `(order_id, user_id)` constraint. Centralized authorization (`order.auth.ts`) enables primary waiters and managers to add/remove collaborating waiters (`/api/orders/:id/collaborators`). Waiters have access to orders they created or were added to. Verified by 27 backend tests (`tests/collaborators.test.ts`) and 4 frontend tests. |
| **6** | **Finding Orders** | **Completed** | Server-side text search over table numbers (`ILIKE`), multi-criteria filtering by status, waiter, and date (`YYYY-MM-DD`), multi-field sorting by placed time, status, or table, and server-side pagination with total count and page calculation. Waiters are strictly scoped to orders they own or collaborate on. Verified by 17 backend tests (`tests/order-search.test.ts`) and 6 frontend tests. |
| **7** | **Bulk Menu Actions & CSV Export** | **Completed** | Manager-only bulk operations (`POST /api/menu/bulk`) supporting bulk price updates and availability toggles with granular, per-item success/failure reporting (invalid items fail individually without aborting the batch). Daily orders CSV export (`GET /api/orders/export/csv`) produces RFC 4180 compliant CSV files with lines, totals, statuses, and notes. Verified by 9 backend tests (`tests/bulk-menu-csv.test.ts`) and 5 frontend tests. |
| **8** | **Dashboard** | **Completed** | Operational dashboard (`GET /api/dashboard/stats`, `GET /api/dashboard`) computing live headline metrics (open orders, orders placed today, orders served today, revenue today), lifecycle status distribution breakdown, waiter performance leaderboard, and 14-day chronological served orders volume chart. Verified by 10 backend tests (`tests/dashboard.test.ts`) and 6 frontend tests. |
| **9** | **Immutable History Timeline** | **Completed** | Append-only audit events table (`order_audit_events` in `005_create_order_audit_events.sql`) recording every status change (with old/new status and actor), line addition, line voiding (with reason), and notes. Events are written transactionally and have zero edit or delete endpoints, guaranteeing tamper-proof auditability. Verified by 12 backend tests (`tests/audit-timeline.test.ts`) and 4 frontend tests. |
| **10** | **Slow-Order Alerts** | **Completed** | Dynamic server-side elapsed time monitoring for open orders exceeding threshold minutes without reaching Ready. Supports alert acknowledgement (`order_alert_acknowledgements` in `006_create_order_alert_acknowledgements.sql`), clearing alerts from view, and automatic re-alert reactivation if orders remain open past the re-alert window. Navigation bar displays a live active alert badge. Verified by 11 backend tests (`tests/alerts.test.ts`) and 5 frontend tests. |

---

## 7. Database Migrations

The database schema is managed via 6 sequential SQL migration scripts in `server/src/db/migrations/`:

| Migration File | Description | Key Tables & Constraints |
|---|---|---|
| `001_create_users.sql` | User accounts, credentials, and role definitions | `users` table, `role IN ('manager', 'waiter')`, unique lowercase email, index on email |
| `002_create_menu_items.sql` | Menu items catalogue with pricing and availability | `menu_items` table, `NUMERIC(10, 2)` price, `is_available`, soft-archive `archived_at` |
| `003_create_orders_and_order_lines.sql` | Orders and line items with financial snapshotting | `orders`, `order_lines` tables, foreign keys, status check, `unit_price` snapshot |
| `004_create_order_collaborators.sql` | Multi-waiter order collaboration junction | `order_collaborators` table, unique `(order_id, user_id)`, cascade deletes |
| `005_create_order_audit_events.sql` | Tamper-proof append-only order history ledger | `order_audit_events` table, compound index `(order_id, created_at ASC)` |
| `006_create_order_alert_acknowledgements.sql` | Slow-order alert acknowledgement tracking | `order_alert_acknowledgements` table, compound index `(order_id, acknowledged_at DESC)` |

---

## 8. Verification & Test Results

All tests, typechecks, and production builds were executed and verified:

### Automated Test Suite
- **Backend Tests**: **148 passed** across 10 test files (`npm run test:server`)
- **Frontend Tests**: **57 passed** across 12 test files (`npm run test:client`)
- **Total Tests**: **205 passed (100% pass rate)**

### Static Analysis & Builds
- **Backend Typecheck (`tsc --noEmit`)**: **PASS** (zero errors)
- **Frontend Typecheck (`tsc --noEmit`)**: **PASS** (zero errors)
- **Backend Build (`tsc`)**: **PASS** (compiled to `server/dist`)
- **Frontend Build (`tsc && vite build`)**: **PASS** (compiled to `client/dist`, bundle size: ~308 kB JS, ~5.3 kB CSS)

---

## 9. Time Spent

Development was completed incrementally across the implementation phases documented in this repository:
- **Phases 1–2**: Monorepo scaffolding, PostgreSQL pooling, migrations runner, authentication & server-side RBAC
- **Phases 3–5**: Menu item management, order lines, price snapshotting, state machine lifecycle & line voiding
- **Phases 6–7**: Order collaboration, server-side search, filtering, multi-field sorting, and pagination
- **Phases 8–10**: Bulk menu operations, CSV export, operations dashboard, and immutable audit event ledger
- **Phases 11–15**: Slow-order alerts engine, Indian restaurant localization, branding polish, and end-to-end integration
- **Phase 16**: Final documentation audit, submission cleanup, and full test suite verification

---

## 10. Known Limitations

1. **Session Revocation at Scale**: Authentication uses stateless JWT Bearer tokens with an 8-hour expiration. In an enterprise multi-branch deployment, refresh token rotation with token blacklisting in Redis would provide immediate token revocation capabilities.
2. **Single-Location Operational Scope**: Built for a single restaurant dining room operations flow as specified in the assignment brief; multi-branch or chain tenant management would require adding restaurant location identifiers.
3. **Data Refresh via Polling**: Alert counts and order status lists refresh on user navigation and standard query invalidation; real-time push via WebSockets or Server-Sent Events (SSE) could be added for zero-latency kitchen display synchronization.
