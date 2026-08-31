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
