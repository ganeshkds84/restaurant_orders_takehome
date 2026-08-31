# Project Plan & Session Breakdown

## 1. Session Breakdown

- **Session 1: Foundation & Scaffold (Phase 1)**
  - Established TypeScript Express backend and Vite React frontend monorepo.
  - Configured PostgreSQL connection pooling, centralized error handling, request logging, and health check endpoints.
- **Session 2: Authentication & Server-Side RBAC (Phase 2)**
  - Implemented database schema migration (`001_create_users.sql`) and idempotent migration runner.
  - Implemented secure password hashing with `bcryptjs` and stateless JWT signing/verification.
  - Built `UserRepository`, `AuthService`, and Express middleware (`authenticate`, `requireRole`).
  - Added public and protected endpoints (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/test-rbac/*`).
  - Created frontend `AuthProvider`, `LoginForm`, `UserBadge`, and `SessionDashboard` with live RBAC verification.
  - Wrote automated tests covering 16 backend test cases and 8 frontend test cases.
- **Session 3: Menu Item Management & Availability (Phase 3)**
  - Implemented database schema migration (`002_create_menu_items.sql`) with monetary `NUMERIC(10, 2)` types, non-negative checks, and indexes.
  - Implemented backend data access layer (`MenuRepository`) with in-memory offline fallback for test resilience.
  - Built `MenuService` enforcing dish name uniqueness, soft-archiving rules, and price sanitization.
  - Built REST endpoints under `/api/menu` with Zod validation and server-side RBAC (`requireManager`, `requireStaff`).
  - Built frontend `MenuManagement` component featuring live category filter pills, real-time availability toggle (86'd status), dish creation/edit modals, and role-adapted waiter read-only catalogs.
  - Wrote 19 new backend test cases and 6 new frontend test cases (totaling 51 automated tests).
- **Session 4: Order Creation & Order Lines (Phase 4)**
  - Implemented database schema migration (`003_create_orders_and_order_lines.sql`) with tables `orders` and `order_lines`, relational foreign keys (`CASCADE` / `RESTRICT`), check constraints (`quantity > 0`, `unit_price >= 0`), and lookup indexes.
  - Implemented `OrderRepository` supporting atomic transactions (`BEGIN...COMMIT/ROLLBACK`) and dual-mode in-memory fallback.
  - Implemented `OrderService` with critical historical price snapshotting, dish availability enforcement, and authoritative total calculation.
  - Created REST API endpoints (`POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`) with Zod schema validation and waiter-scoped RBAC.
  - Built frontend `OrderCreation` component with interactive menu picker, quantity adjustments, note instructions, and authoritative total confirmation, and `OrderList` component for active order tickets.
  - Added 16 new automated backend test cases (including the CRITICAL historical price mutation regression test and atomic rollback verification) and 4 new frontend test cases, bringing the repository test total to 71 automated tests across server and client.
- **Future Sessions (Planned)**
  - Session 5: Order Lifecycle Transitions & Line Voiding (Phase 5)
  - Session 6: Waiter Collaborators & Order Search/Filters/Pagination (Phase 6)
  - Session 7: Bulk Menu Operations, Dashboard Analytics, Audit History & Slow-Order Alerts (Phase 7)

---

## 2. Order of Implementation and Rationale
1. **Database Schema & Relational Constraints First**: Modeled `orders` and `order_lines` with strict foreign keys, check constraints, and historical snapshot columns.
2. **Atomic Transaction Layer**: Ensured all order creation operations execute within a transactional boundary so no partial orders can ever be persisted if a line item is invalid.
3. **Historical Price Snapshotting**: Implemented server-side price locking from `menu_items.price` directly onto `order_lines.unit_price`.
4. **Backend Automated Tests**: Validated order creation, ownership spoofing prevention, price snapshotting immutability, and role-based order visibility with 16 backend tests.
5. **Frontend UI & Reactive Controls**: Built `OrderCreation` and `OrderList` with rich modern aesthetics, real-time ticket calculation, and error feedback.
6. **Frontend Integration Tests**: Validated ticket creation, submission, and list navigation with Vitest and React Testing Library.

---

## 3. Estimated vs. Actual Time
- **Database Schema Migration (`003`)**: Estimated 20m, took ~15m.
- **Backend Order Repository, Service & Routes**: Estimated 45m, took ~35m.
- **Backend Test Suite (16 cases)**: Estimated 40m, took ~30m.
- **Frontend Order Creation & Order List UI**: Estimated 50m, took ~40m.
- **Frontend Test Suite (4 cases)**: Estimated 30m, took ~20m.
- **Documentation & Verification**: Estimated 25m, took ~15m.

---

## 4. What Was Cut or Deferred
- **Order state transitions** (*Placed $\to$ Accepted $\to$ Preparing $\to$ Ready $\to$ Served*) and line voiding rules were deferred to Phase 5.
- **Collaborator assignments** and multi-waiter editing permissions were deferred to Phase 6.
- **Full-text search, server pagination, and date range filters** were deferred to Phase 7.
