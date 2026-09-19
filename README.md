# UTSAVX

A MERN event ticketing platform for India — customer, organizer, and admin workflows with INR pricing.

## Run locally

1. Copy `.env.example` to `server/.env` and set at least `MONGO_URI` and a **32+ character** `JWT_SECRET`.
2. Start infrastructure: `docker compose up -d` (optional).
3. Install dependencies: `npm run install:all`.
4. Start both apps: `npm run dev`.
5. Open `http://localhost:5173`.

API: `http://localhost:5050/api/v1`.

New accounts need passwords of **8+ characters with a letter and a number**. In production, set Stripe keys (or `ALLOW_DEMO_PAYMENTS=true` only if you intentionally want free checkout), a unique `JWT_SECRET`, and `CLIENT_URL`.

### Demo accounts

| Role | Email | Password | Entry |
|------|-------|----------|-------|
| Customer | `emma@utsavx.com` | `password123` | `/login` |
| Manager | `leo@utsavx.com` | `password123` | `/manager/login` |
| Admin | `admin@utsavx.com` | `password123` | `/admin/login` |

## User flows

### Dashboard (organizer + staff)
1. Login → `/dashboard` (Live / Past / Draft event list)
2. Tap **Dashboard** on a card → `/dashboard/events/:id` (role-based hub)
3. Roles are **per event** (`Owner`, `Manager`, `Event Scanner`, `Ambassador`…)
4. Scanners get check-ins; owners get full overview; invites land via **Requests**

### Guest / Customer
1. Browse `/` or `/events`
2. Open an event → **Get tickets** → Cart → Checkout
3. Sign in / sign up at `/login` if needed (returns to checkout)
4. Demo pay → tickets + QR at `/tickets`

### Manager (organizer)
1. `/manager/login` or `/manager/signup` (or customer → Host events → **Become a manager**)
2. Lands on `/dashboard` → **Create event** → submit for approval
3. After admin approval, event is Live and sellable
4. Event dashboard: sales, tickets, people, check-in

### Admin
1. `/admin/login` → `/admin`
2. **Pending** → Approve / Reject
3. **Events** → publish, unpublish, feature, cancel any event
4. **Users** → change roles
5. Can also Discover → buy tickets like any user

## Payments

Without Stripe keys, checkout completes locally in ₹ and issues tickets immediately.

## Documentation

- Manager APIs (A–Z): [docs/MANAGER_API.md](docs/MANAGER_API.md)
