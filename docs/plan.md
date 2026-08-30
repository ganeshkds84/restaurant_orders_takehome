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
- **Future Sessions (Planned)**
  - Session 3: Menu Item Management & Bulk Operations (Phase 3)
  - Session 4: Orders & Order Lines Lifecycle (Phase 4)
  - Session 5: Waiter Collaborators & Order Search/Filters/Pagination (Phase 5)
  - Session 6: Dashboard, History Timeline & Slow-Order Alerts (Phase 6)

---

## 2. Order of Implementation and Rationale
1. **Schema & Password Hashing First**: Modeled database entities and security primitives first to guarantee reliable persistence.
2. **Backend Services & RBAC Middleware**: Built and verified authorization logic on the server before building any client UI.
3. **Automated Backend Tests**: Validated every security rule (anti-tampering, unauthorized rejection, role restrictions) with Vitest/Supertest.
4. **Frontend UI & State Management**: Integrated React AuthContext, LoginForm, and interactive verification dashboards on top of verified APIs.

---

## 3. Estimated vs. Actual Time
- **Database Migrations & Models**: Estimated 30m, took ~20m.
- **Auth & RBAC Middleware**: Estimated 45m, took ~35m.
- **Backend Tests (16 cases)**: Estimated 45m, took ~40m.
- **Frontend Authentication UI & Tests**: Estimated 45m, took ~35m.
- **Documentation**: Estimated 30m, took ~25m.

---

## 4. What Was Cut or Deferred
- Public self-registration was deliberately excluded as restaurant accounts must be pre-provisioned.
- Advanced refresh token rotation was deferred in favor of standard single-token JWT sessions with clean expiration to keep the architecture focused and maintainable for this take-home scope.
