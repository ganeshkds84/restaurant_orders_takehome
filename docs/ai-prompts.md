# AI Prompts

The prompts actually used, in the order used, grouped by what we were trying to achieve.

---

## Phase 1 — Project Scaffold & Health Foundation

### Prompt
Initialize the monorepo foundation with Express + TypeScript backend, Vite + React + TypeScript frontend, PostgreSQL connection pooling, centralized error handling, and health check endpoints with automated tests.

### What you got
Initial scaffold with concurrently running server and client, health check routes, base styles, and Vitest test setups for both packages.

### What you corrected
Adjusted frontend environment variable prefixing to standard Vite `VITE_` format and configured clean cross-origin resource sharing (CORS) defaults between Vite and Express.

---

## Phase 2 — Authentication & Server-Side Role-Based Access Control (RBAC)

### Prompt
```
# Phase 2 — Authentication + Role-Based Access Control

We have completed and committed Phase 1 of the Restaurant Orders take-home assignment.
Now implement ONLY Phase 2: Authentication and server-side Role-Based Access Control (RBAC).

IMPORTANT:
* Read the assignment specification again before implementing.
* Treat the assignment specification as the source of truth.
* Do NOT implement orders, menu management, collaborators, dashboard, alerts, bulk operations, or other later-phase business functionality.
* Do NOT restructure the working foundation unnecessarily.
* Preserve the existing architecture and coding conventions established in Phase 1.
* Every authorization rule must be enforced on the SERVER. Never rely on frontend-only hiding/disabling of functionality.
* Do not hardcode passwords, secrets, JWT keys, or credentials.
* Do not commit real credentials or .env files containing secrets.
```

### What you got
- Implementation plan covering database migrations (`001_create_users.sql`), safe password hashing with bcrypt, JWT token generation & verification, repository and service abstractions, `authenticate` and `requireRole` middleware, authentication routes (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`), test RBAC verification endpoints (`/api/test-rbac/*`), React `AuthProvider`, modern `LoginForm` with demo quick-fill buttons, `UserBadge`, `SessionDashboard`, and automated test suites.

### What you corrected
1. **PowerShell Statement Chaining**: When executing npm commands in PowerShell, `&&` was replaced with `;` for PowerShell parser compatibility.
2. **ESM / Module Configuration**: Added `"type": "module"` to `server/package.json` to align with NodeNext module resolution for TypeScript compilation.
3. **Database Test Resilience**: Configured `UserRepository` and migration/seed scripts to support offline fallback stores so unit test runners and offline evaluation can execute without requiring an active PostgreSQL daemon, while strictly executing full SQL against PostgreSQL when connected.
4. **Act Warnings in React Testing Library**: Wrapped async test actions with React testing library's `act()` to eliminate component state update warnings in Vitest.

---

## Phase 3 — Menu Item Management & Availability

### Prompt
```
# Phase 3 — Menu Item Management & Availability

We have completed and committed Phase 1 (project foundation) and Phase 2 (authentication + server-side RBAC).

Now implement ONLY the Menu Item Management and Availability functionality required by the Restaurant Orders take-home assignment.

IMPORTANT:
* Read the assignment specification again before implementing.
* Treat the assignment specification as the source of truth.
* Preserve the existing Express + TypeScript + PostgreSQL + React architecture.
* Do not rewrite the existing authentication/RBAC implementation unless a concrete issue is discovered.
* Do not implement orders, order lines, lifecycle transitions, collaborators, dashboard, audit history, alerts, bulk operations, or CSV export yet.
* All business rules and authorization must be enforced server-side.
```

### What you got
- Database migration `002_create_menu_items.sql` with exact `NUMERIC(10, 2)` monetary columns, non-negative checks, and indexes.
- Complete repository layer (`MenuRepository`), service layer (`MenuService`), Zod validation schemas, and REST endpoints under `/api/menu`.
- Comprehensive server-side RBAC enforcement (`requireManager` for creation/updates/archiving/availability, `requireStaff` for listing/retrieval).
- React `MenuManagement` component with category filter tabs, search filtering, live 86'd availability toggles, creation/edit modal forms, and waiter read-only catalog adaptation.
- 19 new backend test cases and 6 new frontend test cases (51 total tests).

### What you corrected
1. **Express 5 Param Typing**: Handled `req.params.id` string-or-array typing cleanly in route handlers to ensure strict TypeScript compiler conformance.
2. **Tabbed Navigation Context**: Rendered a shared authenticated welcome greeting banner in `App.tsx` so both Menu Management and Session/RBAC verification tabs maintain user context without regression.
3. **Unused Imports Cleaned**: Removed unused icon imports (`Layers`) in `MenuManagement.tsx` to ensure `tsc --noEmit` runs with zero warnings.

---

## Phase 4 — Order Creation & Order Lines

### Prompt
```
# Phase 4 — Order Creation & Order Lines

We have completed and committed:
* Phase 1 — Project Foundation
* Phase 2 — Authentication + Server-Side RBAC
* Phase 3 — Menu Item Management + Availability

Now implement ONLY the Order Creation and Order Lines functionality required by the Restaurant Orders take-home assignment.

IMPORTANT:
* Read the assignment specification again before coding.
* Treat the assignment specification as the source of truth.
* Preserve the existing Express + TypeScript + PostgreSQL + React architecture.
* Do not rewrite working authentication, RBAC, or menu functionality unnecessarily.
* Do not implement later phases such as collaborators, advanced search/filter/sort/pagination, bulk actions, CSV export, dashboard analytics, audit history, or slow-order alerts.
* All important business rules must be enforced server-side.
* Do not trust frontend-supplied user IDs, roles, prices, totals, or protected fields.
```

### What you got
- Database migration `003_create_orders_and_order_lines.sql` modeling `orders` and `order_lines` with relational constraints, positive quantity checks, non-negative unit price checks, and foreign key indexes.
- Data access repository (`OrderRepository`) supporting atomic transactions (`BEGIN...COMMIT/ROLLBACK`) with zero orphaned records on error, plus in-memory fallback.
- Domain service (`OrderService`) implementing critical historical price snapshotting from `menu_items.price` directly onto `order_lines.unit_price`, dish availability checks, and authoritative total calculation.
- REST endpoints under `/api/orders` with Zod validation and waiter-scoped RBAC authorization.
- React frontend components: `OrderCreation` (interactive dish picker, quantity controls, special instructions, running total preview, confirmation banner with server total) and `OrderList` (active tickets, order lines with historical snapshots, status badges).
- Automated test suites: 16 new backend test cases (including the critical historical price mutation regression test) and 4 new frontend test cases (71 total tests).

### What you corrected
1. **Authenticated User ID Field**: Corrected `user.userId` to `user.id` in `OrderService` matching the `UserResponse` interface produced by the authentication middleware.
2. **UUID Generation in Repository Fallback**: Updated in-memory ID generation across repositories from custom prefix strings (`mem-...`) to standard `crypto.randomUUID()` so created items and orders pass strict Zod UUID validators.
3. **Multi-User Test State**: Added secondary waiter credentials (`waiter2@restaurant.com`) to repository seeds so waiter-isolation authorization test scenarios verify across multiple distinct users.
4. **React Testing Library Selector Disambiguation**: Switched ambiguous text selectors (`getByText('Active Orders')`) to `getByRole('heading', { name: 'Active Orders' })` to avoid collisions with navigation tab labels.

---

## Phase 5 — Order Lifecycle & Business Rules

### Prompt
```
# Phase 5 — Order Lifecycle & Business Rules

We have completed and committed:
* Phase 1 — Project Foundation
* Phase 2 — Authentication + Server-Side RBAC
* Phase 3 — Menu Item Management + Availability
* Phase 4 — Order Creation + Order Lines

Now implement ONLY the Order Lifecycle and related business rules required by the Restaurant Orders take-home assignment.

IMPORTANT:
* Read the assignment specification again before coding.
* Treat the assignment specification as the source of truth.
* Preserve the existing architecture and working functionality.
* Do not rewrite authentication, menu, or order creation unnecessarily.
* All lifecycle and business rules MUST be enforced server-side.
* The frontend must never be the authority for legal state transitions.
* Do not implement collaborators, advanced search/filter/sort/pagination, bulk operations, CSV export, dashboard analytics, audit history, or slow-order alerts yet.
```

### What you got
- Authoritative state machine engine (`order.state-machine.ts`) enforcing sequential order progression (*Placed $\to$ Accepted $\to$ Preparing $\to$ Ready $\to$ Served*), blocking state skipping, backward transitions, and terminal state modifications.
- Complete cancellation business rules: permitted strictly while `placed` or `accepted`, and rejected once `preparing`, `ready`, or `served`.
- Order line voiding subsystem: requiring non-empty reasons, marking lines as voided (`is_voided = true`) without deletion, and dynamically recalculating authoritative totals from active lines.
- REST API lifecycle endpoints (`PATCH /api/orders/:id/status`, `POST /api/orders/:id/cancel`, `POST /api/orders/:id/lines`, `PATCH /api/orders/:id/lines/:lineId/void`).
- Frontend interactive lifecycle controls in `OrderList.tsx` with status progression badges, state-adapted action buttons, cancel confirmation modal, and line void modal with required reason validation.
- 9 new backend test cases (25 order tests, 62 total backend tests) and 4 new frontend test cases (22 total frontend tests) totaling 84 automated tests.

## Phase 6 — Collaborators & Order Access

### Prompt
```
# Phase 6 — Collaborators & Order Access

We have completed and committed:
* Phase 1 — Project Foundation
* Phase 2 — Authentication + Server-Side RBAC
* Phase 3 — Menu Item Management + Availability
* Phase 4 — Order Creation + Order Lines
* Phase 5 — Order Lifecycle & Business Rules

Now implement ONLY the Collaborators and Order Access functionality required by the Restaurant Orders take-home assignment.

IMPORTANT:
* Re-read the original assignment specification before coding.
* The assignment specification is the source of truth.
* Do not invent collaborator functionality that is not required.
* Preserve all existing authentication, RBAC, menu, order creation, and lifecycle functionality.
* Do not rewrite working functionality unnecessarily.
* All authorization MUST be enforced server-side.
* Do not trust frontend role/user IDs.
* Do not implement advanced search/filter/sort/pagination, bulk actions, CSV export, dashboard analytics, audit/history timeline, or slow-order alerts yet unless the specification explicitly requires a small dependency for collaborators.
```

### What you got
- Database migration `004_create_order_collaborators.sql` creating table `order_collaborators` with foreign keys, unique constraint `uq_order_collaborators_order_user(order_id, user_id)`, and performance indexes.
- Data types for `OrderCollaborator`, `DbOrderCollaborator`, and extended `Order` / `OrderWithLines`.
- Centralized authorization module `server/src/orders/order.auth.ts` enforcing `canAccessOrder`, `canModifyOrder`, and `canManageCollaborators` across all operations.
- Collaborator endpoints (`GET /api/orders/eligible-waiters`, `GET /api/orders/:id/collaborators`, `POST /api/orders/:id/collaborators`, `DELETE /api/orders/:id/collaborators/:userId`) with strict server-side validation.
- Interactive frontend collaborator UI in `OrderList.tsx` with Primary Waiter and Collaborator badges, expanded card Collaborators panel, and Add Collaborator modal with waitstaff dropdown.
- 27 new automated backend test cases and 4 new frontend test cases, bringing the repository total to 115 passing tests across server and client.

### What you corrected
1. **Repository In-Memory User ID Matching**: Fixed in-memory user store in `collaborators.test.ts` to preserve consistent pre-seeded UUIDs for secondary test waiters (`waiter3`) rather than generating random UUIDs that caused target lookup mismatches.
2. **Type Imports in Order Repository**: Added `DbOrderCollaborator` and `OrderCollaborator` to type imports in `server/src/orders/order.repository.ts` to satisfy `tsc` build requirements.
3. **Frontend Test Mock Fresh State**: Updated Vitest mock fetch in `client/tests/Collaborators.test.tsx` to return dynamically cloned JSON instances of mock orders upon expansion, ensuring UI updates immediately reflect collaborator additions.

---

## Phase 7 — Order Finding / Search, Filter, Sort & Server-Side Pagination

### Prompt
```
# Phase 7 — Order Finding / Search / Filtering / Sorting / Pagination

We are continuing the Restaurant Orders take-home assignment.
Implement ONLY the exact order search/finding functionality required by the ORIGINAL ASSIGNMENT SPECIFICATION (Goal 6).
* One list shows orders across every table the viewer can see.
* Text search over the table number.
* Filters for status, waiter and date.
* Sorting by placed time, status or table.
* Pagination showing the total number of matches.
* All of this must happen on the server — do not load every order into the browser and filter there.
* Do NOT implement later phases such as bulk operations, CSV export, dashboard, audit/history timeline, slow-order alerts, deployment, or unrelated UI polish.
* Do NOT rewrite working architecture from previous phases.
* Preserve all existing functionality from Phases 1–6.
* Do NOT commit or push anything.
* Return a clear walkthrough of exactly what was implemented and the verification results.
```

### What you got
- Server-side text search over table numbers (`search` with SQL `ILIKE` pattern matching).
- Multi-criteria filtering by order status (`status`), waiter ID (`waiterId`), and calendar date (`date` in `YYYY-MM-DD` format).
- Server-side sorting allowlist supporting `createdAt`, `status`, and `tableNumber` in ascending and descending directions with deterministic tiebreakers.
- Server-side pagination with `page` and `limit`, returning total match count, page, limit, and computed `totalPages`.
- Access scoping: Waiters can only search and filter within orders where they are the primary waiter or an assigned collaborator (`accessibleWaiterId`).
- Query validation in `orderQuerySchema` via Zod.
- Frontend Search & Filter Toolbar in `OrderList.tsx` with responsive grid inputs for table search, status, waiter, date, sort dropdowns, and reset filters button.
- Frontend pagination footer showing "Showing X to Y of Z orders", page size selector, and Previous/Next buttons.
- 17 new backend automated test cases (`tests/order-search.test.ts`) and 6 new frontend test cases (`tests/OrderSearch.test.tsx`), bringing total test suite to 138 passing automated tests (106 backend, 32 frontend).

### What you corrected
1. **Zod Transform Table Name Matching**: Fixed `tableNumber` camelCase match in the `orderQuerySchema` sort transform to ensure `tableNumber` is correctly recognized alongside `table_number` and `table`.
2. **Repository Type Imports**: Added `OrderSortField` and `PaginatedOrdersResult` to type imports in `server/src/orders/order.repository.ts` to satisfy TypeScript production compilation.
3. **Frontend Test Mock Route Handler**: Added mock handler for `/orders/eligible-waiters` across older frontend test suites (`OrderLifecycle.test.tsx` and `OrderCreation.test.tsx`) to eliminate console warnings when mounting `OrderList`.

---

## Phase 8 — Acting on Many Menu Items at Once & Daily Orders CSV Export

### Prompt
```
# Phase 8 — Acting on Many Menu Items at Once & Daily Orders CSV Export

We are continuing the Restaurant Orders take-home assignment.
Implement ONLY Goal 7 from the ORIGINAL TAKE-HOME ASSIGNMENT SPECIFICATION:
* 7. Acting on many menu items at once. Managers can select several menu items and apply one change to all of them — a new price or a change in availability — in a single action. Because some items in the selection may be invalid, such as a negative price, the result must report per item what succeeded and what was rejected and why, not just fail the whole batch. Separately, export the day's orders — every order placed that day with its lines, total and status — as a CSV file.
* Do NOT implement later phases such as dashboard analytics, audit/history timeline, slow-order alerts, deployment, or unrelated UI polish.
* Do NOT rewrite working architecture from previous phases.
* Preserve all existing functionality from Phases 1–7.
* Do NOT commit or push anything.
* Return a clear walkthrough of exactly what was implemented and the verification results.
```

### What you got
- Bulk menu endpoint `POST /api/menu/bulk` with manager-only authorization (`requireManager`).
- Support for bulk price updates (with non-negative and 2-decimal validation) and bulk availability updates (86ing multiple items at once).
- Granular per-item error reporting: invalid items in a selection (e.g. non-existent ID, negative price) fail individually with specific error messages while valid items in the batch are updated successfully.
- Response summary structure: `{ total, succeeded, failed, results: [...] }`.
- Daily orders CSV export endpoint `GET /api/orders/export/csv` generating standard RFC 4180 CSV with quotes, headers, and line items.
- Manager Bulk Actions Toolbar in `MenuManagement.tsx` with multi-select checkboxes, Select All / Deselect All, bulk action modals, and detailed per-item result breakdown modal.
- "Export Orders (CSV)" button in `OrderList.tsx` header bar.
- 9 new backend automated test cases (`tests/bulk-menu-csv.test.ts`) and 5 new frontend test cases (`tests/BulkMenuCsv.test.tsx`), bringing total test suite to 152 passing automated tests (115 backend, 37 frontend).

### What you corrected
1. **Validation Boundary for Partial Failures**: Designed bulk schema to accept optional fields at the root level so invalid individual parameters (like negative prices) can be inspected per-item in `MenuService` and returned with specific failure reasons rather than causing a 400 rejection of the entire payload.
2. **JSDOM Navigation Warning in Test**: Mocked `HTMLAnchorElement.prototype.click` in the frontend CSV export test to ensure clean test execution without JSDOM navigation warnings.

---

## Phase 9 — Operations & Analytics Dashboard (Goal 8)

### Prompt
```
# Phase 9 — Operations & Analytics Dashboard

We are continuing the Restaurant Orders take-home assignment.
Implement ONLY Goal 8 from the ORIGINAL TAKE-HOME ASSIGNMENT SPECIFICATION:
* 8. A dashboard. A landing view shows headline numbers — open orders, orders placed today, orders served today, and revenue today. It also breaks orders down by status and by waiter, and charts orders served per day over the last fourteen days.
* Do NOT implement later phases such as audit/history timeline (Goal 9) or slow-order alerts (Goal 10).
* Do NOT rewrite working architecture from previous phases.
* Preserve all existing functionality from Phases 1–8.
* Do NOT commit or push anything.
* Return a clear walkthrough of exactly what was implemented and the verification results.
```

### What you got
- Backend analytics endpoints: `GET /api/dashboard/stats` and `GET /api/dashboard` protected by `requireStaff`.
- Server-authoritative aggregation repository `DashboardRepository` computing:
  - Headline numbers: `openOrders` (active non-archived orders), `ordersPlacedToday`, `ordersServedToday`, and `revenueToday` (sum of served order totals).
  - Status pipeline breakdown across all 6 lifecycle states (`placed`, `accepted`, `preparing`, `ready`, `served`, `cancelled`).
  - Waiter performance breakdown with order counts and total non-cancelled revenue.
  - 14-day served orders chart series with chronological ordering and zero-filling.
- Frontend component `DashboardView.tsx` with responsive headline cards, status distribution bars, 14-day history chart, and waitstaff leaderboard.
- Added Dashboard navigation tab in `App.tsx`.
- 10 new backend automated test cases (`tests/dashboard.test.ts`) and 6 new frontend test cases (`tests/Dashboard.test.tsx`), bringing total test suite to 168 passing automated tests (125 backend, 43 frontend).

### What you corrected
1. **Relative API Base URL in Frontend Service**: Switched from `new URL()` to string concatenation in `client/src/services/dashboard.service.ts` so relative base URLs (e.g. `/api`) work seamlessly in browser and Node/jsdom test environments.
2. **Backward Compatibility for Tab Default**: Preserved default tab state while making the Dashboard tab prominently available in the navigation bar, ensuring existing Phase 3–8 frontend component tests continue to mount smoothly.

---

## Phase 10 — History You Cannot Rewrite / Order Audit Timeline (Goal 9)

### Prompt
```
# Phase 10 — Order Audit History Timeline (Goal 9)

We are continuing the Restaurant Orders take-home assignment.
Implement ONLY Goal 9 from the ORIGINAL TAKE-HOME ASSIGNMENT SPECIFICATION:
* 9. History you cannot rewrite. Every order has a timeline showing every status change with the old and new status and who made it, every line added or voided with its reason, and any notes left on it. Nothing in this timeline can be edited or deleted after the fact, including by managers.
* Do NOT implement later phases such as slow-order alerts (Goal 10).
* Do NOT rewrite working architecture from previous phases.
* Preserve all existing functionality from Phases 1–9.
* Do NOT commit or push anything.
* Return a clear walkthrough of exactly what was implemented and the verification results.
```

### What you got
- Database migration `005_create_order_audit_events.sql` creating table `order_audit_events` with indexed compound key `(order_id, created_at ASC)`.
- Immutability guarantee: append-only table structure with no `UPDATE` or `DELETE` API endpoints (returns 404/405), ensuring timeline cannot be altered even by managers.
- Server-authoritative actor identity: all timeline events snapshot `actor_id`, `actor_name`, and `actor_role` directly from authenticated JWT sessions (`req.user`).
- Transactional recording across all order mutations:
  - `order_created`: logs initial placement, table number, and line count.
  - `status_changed`: logs transition from `old_status` to `new_status` with optional transition reason (or cancellation reason).
  - `line_added`: snapshots menu item name, quantity, unit price, and special instructions.
  - `line_voided`: snapshots item name, quantity, unit price, and mandatory void reason.
  - `collaborator_added` / `collaborator_removed`: logs assignment and removal of waitstaff collaborators.
- API endpoints `GET /api/orders/:id/timeline` and `GET /api/orders/:id/history` with scoped authorization (`canAccessOrder`).
- Frontend interactive timeline view in `OrderList.tsx` rendering chronological events with color-coded badges, actor details, timestamps, status progression pills, line items, and void reasons.
- 12 new backend automated test cases (`tests/timeline.test.ts`) and 4 new frontend test cases (`tests/Timeline.test.tsx`), bringing the total test suite to 184 passing automated tests (137 backend, 47 frontend).

### What you corrected
1. **JWT Helper Method Naming**: Updated token signing in `timeline.test.ts` to call `signToken` (canonical auth helper) instead of `generateAccessToken`.
2. **Menu Item Category Invariant**: Added required `category` fields (`Mains`, `Beverages`, `Desserts`) to menu seed calls in `timeline.test.ts` to satisfy database and domain constraints.
3. **Manager Name Seed Alignment**: Fixed manager display name assertion in `timeline.test.ts` to match the repository's seeded user name (`Alex Rivera (Manager)`).
4. **Test Query Exactness**: Used `getAllByText` in frontend timeline tests when querying items displayed in both active lines and timeline event summaries.
