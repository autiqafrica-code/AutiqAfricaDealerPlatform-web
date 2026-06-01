# Database Structure — Autiq Africa

**Database:** PostgreSQL  
**ORM:** Prisma v5 (`prisma/schema.prisma`)  
**Database name:** `autiq_africa_db`

---

## Tables Overview

| Table | Description |
|---|---|
| `enterprise_admins` | Platform-level admins (e.g., Enterprise Admin, Support Admin) |
| `clients` | Dealer groups / dealer principals |
| `workshops` | Individual workshop locations belonging to a client |
| `users` | Workshop staff (Technician, FrontDesk, Manager, etc.) |
| `login_activities` | Audit log for all login attempts (success and failure) |
| `modules` | Platform feature modules |
| `client_modules` | Module assignments per client |
| `customers` | Vehicle owners / service customers |
| `vehicles` | Customer vehicles |
| `appointments` | Workshop appointment bookings |
| `quotations` | Service quotations |
| `quotation_line_items` | Line items on a quotation |
| `quotation_updates` | Role-specific updates on a quotation |
| `part_line_items` | Parts listed in a quotation update |
| `quotation_media` | Photos/videos attached to quotations |
| `approval_reminder_rules` | Auto-reminder configuration for customer approval |
| `reminder_logs` | Reminder send history |
| `job_cards` | Workshop jobs (created after customer approval) |
| `job_checklist_items` | Checklist steps per job |
| `job_issues` | Issues raised by technicians |
| `job_media` | Photos/videos attached to jobs |
| `service_templates` | Reusable service definitions |
| `service_checklist_templates` | Checklist templates per service |
| `service_pricing` | Pricing per service template |
| `invoices` | Invoices generated from completed jobs |
| `invoice_line_items` | Line items on an invoice |
| `payments` | Payment records against invoices |
| `notifications` | WhatsApp/Email/SMS notification log |
| `password_reset_tokens` | One-time password reset tokens |

---

## Key Table Definitions

### `enterprise_admins`
Platform-level admin accounts. Can be linked to a specific `client` (dealer group) as an Enterprise Admin.

| Column | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `admin_code` | `varchar unique` | Display code, e.g. ADM-001 |
| `name` | `varchar` | Full name |
| `role` | `varchar` | `'Enterprise Admin'` or `'Support Admin'` |
| `email` | `varchar unique` | Display / contact email |
| `login_email` | `varchar unique` | Used for authentication |
| `password_hash` | `varchar` | bcrypt hash, never returned in API |
| `status` | `enterprise_admin_status` | `Active`, `Inactive`, `Blocked` |
| `client_id` | `cuid nullable FK → clients` | Dealer group this admin manages |
| `last_login_at` | `timestamptz nullable` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz nullable` | Soft delete |

### `clients`
Dealer groups / dealer principals. Parent of workshops.

| Column | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `name` | `varchar` | Dealer group name |
| `country` | `varchar` | e.g. `South Africa` |
| `default_currency` | `varchar` | Default: `ZAR` |
| `abn` | `varchar nullable` | Business number |
| `dealer_licence_number` | `varchar nullable` | |
| `website` | `varchar nullable` | |
| `logo_url` | `varchar nullable` | |
| `invoice_format_url` | `varchar nullable` | |
| `status` | `client_status` | `Active`, `Inactive`, `Archived` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz nullable` | Soft delete |

### `workshops`
Individual workshop locations. Belong to a client.

| Column | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `client_id` | `cuid FK → clients` | Owning dealer group |
| `name` | `varchar` | Workshop display name |
| `type` | `workshop_type` | `Service`, `PaintAndPanel`, `FleetService`, `BodyShop` |
| `workshop_code` | `varchar unique nullable` | Auto-generated, e.g. `WS-0001` |
| `address` | `varchar nullable` | Legacy single-line address |
| `address_line1` | `varchar nullable` | Structured address |
| `address_line2` | `varchar nullable` | |
| `city` | `varchar nullable` | |
| `state` | `varchar nullable` | Province / state |
| `workshop_country` | `varchar nullable` | |
| `postal_code` | `varchar nullable` | |
| `phone` | `varchar nullable` | |
| `whatsapp` | `varchar nullable` | |
| `email` | `varchar nullable` | |
| `website` | `varchar nullable` | |
| `opening_time` | `varchar` | Default `10:00` |
| `closing_time` | `varchar` | Default `20:00` |
| `daily_job_limit` | `int` | Default `30` |
| `ceo_name` | `varchar nullable` | |
| `ceo_email` | `varchar nullable` | |
| `ceo_phone` | `varchar nullable` | |
| `logo_url` | `varchar nullable` | |
| `currency` | `varchar` | Default `ZAR` |
| `status` | `workshop_status` | `Active`, `Inactive` |
| `created_by_admin_id` | `cuid nullable FK → enterprise_admins` | Admin who created this workshop |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz nullable` | Soft delete |

### `users`
Workshop staff accounts. One user belongs to exactly one workshop.

| Column | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `workshop_id` | `cuid FK → workshops` | |
| `name` | `varchar` | |
| `login_email` | `varchar unique` | Used for authentication |
| `password_hash` | `varchar` | bcrypt hash, never returned in API |
| `role` | `user_role` | See roles below |
| `phone` | `varchar nullable` | |
| `status` | `user_status` | `Active`, `Inactive`, `Blocked` |
| `last_login_at` | `timestamptz nullable` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz nullable` | Soft delete |

**User roles enum:** `Technician`, `WorkshopController`, `Accounts`, `FrontDesk`, `Manager`, `PartsInterpreter`, `PartsController`, `CEO`

### `login_activities`
Audit log for every login attempt (all user types).

| Column | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `user_id` | `cuid nullable FK → users` | Set for workshop user logins |
| `enterprise_admin_id` | `cuid nullable FK → enterprise_admins` | Set for admin logins |
| `login_email` | `varchar` | Email used in the attempt |
| `login_status` | `varchar` | `Success`, `Failed`, `Blocked` |
| `ip_address` | `varchar nullable` | Request IP |
| `user_agent` | `varchar nullable` | Browser/client identifier |
| `created_at` | `timestamptz` | Timestamp of attempt |

---

## Entity Relationships

```
EnterpriseAdmin ──(optional)──▶ Client
Client ──────────────────────▶ Workshop (1:many)
Workshop ────────────────────▶ User (1:many)
Workshop ────────────────────▶ Customer (1:many)
Customer ────────────────────▶ Vehicle (1:many)
Customer/Vehicle ────────────▶ Appointment (1:many)
Appointment/Vehicle/Customer ▶ Quotation (1:many)
Quotation ───────────────────▶ JobCard (1:1)
JobCard ─────────────────────▶ Invoice (1:1)
Invoice ─────────────────────▶ Payment (1:many)
```

---

## Seed Users

### Enterprise Admins

| Name | Email | Password | Role | Client |
|---|---|---|---|---|
| Enterprise Owner | owner@autiqafrica.com | `Autiq@Admin2026` | Enterprise Admin | — |
| Hiral Jivan | hiraljivan@autiqafrica.com | `Autiq@2026` | Enterprise Admin | Hiral Dealer Group |

> Passwords are bcrypt-hashed in the database. Plain-text values above are for local development only.

### Workshop Users (Demo Workshop → Demo Dealer Group)

| Role | Email | Password |
|---|---|---|
| FrontDesk | frontdesk@demo.autiq | `FrontDesk@2026` |
| Technician | technician@demo.autiq | `Technician@2026` |
| Manager | manager@demo.autiq | `Manager@2026` |
| WorkshopController | controller@demo.autiq | `Controller@2026` |
| Accounts | accounts@demo.autiq | `Accounts@2026` |
| PartsInterpreter | partsinterp@demo.autiq | `PartsInterp@2026` |
| PartsController | partsctrl@demo.autiq | `PartsCtrl@2026` |
| CEO | ceo@demo.autiq | `CEO@Demo2026` |

---

## Commands

```bash
# Apply schema changes to database (local dev)
cd backend && npx prisma db push

# Regenerate Prisma client (after schema changes, stop backend first)
cd backend && npx prisma generate

# Run seed
cd backend && node database/seeds/seed.js

# View database in browser
cd backend && npx prisma studio

# Start backend
cd backend && npm run dev
```
