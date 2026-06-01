# Autiq Africa — Backend API

**URL:** http://localhost:8005

Express.js REST API with Prisma ORM and PostgreSQL for the Autiq Africa Dealer & Workshop Platform.

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (default: localhost:5432)
- Database `autiq_africa_db` already created

```sql
-- Create the database if it doesn't exist
CREATE DATABASE autiq_africa_db;
```

---

## First-Time Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Create environment file
```bash
copy .env.example .env
```
Edit `.env` and set at minimum:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/autiq_africa_db?schema=public"
JWT_SECRET=<64+ random hex chars>
JWT_REFRESH_SECRET=<64+ different random hex chars>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Generate Prisma client
```bash
npm run db:generate
```

### 4. Apply database schema
```bash
# The schema was already applied via SQL migrations (002_create_schema.sql).
# For subsequent schema changes, use Prisma migrations:
npm run db:migrate
```

### 5. Seed initial data
```bash
npm run db:seed
```
Creates: platform modules, service templates, demo client, demo workshop, and one user per role.

### 6. Start development server
```bash
npm run dev
# → http://localhost:8005
```

---

## Verify Setup

```bash
# Health check
curl http://localhost:8005/api/health
# Expected: {"status":"ok","service":"autiq-africa-backend"}

# Browse database tables
npm run db:studio
# → http://localhost:5555 (Prisma Studio)
```

---

## Seeded Credentials

After running `npm run db:seed`:

### Enterprise Admin
| Email | Password |
|-------|----------|
| `owner@autiqafrica.com` | `Autiq@Admin2026` |

Login endpoint: `POST /api/auth/admin/login`

### Workshop Users (Demo Workshop — Demo Dealer Group)
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

Login endpoint: `POST /api/auth/login`

---

## Database Commands

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Regenerate Prisma client after `schema.prisma` changes |
| `npm run db:migrate` | Create and apply a new Prisma migration |
| `npm run db:migrate:prod` | Apply pending migrations in production (no interactive prompts) |
| `npm run db:seed` | Seed modules, service templates, demo data, and all role users |
| `npm run db:studio` | Open Prisma Studio at http://localhost:5555 |
| `npm run db:reset` | ⚠️ Wipe DB and re-run all migrations + seed (dev only) |

---

## API Endpoints

### Auth (implemented)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Workshop user login |
| POST | `/api/auth/admin/login` | Enterprise Admin login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| POST | `/api/auth/forgot-password` | Trigger password reset |
| POST | `/api/auth/reset-password` | Consume token + set new password |

### Workshop API (stubs — return 501)
`/api/clients`, `/api/workshops`, `/api/users`, `/api/customers`, `/api/vehicles`,
`/api/appointments`, `/api/quotations`, `/api/portal`, `/api/jobs`, `/api/parts`,
`/api/invoices`, `/api/payments`, `/api/reports`, `/api/notifications`, `/api/settings`

### Admin API (stubs — auth + role guard wired, business logic pending)
| Prefix | Role required |
|--------|---------------|
| `/api/admin/enterprise/*` | Enterprise Admin or Support Admin |
| `/api/admin/support/*` | Support Admin only |

Full contract: see `ADMIN_API_STRUCTURE.md` at the project root.

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma              ← 28 models, 24 enums, all with @map annotations
├── database/
│   ├── migrations/
│   │   ├── 001_create_database.sql
│   │   ├── 002_create_schema.sql
│   │   └── 003_add_password_reset_tokens.sql
│   └── seeds/
│       └── seed.js                ← Full seed (modules + demo data + all role users)
└── src/
    ├── config/
    │   ├── db.js                  ← Prisma client singleton (shared across app)
    │   └── env.js                 ← All env var exports with defaults
    ├── middleware/
    │   ├── auth.middleware.js      ← JWT verification → sets req.user
    │   ├── permission.middleware.js← requireSupportAdmin / requireEnterpriseAdmin
    │   ├── roleCheck.middleware.js ← Workshop role guard
    │   ├── rateLimiter.middleware.js
    │   ├── errorHandler.middleware.js
    │   ├── requestLogger.middleware.js
    │   └── multer.middleware.js    ← File upload (20 MB limit)
    ├── routes/
    │   ├── auth.routes.js
    │   ├── [16 workshop route files]
    │   └── admin/
    │       ├── enterprise.routes.js
    │       └── support.routes.js
    ├── controllers/
    │   ├── auth.controller.js      ← Implemented
    │   ├── [15 stub controllers]
    │   └── admin/
    │       ├── enterprise.controller.js  ← Stub
    │       └── support.controller.js     ← Stub
    ├── services/
    │   ├── auth.service.js         ← Implemented
    │   ├── [15 stub services]
    │   └── admin/
    │       ├── enterprise.service.js     ← Stub
    │       └── support.service.js        ← Stub
    ├── validators/
    │   ├── auth.validator.js
    │   └── [others — customers, vehicles, quotations]
    ├── utils/
    │   ├── logger.js               ← Winston logger
    │   ├── apiResponse.js          ← Standardised response helpers
    │   ├── pagination.js
    │   └── idGenerator.js
    ├── app.js                      ← Express app setup, CORS, middleware, routes
    └── server.js                   ← HTTP server + graceful SIGTERM/SIGINT shutdown
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `8005` | API server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Access token signing key (64+ chars) |
| `JWT_EXPIRES_IN` | No | `8h` | Access token lifetime |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token signing key (different from JWT_SECRET) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `ALLOWED_ORIGINS` | No | `http://localhost:8174` | Comma-separated CORS origins |
| `UPLOAD_DIR` | No | `uploads` | File upload directory (relative to backend/) |
| `MAX_FILE_SIZE_MB` | No | `20` | Max upload file size |
| `WHATSAPP_API_URL` | No | — | WhatsApp Business API endpoint |
| `WHATSAPP_API_TOKEN` | No | — | WhatsApp API bearer token |
| `SMTP_HOST` | No | — | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `EMAIL_FROM` | No | `noreply@autiqafrica.com` | Sender address |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `200` | Max requests per window |
| `LOG_LEVEL` | No | `debug` | Winston log level |

---

## Security Notes

- Passwords hashed with bcrypt (12 rounds) — never stored in plain text
- Access tokens expire in 8h; refresh tokens in 7d
- Rate limiting: 200 req/15 min general, 20 req/15 min for `/api/auth/*`
- CORS uses an explicit origin callback — no wildcards (required for `credentials: true`)
- `backend/.env` is gitignored — never committed
- Password reset tokens are one-time use, expire in 1 hour, stored hashed

---

## Implementation Roadmap

Auth is complete. Remaining order:

1. **Clients + Workshops** — Enterprise Admin onboarding flow
2. **Users** — Create and manage workshop staff per workshop
3. **Customers + Vehicles** — Front Desk intake
4. **Quotations** — Create → internal routing → customer approval flow
5. **Job Cards** — Kanban board, status updates, technician assignments
6. **Parts** — Parts line items, availability, waiting queue
7. **Invoices + Payments** — Accounts module
8. **Admin API** — Wire enterprise and support controller stubs to real DB queries
9. **Notifications** — WhatsApp + Email integration
10. **Reports** — Analytics, PDF/Excel export
