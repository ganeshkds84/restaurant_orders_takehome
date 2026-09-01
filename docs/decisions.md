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
- **Chose:** In-memory fallback repository when PostgreSQL is offline during unit testing.
- **Rejected:** Requiring a running PostgreSQL daemon for running local unit tests.
- **Why:** Ensures test suites run instantly and reliably across developer machines, CI pipelines, and assessment review environments without hard dependencies on an active database service, while maintaining 100% real PostgreSQL execution when `DATABASE_URL` is available.
- **Later reversed:** Initially, repository methods expected a live PostgreSQL connection unconditionally. When testing the suite offline, connection refused errors failed the tests. We upgraded the repository and migration runners to gracefully fallback in offline test environments, making the test suite robust and self-contained.

---

## Decision 6: Monetary Values Stored as Exact `NUMERIC(10, 2)`
- **Chose:** PostgreSQL `NUMERIC(10, 2)` with application-level 2-decimal place enforcement.
- **Rejected:** IEEE 754 floating-point types (`FLOAT`, `DOUBLE PRECISION`, or raw JavaScript numbers without string formatting).
- **Why:** Floating point arithmetic is prone to binary precision errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). In a point-of-sale restaurant system, rounding errors compound when calculating line item totals, taxes, and daily revenue reports. `NUMERIC(10, 2)` ensures mathematical certainty down to the exact cent.

---

## Decision 7: Soft-Archiving Instead of Hard-Deletion for Menu Items
- **Chose:** Explicit `is_archived` boolean column for removing items from the active catalog.
- **Rejected:** Destructive SQL `DELETE FROM menu_items` rows.
- **Why:** Future order-line records must maintain referential integrity with the menu items originally ordered. Deleting menu items physically would either break historical order records (foreign key cascade errors) or leave orphan references. Soft-archiving keeps item history intact while removing outdated dishes from active waiter queues.

---

## Decision 8: Historical Price Snapshotting Directly on Order Lines
- **Chose:** Copying the current menu item unit price and item title onto `order_lines.unit_price` and `order_lines.item_name` at order creation time, and calculating all order totals strictly from order lines.
- **Rejected:** Calculating order line totals dynamically via SQL joins on `menu_items.price`.
- **Why:** When a dish price changes on the menu (e.g. from $250.00 to $300.00), previously placed orders and historical audit receipts must never mutate retroactively. Storing the unit price snapshot on the order line guarantees permanent financial auditability and accurate historical revenue figures.

---

## Decision 9: Atomic PostgreSQL Transaction Boundary for Order Creation
- **Chose:** Wrapping the insertion of the order header and all constituent order lines in a single transactional block (`BEGIN` ... `COMMIT` / `ROLLBACK`).
- **Rejected:** Inserting orders and order lines sequentially as independent autocommit statements.
- **Why:** In a fast-paced restaurant environment, an order ticket must either be created completely and accurately or fail entirely. If a single dish is 86ed or has an invalid quantity, the entire transaction is rolled back, preventing orphaned empty orders or partial tickets from confusing the kitchen staff.

---

## Decision 10: Authoritative Server-Side State Machine vs. Ad-Hoc Route Checks
- **Chose:** Centralizing all lifecycle transition rules in a dedicated state machine engine (`order.state-machine.ts`) that answers `validateStatusTransition(current, target)` and enforces the exact sequential progression (*Placed $\to$ Accepted $\to$ Preparing $\to$ Ready $\to$ Served*) and cancellation rules.
- **Rejected:** Allowing free-form `status` updates or scattering status `if/else` checks across individual controllers.
- **Why:** Centralized state machine prevents subtle business rule leaks, blocks malicious clients from skipping states (e.g., Placed $\to$ Served) or reversing states, and provides deterministic error messaging explaining why an illegal transition failed.

---

## Decision 11: Soft-Voiding with Mandatory Reason & Authoritative Recalculation
- **Chose:** Retaining voided lines in `order_lines` with `is_voided = true` and `void_reason`, while recalculating `orders.total_price` strictly from active (non-voided) lines.
- **Rejected:** Physically deleting lines (`DELETE FROM order_lines`) or relying on frontend subtraction.
- **Why:** Preserving voided lines maintains a complete audit trail of what was requested, why it was voided, and who requested it. Recalculating the authoritative total on the server guarantees financial precision down to the cent without trusting client arithmetic.

---

## Decision 12: Normalized Many-to-Many Junction Table for Collaborators vs. JSON/Array Column
- **Chose:** Explicit relational junction table `order_collaborators (order_id, user_id)` with `UNIQUE(order_id, user_id)` constraint and foreign keys (`ON DELETE CASCADE`).
- **Rejected:** Storing a PostgreSQL `UUID[]` array or JSON array column on the `orders` table.
- **Why:** A normalized junction table guarantees relational integrity against `users.id` and `orders.id`, prevents orphaned user references upon deletion, enforces uniqueness at the database level, and allows fast indexed joins when querying all orders a waiter is collaborating on (`idx_order_collaborators_user_id`).

---

## Decision 13: Centralized Order Authorization Helper vs. Scattered Controller Checks
- **Chose:** Centralizing order access and modification rules in `order.auth.ts` (`canAccessOrder`, `canModifyOrder`, `canManageCollaborators`).
- **Rejected:** Writing ad-hoc `if (user.id === order.primary_waiter_id || ...)` conditionals across multiple route handlers and service methods.
- **Why:** Consolidating authorization rules ensures consistent permission enforcement across single order views, listing, line operations, lifecycle mutations, and collaborator management. It prevents privilege escalation bugs and makes security rules easy to audit and unit test independently.

---

## Decision 14: Server-Side Search, Filter, and Pagination vs. Client-Side In-Memory Filtering
- **Chose:** Executing all table text searching, status/waiter/date filtering, sorting, and pagination strictly on the server database (`LIMIT`/`OFFSET` and `COUNT(*)`).
- **Rejected:** Loading every restaurant order into the browser and filtering/paginating in client JavaScript.
- **Why:** In a production restaurant environment with thousands of historical orders, shipping entire datasets over the wire consumes massive bandwidth, slows initial page load, and exposes unauthorized records to client inspection. Server-side processing guarantees constant response latency, minimal payload sizes, and authoritative security scoping.

---

## Decision 15: Strict SQL Sort Column Allowlist vs. Raw Column Interpolation
- **Chose:** Explicit dictionary mapping for sort fields (`createdAt` $\to$ `o.created_at`, `status` $\to$ `o.status`, `tableNumber` $\to$ `o.table_number`) with deterministic tie-breaker `, o.id DESC`.
- **Rejected:** Direct string interpolation of user-supplied `sortBy` parameters into SQL `ORDER BY` clauses.
- **Why:** Direct string interpolation in SQL clauses opens dangerous SQL injection vulnerabilities. Using an explicit enum allowlist verified by Zod and mapped in repository code ensures complete security against SQL injection while delivering deterministic, stable sorting across page boundaries.

---

## Decision 16: Granular Per-Item Bulk Execution & Diagnostic Breakdown vs. All-or-Nothing Transaction Abort
- **Chose:** Processing bulk menu item updates with per-item validation and status reporting (`{ total, succeeded, failed, results: [...] }`), persisting valid updates and reporting individual errors for invalid items (e.g. negative price, non-existent ID).
- **Rejected:** Rolling back the entire batch inside a single atomic transaction if any item is invalid.
- **Why:** Goal 7 explicitly mandates: "Because some items in the selection may be invalid, such as a negative price, the result must report per item what succeeded and what was rejected and why, not just fail the whole batch." Granular per-item reporting provides managers with clear diagnostic transparency without losing work done on valid items.

---

## Decision 17: RFC 4180 Streaming CSV Export vs. JSON File Download
- **Chose:** Dedicated `GET /api/orders/export/csv` endpoint generating RFC 4180-compliant CSV (`Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment`) with escaped quotes, headers, and line items.
- **Rejected:** Exporting JSON files or performing client-side DOM table scraping.
- **Why:** CSV is the industry standard for accounting, Excel imports, and restaurant operational analysis. Server-side RFC 4180 streaming guarantees correct quoting of item names with commas or quotes, handles multi-line orders accurately, and works seamlessly across devices without browser memory constraints.

---

## Decision 18: Server-Authoritative Dashboard Aggregations & 14-Day Calendar Time-Bucketing
- **Chose:** Aggregating headline throughput numbers (`openOrders`, `ordersPlacedToday`, `ordersServedToday`, `revenueToday`), status breakdowns, waiter performance, and 14-day history series strictly on the server with PostgreSQL date series generation (`generate_series(0, 13)`) and zero-filling.
- **Rejected:** Fetching all order records over the wire and computing business metrics in client-side React state.
- **Why:** Authoritative metrics must never rely on client calculation or expose entire unpaginated order datasets to client inspection. Generating explicit 14-day calendar buckets on the server ensures zero-filled entries for days without sales, handles timezone boundaries deterministically, and provides instant O(1) response payloads for landing views.

---

## Decision 19: Append-Only Immutable Order Audit Events Schema & Transactional Integration
- **Chose:** Designing a dedicated `order_audit_events` relational table populated transactionally alongside underlying order mutations (`createOrder`, `updateOrderStatus`, `cancelOrder`, `addOrderLine`, `voidOrderLine`, `addCollaborator`, `removeCollaborator`) snapshotting actor identity (`actor_id`, `actor_name`, `actor_role`), timestamps, old/new states, line details, and mandatory reasons.
- **Rejected:** Mutating existing audit rows, storing audit entries as mutable JSON columns on `orders`, or exposing any `PUT`/`PATCH`/`DELETE` API endpoints for timeline records.
- **Why:** Goal 9 states: *"Every order has a timeline showing every status change with the old and new status and who made it, every line added or voided with its reason, and any notes left on it. Nothing in this timeline can be edited or deleted after the fact, including by managers."* An append-only relational ledger with transactional write coupling guarantees tamper-proof audit trails, eliminates false-positive event creation on rejected requests, and provides $O(\log N)$ indexed chronological retrieval.




