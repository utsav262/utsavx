# UTSAVX

A MERN event ticketing platform for India — customer, organizer, and admin workflows with INR pricing.

## Run locally

1. Copy `.env.example` to `server/.env` and set at least `MONGO_URI` and a **32+ character** `JWT_SECRET`.
2. Start infrastructure: `docker compose up -d` (optional). Ensure **MongoDB** is running on `27017`. **Redis** on `6379` is recommended for rate limits + browse caches (API still runs without it).
3. Install dependencies: `npm run install:all`.
4. Start both apps: `npm run dev`.
5. Open `http://localhost:5173`.

Checkout holds inventory for `HOLD_TTL_MINUTES` (default 15). Unpaid pending orders are cancelled and stock is released automatically.

## Deploy

### Frontend (Vercel)

- Root Directory: `client`
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://YOUR-RENDER-API.onrender.com/api/v1`

### Backend (Render)

1. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster and copy the connection string.
2. (Recommended) Create a Redis instance ([Upstash](https://upstash.com) free tier works).
3. On [Render](https://dashboard.render.com): **New → Web Service** → connect `utsav262/utsavx`.
4. Settings:

| Field | Value |
|-------|--------|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` (or leave default after pushing the no-op `build` script) |
| Start Command | `npm start` |
| Health Check Path | `/health` |

5. Environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas URI |
| `JWT_SECRET` | 32+ random characters |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `REDIS_URL` | Redis URL (optional but recommended) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | if using live checkout |

Or use the repo Blueprint: **New → Blueprint** → select this repo (`render.yaml`).

6. After deploy, open `https://YOUR-SERVICE.onrender.com/health` — expect `{"ok":true,...}`.
7. Set that host in Vercel as `VITE_API_URL` and redeploy the frontend.

> Free Render web services sleep after idle time; the first request may take ~30–60s to wake.

API: `http://localhost:5050/api/v1`.

Swagger UI: [http://localhost:5050/api-docs](http://localhost:5050/api-docs) · raw OpenAPI JSON: `/api-docs.json`.

New accounts need passwords of **8+ characters with a letter and a number**. In production, set Razorpay keys (or `ALLOW_DEMO_PAYMENTS=true` only if you intentionally want free checkout), a unique `JWT_SECRET`, and `CLIENT_URL`.

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
4. Pay with Razorpay → tickets + QR at `/tickets`

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

Configure **Razorpay** in `server/.env`:

```
RAZORPAY_KEY_ID=rzp_test_…
RAZORPAY_KEY_SECRET=…
```

Checkout creates a Razorpay order, opens Checkout.js (UPI / card / netbanking), then verifies the signature server-side before issuing tickets.

Without Razorpay (or Stripe) keys in development, checkout completes locally as a demo pay.

## Documentation

- Swagger UI: [http://localhost:5050/api-docs](http://localhost:5050/api-docs)
- OpenAPI JSON: [http://localhost:5050/api-docs.json](http://localhost:5050/api-docs.json)
- Manager APIs (A–Z): [docs/MANAGER_API.md](docs/MANAGER_API.md)
