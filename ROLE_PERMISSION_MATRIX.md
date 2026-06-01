# Role & Permission Matrix

## Role Definitions

| Role | App | Scope | Description |
|------|-----|-------|-------------|
| **Support Admin** | Admin Portal (5174) | Platform-wide | Autiq Africa internal super-user. Full access to all data, config, logs, env variables, feature flags. |
| **Enterprise Admin** | Admin Portal (5174) | Own enterprise only | Client-facing super-user. Manages their own clients, workshops, and users. Cannot see other enterprises. |
| **CEO** | Frontend App (5173) | Own workshop | Workshop-level executive. Read access to reports, calendar, dashboard. |
| **Manager** | Frontend App (5173) | Own workshop | Job management, calendar, approvals. |
| **Workshop Controller** | Frontend App (5173) | Own workshop | Job tracking and quotation updates. |
| **Front Desk** | Frontend App (5173) | Own workshop | Customer intake, bookings, quotations. |
| **Technician** | Frontend App (5173) | Own workshop | Job updates, quotation updates. |
| **Accounts** | Frontend App (5173) | Own workshop | Invoicing, payments, reports. |
| **Parts Interpreter** | Frontend App (5173) | Own workshop | Parts quotations, job tracking. |
| **Parts Controller** | Frontend App (5173) | Own workshop | Parts management, job tracking. |

---

## Admin Portal Route Access

| Route | Support Admin | Enterprise Admin |
|-------|:---:|:---:|
| `/admin/login` | ✅ | ✅ |
| `/admin/enterprise/*` | ✅ | ✅ |
| `/admin/support/*` | ✅ | ❌ |

---

## Backend API Access

### Enterprise Admin API (`/api/admin/enterprise/*`)

| Endpoint | Support Admin | Enterprise Admin | Workshop Roles |
|----------|:---:|:---:|:---:|
| GET `/clients` | ✅ (all) | ✅ (own) | ❌ |
| GET `/workshops` | ✅ (all) | ✅ (own) | ❌ |
| GET `/users` | ✅ (all) | ✅ (own) | ❌ |
| GET `/login-activity` | ✅ | ✅ (own) | ❌ |
| GET `/revenue` | ✅ | ✅ (own) | ❌ |
| GET/POST/DELETE `/admin-users` | ✅ | ✅ | ❌ |
| GET `/data-export` | ✅ | ✅ (own) | ❌ |

### Support Admin API (`/api/admin/support/*`)

| Endpoint | Support Admin | Enterprise Admin | Workshop Roles |
|----------|:---:|:---:|:---:|
| GET `/clients` | ✅ | ❌ | ❌ |
| GET `/workshops` | ✅ | ❌ | ❌ |
| GET `/users` | ✅ | ❌ | ❌ |
| GET `/audit-logs` | ✅ | ❌ | ❌ |
| GET `/system-health` | ✅ | ❌ | ❌ |
| GET `/env-variables` | ✅ | ❌ | ❌ |
| PATCH `/env-variables/:key` | ✅ (re-auth) | ❌ | ❌ |
| GET `/feature-flags` | ✅ | ❌ | ❌ |
| PATCH `/feature-flags/:key` | ✅ | ❌ | ❌ |
| POST `/impersonate` | ✅ (not built) | ❌ | ❌ |

### Workshop API (`/api/*`)

| Resource | Support Admin | Enterprise Admin | CEO | Manager | Front Desk | Technician | Accounts | Parts |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Clients | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workshops | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Users | ✅ | ✅ | ❌ | ✅ (read) | ❌ | ❌ | ❌ | ❌ |
| Customers | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Vehicles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Job Cards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quotations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Payments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Appointments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Parts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Note: Workshop API permission enforcement is a future task. Current workshop routes are stubs and do not yet implement role-based data filtering.

---

## Assumptions Documented

1. **Support Admin** is an Autiq Africa internal role — it is not a role any client can assign.
2. **Enterprise Admin** is scoped to their own enterprise — they cannot query across enterprise boundaries even via direct API call.
3. **Workshop roles** are always scoped to a single workshop; workshop isolation is enforced at the middleware level via `req.user.workshopId`.
4. **Env variable values** are never returned raw from any API endpoint — only masked representations.
5. **Impersonation** is documented but not implemented — it requires a separate security review and explicit consent design.
6. Future: feature flags per client (scope: `per-client`) will require a separate endpoint to manage per-client overrides.
