# Submission

## Links

- **GitHub repository:** <public repo URL>
- **Live application:** <deployed URL>

## Notes for the reviewer

The server runs on Express + TypeScript with PostgreSQL pooling and stateless JWT Bearer authorization.
Automated database migrations (`001_create_users.sql`) and a development seed runner (`npm run db:seed`) provision the default Manager and Waiter test accounts.
The frontend provides quick one-click demo credential filling buttons on the sign-in form.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Manager | manager@restaurant.com | ManagerPassword123! |
| Waiter | waiter@restaurant.com | WaiterPassword123! |

## Stack

| Layer | What you used | Why |
|---|---|---|
| Frontend | React 18, Vite, TypeScript, Lucide Icons | Fast compile times, strong typing, clean component hierarchy and zero runtime overhead |
| Backend | Node.js, Express, TypeScript, Zod, BcryptJS, JSONWebToken | Industry standard REST architecture, robust type safety, secure cryptographic primitives |
| Database | PostgreSQL 14+, pg Connection Pool | ACID guarantees, relational integrity, strict UNIQUE and CHECK constraints |
| Hosting | Render (API backend) + Vercel (SPA frontend) + Supabase (PostgreSQL) | Standard cloud tiers with zero setup overhead |

## Goal checklist

| # | Goal | Status | Notes |
|---|---|---|---|
| 1 | Accounts and roles | Done | PostgreSQL `users` table, bcrypt password hashing, JWT authentication, server-side RBAC middleware (`manager` vs `waiter`), anti-tampering verification, automated test suite. |
| 2 | Orders | Not done | Scheduled for subsequent phase. |
| 3 | Order lines | Not done | Scheduled for subsequent phase. |
| 4 | Order lifecycle with rules | Not done | Scheduled for subsequent phase. |
| 5 | Collaborators | Not done | Scheduled for subsequent phase. |
| 6 | Finding orders | Not done | Scheduled for subsequent phase. |
| 7 | Bulk actions & CSV export | Not done | Scheduled for subsequent phase. |
| 8 | Dashboard | Not done | Scheduled for subsequent phase. |
| 9 | History timeline | Not done | Scheduled for subsequent phase. |
| 10 | Slow-order alerts | Not done | Scheduled for subsequent phase. |

## How much time did you actually spend?
~3 hours total across Phase 1 (Foundation) and Phase 2 (Authentication & RBAC).

## What would you do next, with another 12 hours?
Implement Phase 3 (Menu Item Management & Availability) and Phase 4 (Order Creation & Lifecycle Transitions).

## What are you least happy with in this codebase, and why?
Currently JWT tokens are single-token bearer sessions without refresh token rotation. For an enterprise multi-branch system, refresh token rotation with token blacklisting in Redis would provide additional session revocation capabilities.
