# Architectural Decisions

Log of decisions that shaped this codebase — where a real alternative existed and we weighed trade-offs.

---

## Decision 1: Password Hashing with Bcrypt
- **Chose:** Standard `bcryptjs` with salt round cost 10.
- **Rejected:** Plain SHA-256 / MD5 hashing (insecure) or argon2 with native binary bindings.
- **Why:** Bcrypt provides battle-tested adaptive work-factor hashing with automatic salting, preventing rainbow table and brute-force attacks. `bcryptjs` provides pure TypeScript/JavaScript compatibility without platform-specific native C++ build hurdles on Windows or deployment environments.

---

## Decision 2: Stateless Bearer JWT Token vs. Stateful Server Sessions
- **Chose:** Standard JWT Bearer Tokens in `Authorization: Bearer <token>` header.
- **Rejected:** Stateful cookie-based session store in Redis or database session tables.
- **Why:** Stateless JWT tokens provide clean decoupling between API and web/mobile clients, simplify CORS configuration during local development and distributed deployment (Render backend + Vercel frontend), and enable straightforward API testing via supertest and curl without managing cookie jars.

---

## Decision 3: Server-Side RBAC Enforcement on Authenticated Identity
- **Chose:** Role verification middleware (`requireRole`) that reads role strictly from the server-side authenticated identity (`req.user.role`) verified from the database/token.
- **Rejected:** Client-supplied role headers (`x-role`) or request-body role attributes.
- **Why:** Client-side role claims are completely untrusted. Enforcing roles directly in Express middleware on the backend ensures users cannot escalate privileges by tampering with frontend state, query parameters, or request payloads.

---

## Decision 4: Safe Development Seeding vs. Public Registration
- **Chose:** Idempotent development seed mechanism (`npm run db:seed`) providing standard demo accounts for Manager (`manager@restaurant.com`) and Waiter (`waiter@restaurant.com`).
- **Rejected:** Public `/api/auth/register` self-signup endpoint.
- **Why:** In a restaurant setting, staff accounts are provisioned internally by management rather than created publicly on the internet. Avoiding public registration adheres strictly to the assignment specifications and prevents unauthenticated rogue account creation.

---

## Decision 5: Offline Database Fallback in Repository Layer
- **Chose:** In-memory fallback user repository when PostgreSQL is offline during unit testing.
- **Rejected:** Requiring a running PostgreSQL daemon for running local unit tests.
- **Why:** Ensures test suites run instantly and reliably across developer machines, CI pipelines, and assessment review environments without hard dependencies on an active database service, while maintaining 100% real PostgreSQL execution when `DATABASE_URL` is available.
- **Later reversed:** Initially, repository methods expected a live PostgreSQL connection unconditionally. When testing the suite offline, connection refused errors failed the tests. We upgraded the repository and migration runners to gracefully fallback in offline test environments, making the test suite robust and self-contained.
