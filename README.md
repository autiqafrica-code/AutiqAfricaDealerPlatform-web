# Autiq Africa Dealer & Workshop Platform

Multi-tenant SaaS platform for African automotive dealers and workshops. Manages the full workshop service lifecycle — customer intake, quotations, job cards, technician updates, customer approvals, invoicing, and payments — across multiple clients, workshops, and currencies.

---

## Architecture

| App | Folder | Local URL | Purpose |
|-----|--------|-----------|---------|
| **Frontend** | `frontend/` | http://localhost:8174 | Workshop staff app — all non-admin roles |
| **Admin Portal** | `admin/` | http://localhost:5174 | Enterprise Admin + Support Admin |
| **Backend API** | `backend/` | http://localhost:8005 | Express.js REST API + Prisma ORM |

---

## Quick Start

### Step 1 — Install root tooling
```bash
npm install
```
This installs `concurrently` (the only root-level dependency).

### Step 2 — Configure environment files
```bash
# Backend (required before any API calls)
copy backend\.env.example backend\.env
# Edit backend\.env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Frontend (optional — only needed when connecting to real API)
copy frontend\.env.example frontend\.env.local

# Admin (optional — only needed when connecting to real API)
copy admin\.env.example admin\.env.local
```

### Step 3 — Install all dependencies, generate Prisma client, and seed the database
```bash
npm run setup
```
This runs in sequence:
1. `npm install` in `frontend/`
2. `npm install` in `admin/`
3. `npm install` in `backend/`
4. `npx prisma generate` (generates the Prisma client)
5. `node database/seeds/seed.js` (seeds modules, demo client, demo workshop, and all role users)

### Step 4 — Start all three apps simultaneously
```bash
npm run dev
```
Opens three colour-coded processes in one terminal:
- **CYAN** — Frontend at http://localhost:8174
- **MAGENTA** — Admin portal at http://localhost:5174
- **GREEN** — Backend API at http://localhost:8005

---

## Individual App Commands

```bash
npm run dev:frontend    # Frontend only
npm run dev:admin       # Admin portal only
npm run dev:backend     # Backend API only
```

Or run manually from each folder:
```bash
cd frontend && npm run dev    # http://localhost:8174
cd admin    && npm run dev    # http://localhost:5174
cd backend  && npm run dev    # http://localhost:8005
```

---

## Login Credentials

### Workshop App — `http://localhost:8174`
> Login via `POST http://localhost:8005/api/auth/login`

| Role | Email | Password |
|------|-------|----------|
| Front Desk | `frontdesk@demo.autiq` | `FrontDesk@2026` |
| Technician | `technician@demo.autiq` | `Technician@2026` |
| Manager | `manager@demo.autiq` | `Manager@2026` |
| Workshop Controller | `controller@demo.autiq` | `Controller@2026` |
| Accounts | `accounts@demo.autiq` | `Accounts@2026` |
| Parts Interpreter | `partsinterp@demo.autiq` | `PartsInterp@2026` |
| Parts Controller | `partsctrl@demo.autiq` | `PartsCtrl@2026` |
| CEO | `ceo@demo.autiq` | `CEO@Demo2026` |

All workshop users belong to **Demo Workshop** under **Demo Dealer Group** (ZAR, Cape Town).

### Admin Portal — `http://localhost:5174`
> Login via `POST http://localhost:8005/api/auth/admin/login`

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Enterprise Admin | `owner@autiqafrica.com` | `Autiq@Admin2026` | `/admin/enterprise/*` only |
| Support Admin | `support@autiqafrica.com` | `Support@2026` | All routes (mock only — not in DB yet) |

> **Note:** Support Admin mock credentials are hardcoded in `admin/src/pages/AdminLogin.jsx` for development. The Enterprise Admin credentials are real database records created by the seed.

---

## Project Structure

```
autiq-africa-platform/
│
├── frontend/                        # Workshop staff React app (port 8174)
│   ├── public/assets/               # Logo and image assets
│   ├── src/
│   │   ├── components/              # Layout, sidebar, shared UI components
│   │   ├── data/mockData.js         # All mock data (roles, clients, users, jobs)
│   │   ├── pages/
│   │   │   ├── public/              # Landing, Login, Features, Pricing, etc.
│   │   │   ├── enterprise/          # Enterprise Admin screens (legacy, being migrated)
│   │   │   ├── frontdesk/           # Front Desk screens
│   │   │   ├── technician/          # Technician screens
│   │   │   ├── manager/             # Manager screens
│   │   │   ├── workshop/            # Workshop Controller screens
│   │   │   ├── accounts/            # Accounts screens
│   │   │   ├── parts/               # Parts screens
│   │   │   ├── ceo/                 # CEO screens
│   │   │   ├── shared/              # Shared: Dashboard, Kanban, Calendar
│   │   │   └── reports/             # Reports screens
│   │   ├── styles/global.css        # Design system (CSS variables, components)
│   │   ├── App.jsx                  # React Router routes
│   │   └── main.jsx                 # App entry point
│   ├── .env.example                 # Environment template
│   ├── package.json                 # name: autiq-africa-frontend
│   └── vite.config.js               # Vite config (port 8174)
│
├── admin/                           # Admin portal React app (port 5174)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminLayout.jsx      # Sidebar with role-aware collapsible nav
│   │   │   └── ProtectedRoute.jsx   # Route guard (role + path check)
│   │   ├── config/
│   │   │   ├── roles.js             # Role constants (SUPPORT_ADMIN, ENTERPRISE_ADMIN)
│   │   │   └── permissions.js       # canAccess(role, path) helper
│   │   ├── data/mockData.js         # Shared mock data (copy of frontend)
│   │   ├── pages/
│   │   │   ├── AdminLogin.jsx       # Login page (role-aware redirect)
│   │   │   ├── enterprise-admin/    # 13 Enterprise Admin screens
│   │   │   │   ├── EnterpriseAdmin.jsx
│   │   │   │   ├── OnboardClient.jsx
│   │   │   │   ├── ConfigureModules.jsx
│   │   │   │   ├── ModuleFunctions.jsx
│   │   │   │   ├── UserCredentials.jsx
│   │   │   │   ├── OnboardingEmail.jsx
│   │   │   │   ├── AllClients.jsx
│   │   │   │   ├── LoginActivity.jsx
│   │   │   │   ├── Revenue.jsx
│   │   │   │   ├── AdminUsers.jsx
│   │   │   │   ├── DataExport.jsx
│   │   │   │   ├── ServiceChecklists.jsx
│   │   │   │   └── ServicePricing.jsx
│   │   │   └── support-admin/       # 9 Support Admin placeholder screens
│   │   │       ├── SupportDashboard.jsx
│   │   │       ├── SupportClients.jsx
│   │   │       ├── SupportWorkshops.jsx
│   │   │       ├── PlatformUsers.jsx
│   │   │       ├── EnvVariables.jsx  # Masked secrets — never raw values
│   │   │       ├── FeatureFlags.jsx
│   │   │       ├── SupportAuditLogs.jsx
│   │   │       ├── SystemHealth.jsx
│   │   │       └── ImpersonationStub.jsx  # Disabled — pending security review
│   │   ├── styles/global.css        # Shared design system CSS
│   │   ├── App.jsx                  # Admin router (all routes)
│   │   └── main.jsx                 # App entry point
│   ├── .env.example                 # Environment template
│   ├── package.json                 # name: autiq-africa-admin
│   └── vite.config.js               # Vite config (port 5174)
│
├── backend/                         # Express.js API (port 8005)
│   ├── prisma/
│   │   └── schema.prisma            # 28-table Prisma schema with @map annotations
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_database.sql
│   │   │   ├── 002_create_schema.sql
│   │   │   └── 003_add_password_reset_tokens.sql
│   │   └── seeds/seed.js            # Full seed: modules + templates + all role users
│   └── src/
│       ├── config/
│       │   ├── db.js                # Prisma client singleton
│       │   └── env.js               # All env var exports (validated)
│       ├── middleware/
│       │   ├── auth.middleware.js    # JWT verification → req.user
│       │   ├── permission.middleware.js  # requireSupportAdmin / requireEnterpriseAdmin
│       │   ├── roleCheck.middleware.js   # Workshop role guard
│       │   ├── rateLimiter.middleware.js # express-rate-limit
│       │   ├── errorHandler.middleware.js
│       │   ├── requestLogger.middleware.js
│       │   └── multer.middleware.js  # File upload handling
│       ├── routes/
│       │   ├── auth.routes.js        # POST /api/auth/login|admin/login|refresh|logout
│       │   ├── clients.routes.js
│       │   ├── workshops.routes.js
│       │   ├── users.routes.js
│       │   ├── customers.routes.js
│       │   ├── vehicles.routes.js
│       │   ├── appointments.routes.js
│       │   ├── quotations.routes.js
│       │   ├── customerPortal.routes.js
│       │   ├── jobCards.routes.js
│       │   ├── parts.routes.js
│       │   ├── invoices.routes.js
│       │   ├── payments.routes.js
│       │   ├── reports.routes.js
│       │   ├── notifications.routes.js
│       │   ├── settings.routes.js
│       │   └── admin/
│       │       ├── enterprise.routes.js  # /api/admin/enterprise/*
│       │       └── support.routes.js     # /api/admin/support/*
│       ├── controllers/             # Request handlers (auth implemented; rest are stubs)
│       │   └── admin/               # enterprise.controller.js, support.controller.js
│       ├── services/                # Business logic (auth implemented; rest are stubs)
│       │   └── admin/               # enterprise.service.js, support.service.js
│       ├── validators/              # express-validator rule sets
│       ├── utils/                   # logger, apiResponse, pagination, idGenerator
│       ├── app.js                   # Express app, middleware, route mounting
│       └── server.js                # HTTP server + graceful shutdown
│
├── ADMIN_API_STRUCTURE.md           # All /api/admin/* endpoint contracts
├── ROLE_PERMISSION_MATRIX.md        # Full role × route access table
├── BACKEND_API_STRUCTURE.md         # All workshop API endpoint contracts
├── DATABASE_STRUCTURE.md            # PostgreSQL schema reference
├── package.json                     # Root coordinator (concurrently scripts)
└── .gitignore
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend / Admin UI | React 18, Vite 5, React Router v6, Lucide React |
| Backend | Node.js 18+, Express.js 4, Prisma ORM v5 |
| Database | PostgreSQL (28 tables, 24 enums) |
| Authentication | JWT access tokens (8h) + refresh tokens (7d), bcrypt 12 rounds |
| Validation | express-validator |
| File uploads | Multer |
| Logging | Winston |
| Rate limiting | express-rate-limit |
| Dev tooling | nodemon, concurrently |

---

## API Overview

### Auth Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Workshop user login → JWT + refresh token |
| POST | `/api/auth/admin/login` | Enterprise Admin login → JWT + refresh token |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| POST | `/api/auth/forgot-password` | Trigger password reset email |
| POST | `/api/auth/reset-password` | Consume reset token + set new password |

### Workshop API (stub — not yet implemented)
`/api/clients`, `/api/workshops`, `/api/users`, `/api/customers`, `/api/vehicles`,
`/api/appointments`, `/api/quotations`, `/api/jobs`, `/api/parts`, `/api/invoices`,
`/api/payments`, `/api/reports`, `/api/notifications`, `/api/settings`

### Admin API (stub — auth wired, business logic pending)
| Prefix | Role Required | Description |
|--------|---------------|-------------|
| `/api/admin/enterprise/*` | Enterprise Admin or Support Admin | Enterprise-scoped data |
| `/api/admin/support/*` | Support Admin only | Platform-wide data + config |

Full contract: see `ADMIN_API_STRUCTURE.md`

---

## Database

- **Database:** `autiq_africa_db` on PostgreSQL (localhost:5432)
- **Schema:** 28 tables, 24 enums — all using snake_case column names
- **Prisma:** All fields use `@map("snake_case")`, all enums use `@@map("snake_case_type")`
- **ORM:** Prisma v5.22 with generated client at `backend/node_modules/@prisma/client`

### Key tables
| Table | Purpose |
|-------|---------|
| `enterprise_admins` | Platform-level admins |
| `clients` | Dealer groups / dealer companies |
| `workshops` | Workshop locations per client |
| `users` | Workshop staff (8 roles) |
| `customers` | Vehicle owners |
| `vehicles` | Customer vehicles |
| `appointments` | Booking calendar |
| `quotations` | Service quotes with line items |
| `job_cards` | Active workshop jobs |
| `invoices` | Billing records |
| `payments` | Payment records |
| `login_activities` | Auth audit trail |
| `password_reset_tokens` | Reset token lifecycle |

### Database Commands
```bash
cd backend
npm run db:generate      # Regenerate Prisma client after schema change
npm run db:migrate       # Create + apply new Prisma migration
npm run db:migrate:prod  # Apply migrations in production (no prompts)
npm run db:seed          # Seed modules, demo client, workshop, and all role users
npm run db:studio        # Open Prisma Studio at http://localhost:5555
npm run db:reset         # ⚠️ Wipe and re-run all migrations + seed (dev only)
```

---

## Role & Permission Summary

| Role | App | Scope |
|------|-----|-------|
| **Support Admin** | Admin portal | Platform-wide — all data, env variables, feature flags |
| **Enterprise Admin** | Admin portal | Own enterprise — clients, workshops, users |
| **CEO** | Frontend | Own workshop — reports, calendar, dashboard |
| **Manager** | Frontend | Own workshop — job management, approvals |
| **Workshop Controller** | Frontend | Own workshop — job tracking, quotation updates |
| **Front Desk** | Frontend | Own workshop — intake, bookings, quotations |
| **Technician** | Frontend | Own workshop — job updates, quotation updates |
| **Accounts** | Frontend | Own workshop — invoicing, payments, reports |
| **Parts Interpreter** | Frontend | Own workshop — parts quotes, job tracking |
| **Parts Controller** | Frontend | Own workshop — parts management, job tracking |

Full matrix: see `ROLE_PERMISSION_MATRIX.md`

---

## Environment Files

| File | Tracked | Purpose |
|------|---------|---------|
| `backend/.env.example` | ✅ Yes | Backend env template |
| `backend/.env` | ❌ No (gitignored) | Backend local values |
| `frontend/.env.example` | ✅ Yes | Frontend env template |
| `frontend/.env.local` | ❌ No (gitignored) | Frontend local values |
| `admin/.env.example` | ✅ Yes | Admin portal env template |
| `admin/.env.local` | ❌ No (gitignored) | Admin local values |

---

## Documentation

| File | Description |
|------|-------------|
| `ADMIN_API_STRUCTURE.md` | Admin API endpoint contracts, security rules, JWT payload shapes |
| `ROLE_PERMISSION_MATRIX.md` | Full role × route access table for all 10 roles |
| `BACKEND_API_STRUCTURE.md` | Workshop API endpoint contracts |
| `DATABASE_STRUCTURE.md` | Full table and enum reference, relationships |
| `backend/README.md` | Backend setup, Prisma commands, env variables |
| `frontend/README.md` | Frontend app structure and notes |
| `admin/README.md` | Admin portal structure, credentials, assumptions |

---

## Security Rules

- Passwords hashed with bcrypt (12 rounds) — never stored in plain text
- JWT access tokens expire in 8 hours; refresh tokens in 7 days
- Rate limiting: 200 req/15 min general, 20 req/15 min on auth endpoints
- CORS restricted to explicitly listed origins — no wildcard `*` with credentials
- Env variable values are **never** sent to browser in plain text (masked in UI)
- `.env` files are gitignored — use `.env.example` as the source of truth template
- Enterprise Admin data is always scoped — they cannot query across enterprise boundaries
- Support Admin is an Autiq Africa internal role — clients cannot create one
- Impersonation is stubbed only — not active pending security design review
