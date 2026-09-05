# Spice Route Restaurant — Restaurant Orders Platform

> **Authentic Indian Dining • Operations Platform**  
> A high-reliability, full-stack restaurant operations platform replacing physical order tickets with real-time order lifecycle tracking, menu management, waiter collaboration, operational analytics, audit trails, and slow-order alerts.

### Quick Links & Live Demo
- **Live Application:** [https://restaurant-orders-client.onrender.com/](https://restaurant-orders-client.onrender.com/)
- **Backend Health Check:** [https://restaurant-orders-server.onrender.com/api/health](https://restaurant-orders-server.onrender.com/api/health)
- **Submission Document & Credentials:** [SUBMISSION.md](SUBMISSION.md)

---

## Project Overview

Spice Route Restaurant Orders is built to eliminate the errors and bottlenecks of paper-based restaurant operations: lost kitchen tickets, uncoordinated menu price changes, untracked order delays, and lack of visibility into daily revenue.

### Core Capabilities

- **Role-Based Access Control (RBAC)**: Distinct permissions for **Managers** (full menu management, bulk actions, operations dashboard, all orders) and **Waiters** (create orders, manage assigned/collaborative orders, read-only menu). All permissions are strictly enforced server-side.
- **Menu Management**: Real-time menu catalogue with categorisation, pricing, descriptions, and instantaneous availability toggling (86ing items).
- **Order Creation & Precision Pricing**: Real-time table order creation with unit price snapshotting on order lines (`NUMERIC(10, 2)` precision), guaranteeing that menu price changes never retroactively mutate past orders.
- **Authoritative Order Lifecycle**: Formal state machine progression (*Placed → Accepted → Preparing → Ready → Served*). Cancellations are strictly restricted to *Placed* or *Accepted* states. Order lines can be voided with mandatory reasons without deleting historical records.
- **Waiter Collaboration**: Primary waiter assignment with multi-waiter collaboration. Waiters can seamlessly view and manage orders they created or were added to.
- **Server-Side Order Search & Filtering**: Fast text search over table numbers, multi-criteria filtering (status, waiter, date), multi-field sorting, and pagination with full count metadata.
- **Bulk Menu Actions & CSV Export**: Bulk price adjustments and availability toggles with granular, per-item success/failure reporting. Daily orders export to standard RFC 4180 CSV for accounting and reconciliation.
- **Operations Dashboard**: Real-time operational intelligence including today's revenue, active open orders, orders placed/served, status distribution breakdown, waiter performance metrics, and a 14-day volume trend chart.
- **Immutable Audit History**: Tamper-proof, append-only timeline tracking every status change (with old/new state and actor), line addition, line voiding (with reason), and ticket notes.
- **Slow-Order Alerts**: Dynamic server-side elapsed time monitoring for open orders exceeding configurable thresholds. Includes alert acknowledgement, navigation badge indicators, and automatic re-alert reactivation.

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Tooling**: Vite (fast HMR, optimized production bundling)
- **Icons**: Lucide Icons (`lucide-react`)
- **Styling**: Vanilla CSS design system with curated responsive design and Indian restaurant branding
- **Testing**: Vitest, React Testing Library, jsdom

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express with TypeScript
- **Validation**: Zod (strict runtime schema parsing for requests, queries, and environment variables)
- **Security**: `bcryptjs` (salted password hashing), `jsonwebtoken` (stateless JWT Bearer authorization)
- **Database Client**: `pg` (PostgreSQL client pool with parameterised queries)
- **Logging**: Winston (structured JSON and colored console logging)
- **Testing**: Vitest, Supertest

### Database
- **Engine**: PostgreSQL 14+
- **Data Types**: `UUID` primary keys, `NUMERIC(10, 2)` for monetary values, `TIMESTAMPTZ` for audit timestamps
- **Integrity**: Strict foreign key constraints (`ON DELETE CASCADE` / `ON DELETE RESTRICT`), check constraints (`price >= 0`, `quantity > 0`), and compound indexes for fast lookups
- **Migrations**: Sequential SQL migrations with transactional tracking

> **Note**: This project uses native **PostgreSQL** with connection pooling (`pg`), not Supabase.

---

## Architecture

The backend adheres to a clean, decoupled layered architecture:

```
HTTP Request
     │
     ▼
[ Express Router ] ── (Routes, CORS, JWT Auth & RBAC Middleware)
     │
     ▼
[ Zod Validation ] ── (Input Sanitization & Schema Parsing)
     │
     ▼
[ Service Layer  ] ── (Business Logic, State Machine, Authorization Rules)
     │
     ▼
[ Repository     ] ── (PostgreSQL Parameterized Queries & Transactions)
     │
     ▼
[ PostgreSQL DB  ] ── (Tables, Constraints, Indexes, Audit Ledger)
```

- **Authentication & Authorization**: Handled via stateless JWT bearer tokens in `Authorization: Bearer <token>` headers. Centralized middleware (`authenticate`, `requireRole`, `order.auth.ts`) guarantees that unauthorized actors cannot inspect or modify orders.
- **Financial Precision**: Monetary amounts are stored as `NUMERIC(10, 2)` in PostgreSQL and handled as precise numbers in the backend, eliminating floating-point rounding errors.
- **Dual-Mode Data Access**: Repositories support live PostgreSQL pooling with an automated, in-memory fallback store for offline testing resilience.

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher (running locally or accessible via network)

---

## Installation & Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/ganeshkds84/restaurant_orders_takehome.git
cd restaurant_orders_takehome
```

### 2. Install Dependencies
Install all workspace dependencies across root, server, and client:
```bash
npm run install:all
```
*(Or install individually: `npm install`, `npm install --prefix server`, and `npm install --prefix client`)*

### 3. Configure Environment Variables
Copy the example environment files:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration (optional, defaults to /api proxy)
cp client/.env.example client/.env
```

Review and update `server/.env` with your PostgreSQL database credentials:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_orders
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=development_jwt_secret_key_restaurant_orders_super_secure_phase2
JWT_EXPIRES_IN=8h
```

### 4. Create and Migrate the Database
Create the database in PostgreSQL (e.g. using `psql`):
```sql
CREATE DATABASE restaurant_orders;
```

Run the automated SQL migrations:
```bash
npm run db:migrate
```

### 5. Seed Demo Data
Populate initial demo staff accounts and authentic Indian restaurant menu items:
```bash
npm run db:seed
```

### 6. Start the Application
Run both backend and frontend concurrently in development mode:
```bash
npm run dev
```

Alternatively, run them in separate terminals:
```bash
# Terminal 1 — Backend API (http://localhost:4000)
npm run dev:server

# Terminal 2 — Frontend App (http://localhost:5173)
npm run dev:client
```

Open your browser and navigate to `http://localhost:5173`.

---

## Environment Variables Reference

### Backend (`server/.env`)

| Variable | Type | Default | Description | Required |
|---|---|---|---|---|
| `PORT` | Number | `4000` | Port for the Express backend server | Optional |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`) | Optional |
| `DATABASE_URL` | String | `postgresql://postgres:postgres@localhost:5432/restaurant_orders` | PostgreSQL connection string | Required in production |
| `CORS_ORIGIN` | String | `http://localhost:5173` | Allowed origin for frontend CORS requests | Optional |
| `JWT_SECRET` | String | *(development secret)* | Secret key for signing and verifying JWT tokens | Required in production |
| `JWT_EXPIRES_IN` | String | `8h` | Token expiration duration string (e.g. `8h`, `1d`) | Optional |

### Frontend (`client/.env`)

| Variable | Type | Default | Description | Required |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | String | `/api` | Base path or URL for backend API endpoints | Optional |

---

## Database Migrations

Database migrations are located in `server/src/db/migrations/` and run sequentially via `npm run db:migrate`:

1. `001_create_users.sql`: Creates `users` table with email uniqueness, bcrypt password hash, and `manager` / `waiter` roles.
2. `002_create_menu_items.sql`: Creates `menu_items` table with categories, descriptions, `NUMERIC(10, 2)` prices, and availability flags.
3. `003_create_orders_and_order_lines.sql`: Creates `orders` and `order_lines` tables with unit price snapshotting, foreign keys, and status constraints.
4. `004_create_order_collaborators.sql`: Creates `order_collaborators` junction table supporting multi-waiter assignments.
5. `005_create_order_audit_events.sql`: Creates `order_audit_events` immutable ledger table with chronological indexing.
6. `006_create_order_alert_acknowledgements.sql`: Creates `order_alert_acknowledgements` table tracking alert dismissals and re-alert cycles.

---

## Running Tests

The test suite contains 205 automated tests verifying business logic, edge cases, RBAC security, state machines, and frontend user flows.

```bash
# Run all tests across backend and frontend
npm run test

# Run backend tests only (Vitest + Supertest)
npm run test:server

# Run frontend tests only (Vitest + React Testing Library)
npm run test:client
```

### Current Test Suite Status
- **Backend**: 148 / 148 passing (10 test files)
- **Frontend**: 57 / 57 passing (12 test files)
- **Total**: 205 / 205 passing

---

## Build & Typecheck

```bash
# Typecheck both backend and frontend
npm run typecheck

# Build both backend and frontend for production
npm run build
```

Individual commands:
- `npm run typecheck:server` / `npm run typecheck:client`
- `npm run build:server` / `npm run build:client`

---

## Demo Credentials & Evaluator Notes

For convenience, the login interface features **one-click demo login buttons** that pre-fill credentials for testing.

Evaluator credentials, implementation mapping, and assignment details are fully documented in [SUBMISSION.md](file:///c:/PROJECTS/takehome_09/Proj_K/SUBMISSION.md).
