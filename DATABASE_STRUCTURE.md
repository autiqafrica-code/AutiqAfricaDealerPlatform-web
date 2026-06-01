# Autiq Africa — Database Structure

**Database name:** `autiq_africa_db`  
**Engine:** PostgreSQL  
**ORM:** Prisma  
**Schema file:** `backend/prisma/schema.prisma`  
**Migration SQL:** `backend/database/migrations/002_create_schema.sql`

---

## Entity Hierarchy

```
Autiq Africa Platform
└── Enterprise Admins (platform super admins)
└── Clients (dealer groups)
    ├── Client Modules (enabled features per client)
    └── Workshops (workshop locations)
        ├── Users (workshop staff)
        ├── Service Pricing (price overrides per workshop)
        ├── Customers
        │   └── Vehicles
        │       ├── Appointments
        │       └── Quotations
        │           ├── Quotation Line Items
        │           ├── Quotation Updates (per role)
        │           │   └── Part Line Items
        │           ├── Quotation Media
        │           ├── Approval Reminder Rules
        │           │   └── Reminder Logs
        │           ├── Job Cards
        │           │   ├── Job Checklist Items
        │           │   ├── Job Issues
        │           │   └── Job Media
        │           └── Invoices
        │               ├── Invoice Line Items
        │               └── Payments
        └── Notifications
```

---

## Table Reference

### 1. `enterprise_admins`
Platform-level Super Admin users (Autiq Africa internal team).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | cuid |
| admin_code | TEXT UNIQUE | ADM-001, ADM-002 |
| name | TEXT | |
| role | TEXT | Default: 'Super Admin' |
| email | TEXT UNIQUE | Contact email |
| login_email | TEXT UNIQUE | Used for login |
| password_hash | TEXT | bcrypt |
| status | ENUM | Active, Inactive, Blocked |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** email, status

---

### 2. `clients`
Dealer groups (e.g. Lagos Premium Motors). One client can have multiple workshops.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | Dealer name |
| country | TEXT | |
| default_currency | TEXT | ZAR, NGN, BWP, KES, etc. |
| abn | TEXT | Business tax number |
| dealer_licence_number | TEXT | LMCT / dealer licence |
| website | TEXT | |
| logo_url | TEXT | Uploaded logo |
| invoice_format_url | TEXT | Custom invoice template |
| status | ENUM | Active, Inactive, Archived |
| last_login_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** status, country

---

### 3. `modules`
Available platform modules (configured once at platform level).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT UNIQUE | e.g. 'Service Module' |
| description | TEXT | |
| is_optional | BOOLEAN | Whether it's an add-on |
| is_active | BOOLEAN | |

**9 modules seeded:** Service Module, Paint & Panel, Parts Interpreter, Customer Approval Portal, Accounts & Payments, Calendar & Job Capacity, Reports & Analytics, WhatsApp Notifications, Email Notifications

---

### 4. `client_modules`
Junction table — which modules are enabled per client.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| client_id | FK → clients | |
| module_id | FK → modules | |
| is_enabled | BOOLEAN | Toggle on/off |
| enabled_at | TIMESTAMPTZ | |

**Unique:** (client_id, module_id)

---

### 5. `workshops`
Workshop locations under a client. One client → many workshops.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| client_id | FK → clients | |
| name | TEXT | Workshop display name |
| type | ENUM | Service, PaintAndPanel, FleetService, BodyShop |
| address | TEXT | Full address with postcode |
| phone | TEXT | |
| whatsapp | TEXT | |
| email | TEXT | |
| website | TEXT | |
| opening_time | TEXT | HH:MM format |
| closing_time | TEXT | HH:MM format |
| daily_job_limit | INTEGER | Default 30 |
| ceo_name | TEXT | |
| ceo_email | TEXT | |
| ceo_phone | TEXT | |
| logo_url | TEXT | |
| currency | TEXT | Workshop's operating currency |
| status | ENUM | Active, Inactive |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** client_id, status

---

### 6. `users`
Workshop-level staff (Technicians, Front Desk, Controllers, Accounts, etc.).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workshop_id | FK → workshops | |
| name | TEXT | Display name |
| login_email | TEXT UNIQUE | Login credential |
| password_hash | TEXT | bcrypt |
| role | ENUM | Technician, WorkshopController, Accounts, FrontDesk, Manager, PartsInterpreter, PartsController, CEO |
| phone | TEXT | |
| status | ENUM | Active, Inactive, Blocked |
| last_login_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** workshop_id, role, status

---

### 7. `login_activities`
Audit log for all login events (both workshop users and enterprise admins).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | FK → users | nullable |
| enterprise_admin_id | FK → enterprise_admins | nullable |
| login_email | TEXT | What was typed |
| login_status | TEXT | Success, Failed |
| ip_address | TEXT | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | |

**Indexes:** user_id, login_email, created_at

---

### 8. `customers`
Vehicle owners who bring cars to the workshop.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workshop_id | FK → workshops | Which workshop created this record |
| name | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| whatsapp | TEXT | Separate from phone |
| communication_preference | ENUM | WhatsApp, Email, PhoneCall, SMS |
| license_number | TEXT | Driver's licence |
| address | TEXT | |
| is_phone_verified | BOOLEAN | |
| is_email_verified | BOOLEAN | |
| is_whatsapp_verified | BOOLEAN | |
| status | ENUM | Active, Inactive |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** workshop_id, phone, email

---

### 9. `vehicles`
Customer vehicles. One customer → many vehicles.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| customer_id | FK → customers | |
| registration_no | TEXT | Plate number |
| vin | TEXT | Vehicle identification number |
| make_model | TEXT | e.g. 'Toyota Hilux 2.8 GD-6' |
| mileage | INTEGER | KM at intake |
| vehicle_type | ENUM | Private, Fleet, Insurance, Warranty |
| notes | TEXT | Condition notes at intake |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** customer_id, registration_no

---

### 10. `appointments`
Calendar bookings for workshop slots.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| appointment_code | TEXT UNIQUE | APT-1001 |
| workshop_id | FK → workshops | |
| customer_id | FK → customers | |
| vehicle_id | FK → vehicles | |
| appointment_date | TIMESTAMPTZ | |
| appointment_time | TEXT | HH:MM |
| service_type | TEXT | Intake, Diagnostic, Delivery, etc. |
| notes | TEXT | |
| status | ENUM | Confirmed, WaitingApproval, Cancelled, Completed |

**Indexes:** workshop_id, appointment_date, customer_id

---

### 11. `quotations`
Central quotation record. Created by Front Desk, enriched by Technician/WC/Parts, sent to customer.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| quote_number | TEXT UNIQUE | AA-Q-2048 |
| workshop_id | FK | |
| customer_id | FK | |
| vehicle_id | FK | |
| created_by_user_id | FK → users | |
| repair_type | TEXT | |
| priority | ENUM | Red, Amber, Green |
| customer_complaint | TEXT | |
| front_desk_status | TEXT | Current status label for FD view |
| total_estimate | DECIMAL(12,2) | Sum of line items |
| currency | TEXT | |
| status | ENUM | Draft → InternalReview → InternalUpdatesReceived → SentToCustomer → CustomerApproved / CustomerRejected |
| send_to_workshop_controller | BOOLEAN | Internal routing flag |
| send_to_technician | BOOLEAN | |
| send_to_parts_interpreter | BOOLEAN | |
| approval_token | TEXT UNIQUE | UUID for customer portal URL |
| sent_to_customer_at | TIMESTAMPTZ | |
| approved_at | TIMESTAMPTZ | |
| rejected_at | TIMESTAMPTZ | |
| customer_signature | TEXT | Base64 digital signature |
| deleted_at | TIMESTAMPTZ | soft delete |

**Indexes:** workshop_id, customer_id, status, approval_token

**Workflow:**
```
Draft → [FD sends internal] → InternalReview
     → [roles update] → InternalUpdatesReceived
     → [FD sends to customer] → SentToCustomer
     → [customer action] → CustomerApproved | CustomerRejected
```

---

### 12. `quotation_line_items`
Labour and diagnostic line items on a quotation.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| quotation_id | FK → quotations | CASCADE delete |
| item | TEXT | Description |
| added_by_role | TEXT | Technician, Workshop Controller, etc. |
| repair_time | TEXT | e.g. '2.5 hrs' |
| cost | DECIMAL(12,2) | |
| currency | TEXT | |
| status | TEXT | Added, Review, Parts confirmed |

---

### 13. `quotation_updates`
Role-specific updates to a quotation (Technician/WC/Parts each submit their own update).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| quotation_id | FK → quotations | |
| updated_by_user_id | FK → users | |
| role | TEXT | Technician / Workshop Controller / Parts Interpreter |
| focus_note | TEXT | Role-specific summary |
| time_eta | TEXT | |
| cost_impact | DECIMAL(12,2) | |
| status | ENUM | PendingUpdate, InProgress, Completed, NeedClarification |
| notes | TEXT | Detailed notes |
| sent_back_at | TIMESTAMPTZ | When returned to Front Desk |

---

### 14. `part_line_items`
Individual parts listed by Parts Interpreter under a quotation update.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| quotation_update_id | FK → quotation_updates | |
| old_part | TEXT | Part being replaced |
| replacement_part | TEXT | New part |
| price | DECIMAL(12,2) | |
| currency | TEXT | |
| eta | TEXT | 'Available today', 'Supplier ETA 1 day' |
| replacement_time | TEXT | '1.5 hours' |

---

### 15. `quotation_media`
Photos/videos uploaded during quotation workflow.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| quotation_id | FK → quotations | |
| quotation_update_id | FK (nullable) | Which update this belongs to |
| part_line_item_id | FK (nullable) | If attached to a specific part |
| uploaded_by_user_id | TEXT | |
| media_type | ENUM | Photo, Video, Document |
| media_category | TEXT | diagnosis, failed_component, replaced_component, old_part, new_part |
| file_name | TEXT | |
| file_url | TEXT | Server path or cloud URL |
| file_size | INTEGER | Bytes |
| mime_type | TEXT | |

---

### 16. `approval_reminder_rules`
Auto-reminder configuration for pending customer quotation approvals.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| rule_code | TEXT UNIQUE | REM-001 |
| workshop_id | FK | |
| quotation_id | FK | |
| channel | TEXT | WhatsApp / Email / WhatsApp + Email |
| first_reminder_delay | TEXT | '2 hours after quote sent' |
| repeat_frequency | TEXT | 'Every 24 hours' |
| max_attempts | INTEGER | |
| current_attempts | INTEGER | |
| stop_condition | TEXT | 'Approved or rejected' |
| message_template | TEXT | |
| status | ENUM | Active, Paused |

---

### 17. `reminder_logs`
Each reminder send attempt logged here.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| rule_id | FK → approval_reminder_rules | |
| channel | TEXT | |
| status | TEXT | Sent, Failed, Skipped |
| sent_at | TIMESTAMPTZ | |

---

### 18. `job_cards`
Created after customer approves a quotation. Drives the Kanban board.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| job_number | TEXT UNIQUE | AA-1024 |
| workshop_id | FK | |
| quotation_id | FK UNIQUE | One quote → one job |
| vehicle_id | FK | |
| assigned_controller_id | FK → users | Workshop Controller |
| assigned_technician_id | FK → users | |
| notify_parts_interpreter_id | TEXT | |
| department | TEXT | Service, Paint & Panel, Parts |
| priority | ENUM | Red, Amber, Green |
| status | ENUM | New → Accepted → InProgress → WaitingApproval → WaitingParts → Payment → Completed |
| expected_start_date | TIMESTAMPTZ | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| completion_note | TEXT | |
| progress | INTEGER | 0–100 |
| qc_approved_at | TIMESTAMPTZ | |
| qc_approved_by_user_id | FK → users | Manager QC |
| delivery_preference | TEXT | Collection, Delivery |
| customer_notified_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |

**Job Status Flow:**
```
New → Accepted → In Progress → [Waiting Parts OR Waiting Approval]
   → Payment → Completed
   OR → QCReview → Critical/Ready
```

**Indexes:** workshop_id, status, priority, assigned_technician_id

---

### 19. `job_checklist_items`
Technician checklist per job (populated from service template or custom).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| job_card_id | FK → job_cards | |
| label | TEXT | Checklist item description |
| state | TEXT | Completed / Failed component found / Good to go / Should be done within X km |
| color | ENUM | Red, Amber, Green |
| is_required | BOOLEAN | |
| completed_at | TIMESTAMPTZ | |
| notes | TEXT | |

---

### 20. `job_issues`
Issues raised by technicians during job execution.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| job_card_id | FK → job_cards | |
| title | TEXT | |
| severity | ENUM | High, Medium, Low |
| note | TEXT | |
| status | TEXT | Open, Resolved |
| raised_by_user_id | TEXT | |
| resolved_at | TIMESTAMPTZ | |

**Severity → Priority mapping:** High = Red, Medium = Amber, Low = Green

---

### 21. `job_media`
Completion evidence and before/after photos for a job.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| job_card_id | FK → job_cards | |
| uploaded_by_user_id | TEXT | |
| media_type | ENUM | Photo, Video, Document |
| media_category | TEXT | completion, before, after, issue_evidence |
| file_name, file_url | TEXT | |
| file_size | INTEGER | |
| mime_type | TEXT | |

---

### 22. `service_templates`
Service types that can be configured by Enterprise Admin (e.g. Major Service, Brake Repair).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | |
| module | TEXT | Service Module / Paint & Panel Module |
| default_pricing_mode | ENUM | StandardPrice, CustomPrice |
| duration | TEXT | '4 hours', '2 days' |
| is_active | BOOLEAN | |

**3 templates seeded:** Major Service, Brake Repair, Paint & Panel Repair

---

### 23. `service_checklist_templates`
Template checklist items for each service type.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| service_template_id | FK → service_templates | |
| item | TEXT | |
| is_required | BOOLEAN | |
| price_mode | ENUM | StandardPrice, CustomPrice |
| standard_price | DECIMAL(12,2) | |
| custom_price | DECIMAL(12,2) | |
| currency | TEXT | |
| technician_instruction | TEXT | |
| sort_order | INTEGER | Display ordering |

---

### 24. `service_pricing`
Standard and custom prices per service template, per workshop, per currency.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| service_template_id | FK | |
| workshop_id | FK (nullable) | null = applies to all workshops |
| currency | TEXT | |
| standard_price | DECIMAL(12,2) | |
| custom_price | DECIMAL(12,2) | |
| allow_custom_override | BOOLEAN | |
| effective_from | TIMESTAMPTZ | |
| approval_required | TEXT | Manager / CEO / Enterprise Admin |
| tax_included | BOOLEAN | |
| is_active | BOOLEAN | |

---

### 25. `invoices`
Generated from an approved quotation. One quotation → one invoice.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| invoice_number | TEXT UNIQUE | INV-2026-001 |
| quotation_id | FK UNIQUE | |
| job_card_id | FK (nullable) | |
| issue_date | TIMESTAMPTZ | |
| due_date | TIMESTAMPTZ | |
| subtotal | DECIMAL(12,2) | |
| tax | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| currency | TEXT | |
| payment_status | ENUM | DueToday, Overdue, PartPaid, Paid |

**Indexes:** payment_status, issue_date

---

### 26. `invoice_line_items`
Individual line items on an invoice.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| invoice_id | FK → invoices | |
| description | TEXT | |
| qty | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| total | DECIMAL(12,2) | |
| currency | TEXT | |

---

### 27. `payments`
Payment records against invoices. Supports multiple partial payments.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| payment_code | TEXT UNIQUE | PAY-3001 |
| invoice_id | FK → invoices | |
| method | ENUM | Cash, Bank, MobileMoney, Card |
| amount_received | DECIMAL(12,2) | |
| currency | TEXT | |
| reference_number | TEXT | Gateway or bank ref |
| gateway_status | TEXT | |
| notes | TEXT | |
| status | ENUM | DueToday, Overdue, PartPaid, Paid |
| recorded_by_user_id | FK → users | |
| paid_at | TIMESTAMPTZ | |

**Indexes:** invoice_id, status, method

---

### 28. `notifications`
Log of all notifications sent (WhatsApp, Email, SMS).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workshop_id | FK (nullable) | |
| customer_id | FK (nullable) | |
| user_id | FK (nullable) | |
| job_card_id | TEXT | Optional reference |
| quotation_id | TEXT | Optional reference |
| channel | ENUM | WhatsApp, Email, SMS |
| type | TEXT | QuoteSent, ApprovalPending, WorkStarted, PaymentReminder, JobCompleted |
| message | TEXT | |
| status | ENUM | Pending, Sent, Failed, Skipped |
| sent_at | TIMESTAMPTZ | |
| failure_reason | TEXT | |

**Indexes:** customer_id, workshop_id, status, created_at

---

## Key Enum Values

| Enum | Values |
|---|---|
| JobStatus | New, Accepted, InProgress, WaitingApproval, WaitingParts, Payment, Completed, QCReview, Critical, Ready |
| QuotationStatus | Draft, InternalReview, InternalUpdatesReceived, SentToCustomer, CustomerApproved, CustomerRejected |
| PaymentStatus | DueToday, Overdue, PartPaid, Paid |
| PaymentMethod | Cash, Bank, MobileMoney, Card |
| UserRole | Technician, WorkshopController, Accounts, FrontDesk, Manager, PartsInterpreter, PartsController, CEO |
| Priority/Color | Red, Amber, Green |
| CommunicationPreference | WhatsApp, Email, PhoneCall, SMS |
| VehicleType | Private, Fleet, Insurance, Warranty |
| NotificationChannel | WhatsApp, Email, SMS |

---

## Important Relationships

| From | → | To | Notes |
|---|---|---|---|
| clients | 1:N | workshops | A dealer group has many branches |
| workshops | 1:N | users | Each branch has its own staff |
| customers | 1:N | vehicles | One customer, multiple vehicles |
| vehicles | 1:N | quotations | One vehicle can have multiple service histories |
| quotations | 1:1 | job_cards | Quote becomes a job only after customer approval |
| quotations | 1:1 | invoices | Invoice generated from approved quote |
| invoices | 1:N | payments | Supports multiple partial payments |
| job_cards | 1:N | job_checklist_items | Populated from service template |
| job_cards | 1:N | job_issues | Technician-raised issues |
| quotation_updates | 1:N | part_line_items | Parts Interpreter's parts list |
| approval_reminder_rules | 1:N | reminder_logs | Each send attempt logged |

---

## Role Access Summary

| Role | Readable Tables | Writable Tables |
|---|---|---|
| Enterprise Admin | All | All (platform config, client setup, user management) |
| Front Desk | customers, vehicles, appointments, quotations, job_cards, notifications | customers, vehicles, appointments, quotations, job_cards, approval_reminder_rules |
| Technician | job_cards (own), quotations (assigned) | job_checklist_items, job_issues, job_media, quotation_updates (own) |
| Workshop Controller | job_cards (workshop), quotations | job_cards (assign/status), quotation_updates (own) |
| Manager | All workshop data | job_cards (QC approve), job_issues (resolve) |
| Accounts | invoices, payments, reports | payments, invoices |
| Parts Interpreter | quotations (assigned), part_line_items | quotation_updates, part_line_items |
| CEO | All reports | workshops (schedule/daily limit) |
