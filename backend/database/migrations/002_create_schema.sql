-- ============================================================
-- Migration 002: Create Full Schema
-- Run against: autiq_africa_db
-- psql -U postgres -h localhost -p 5432 -d autiq_africa_db -f 002_create_schema.sql
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE enterprise_admin_status AS ENUM ('Active', 'Inactive', 'Blocked');
CREATE TYPE client_status AS ENUM ('Active', 'Inactive', 'Archived');
CREATE TYPE workshop_status AS ENUM ('Active', 'Inactive');
CREATE TYPE workshop_type AS ENUM ('Service', 'PaintAndPanel', 'FleetService', 'BodyShop');
CREATE TYPE user_role AS ENUM ('Technician', 'WorkshopController', 'Accounts', 'FrontDesk', 'Manager', 'PartsInterpreter', 'PartsController', 'CEO');
CREATE TYPE user_status AS ENUM ('Active', 'Inactive', 'Blocked');
CREATE TYPE communication_preference AS ENUM ('WhatsApp', 'Email', 'PhoneCall', 'SMS');
CREATE TYPE customer_status AS ENUM ('Active', 'Inactive');
CREATE TYPE vehicle_type AS ENUM ('Private', 'Fleet', 'Insurance', 'Warranty');
CREATE TYPE appointment_status AS ENUM ('Confirmed', 'WaitingApproval', 'Cancelled', 'Completed');
CREATE TYPE quote_priority AS ENUM ('Red', 'Amber', 'Green');
CREATE TYPE quotation_status AS ENUM ('Draft', 'InternalReview', 'InternalUpdatesReceived', 'SentToCustomer', 'CustomerApproved', 'CustomerRejected');
CREATE TYPE quotation_update_status AS ENUM ('PendingUpdate', 'InProgress', 'Completed', 'NeedClarification');
CREATE TYPE job_status AS ENUM ('New', 'Accepted', 'InProgress', 'WaitingApproval', 'WaitingParts', 'Payment', 'Completed', 'QCReview', 'Critical', 'Ready');
CREATE TYPE job_priority AS ENUM ('Red', 'Amber', 'Green');
CREATE TYPE issue_severity AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE checklist_color AS ENUM ('Red', 'Amber', 'Green');
CREATE TYPE media_type AS ENUM ('Photo', 'Video', 'Document');
CREATE TYPE pricing_mode AS ENUM ('StandardPrice', 'CustomPrice');
CREATE TYPE payment_method AS ENUM ('Cash', 'Bank', 'MobileMoney', 'Card');
CREATE TYPE payment_status AS ENUM ('DueToday', 'Overdue', 'PartPaid', 'Paid');
CREATE TYPE reminder_status AS ENUM ('Active', 'Paused');
CREATE TYPE notification_channel AS ENUM ('WhatsApp', 'Email', 'SMS');
CREATE TYPE notification_status AS ENUM ('Pending', 'Sent', 'Failed', 'Skipped');

-- ============================================================
-- ENTERPRISE ADMINS
-- ============================================================

CREATE TABLE enterprise_admins (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    admin_code    TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'Super Admin',
    email         TEXT UNIQUE NOT NULL,
    login_email   TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status        enterprise_admin_status NOT NULL DEFAULT 'Active',
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_enterprise_admins_email  ON enterprise_admins(email);
CREATE INDEX idx_enterprise_admins_status ON enterprise_admins(status);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name                  TEXT NOT NULL,
    country               TEXT NOT NULL,
    default_currency      TEXT NOT NULL DEFAULT 'ZAR',
    abn                   TEXT,
    dealer_licence_number TEXT,
    website               TEXT,
    logo_url              TEXT,
    invoice_format_url    TEXT,
    status                client_status NOT NULL DEFAULT 'Active',
    last_login_at         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_clients_status  ON clients(status);
CREATE INDEX idx_clients_country ON clients(country);

-- ============================================================
-- MODULES
-- ============================================================

CREATE TABLE modules (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_modules (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    module_id  TEXT NOT NULL REFERENCES modules(id),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, module_id)
);

-- ============================================================
-- WORKSHOPS
-- ============================================================

CREATE TABLE workshops (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    client_id       TEXT NOT NULL REFERENCES clients(id),
    name            TEXT NOT NULL,
    type            workshop_type NOT NULL DEFAULT 'Service',
    address         TEXT,
    phone           TEXT,
    whatsapp        TEXT,
    email           TEXT,
    website         TEXT,
    opening_time    TEXT NOT NULL DEFAULT '10:00',
    closing_time    TEXT NOT NULL DEFAULT '20:00',
    daily_job_limit INTEGER NOT NULL DEFAULT 30,
    ceo_name        TEXT,
    ceo_email       TEXT,
    ceo_phone       TEXT,
    logo_url        TEXT,
    currency        TEXT NOT NULL DEFAULT 'ZAR',
    status          workshop_status NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_workshops_client_id ON workshops(client_id);
CREATE INDEX idx_workshops_status    ON workshops(status);

-- ============================================================
-- USERS (Workshop-level staff)
-- ============================================================

CREATE TABLE users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    workshop_id   TEXT NOT NULL REFERENCES workshops(id),
    name          TEXT NOT NULL,
    login_email   TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL,
    phone         TEXT,
    status        user_status NOT NULL DEFAULT 'Active',
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_workshop_id ON users(workshop_id);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_status      ON users(status);

-- ============================================================
-- LOGIN ACTIVITY
-- ============================================================

CREATE TABLE login_activities (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id             TEXT REFERENCES users(id),
    enterprise_admin_id TEXT REFERENCES enterprise_admins(id),
    login_email         TEXT NOT NULL,
    login_status        TEXT NOT NULL,
    ip_address          TEXT,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_activities_user_id     ON login_activities(user_id);
CREATE INDEX idx_login_activities_login_email ON login_activities(login_email);
CREATE INDEX idx_login_activities_created_at  ON login_activities(created_at);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    workshop_id              TEXT NOT NULL REFERENCES workshops(id),
    name                     TEXT NOT NULL,
    phone                    TEXT,
    email                    TEXT,
    whatsapp                 TEXT,
    communication_preference communication_preference NOT NULL DEFAULT 'WhatsApp',
    license_number           TEXT,
    address                  TEXT,
    is_phone_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    is_whatsapp_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    status                   customer_status NOT NULL DEFAULT 'Active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at               TIMESTAMPTZ
);

CREATE INDEX idx_customers_workshop_id ON customers(workshop_id);
CREATE INDEX idx_customers_phone       ON customers(phone);
CREATE INDEX idx_customers_email       ON customers(email);

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE vehicles (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    customer_id     TEXT NOT NULL REFERENCES customers(id),
    registration_no TEXT NOT NULL,
    vin             TEXT,
    make_model      TEXT NOT NULL,
    mileage         INTEGER,
    vehicle_type    vehicle_type NOT NULL DEFAULT 'Private',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_vehicles_customer_id     ON vehicles(customer_id);
CREATE INDEX idx_vehicles_registration_no ON vehicles(registration_no);

-- ============================================================
-- APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    appointment_code TEXT UNIQUE NOT NULL,
    workshop_id      TEXT NOT NULL REFERENCES workshops(id),
    customer_id      TEXT NOT NULL REFERENCES customers(id),
    vehicle_id       TEXT NOT NULL REFERENCES vehicles(id),
    appointment_date TIMESTAMPTZ NOT NULL,
    appointment_time TEXT NOT NULL,
    service_type     TEXT NOT NULL,
    notes            TEXT,
    status           appointment_status NOT NULL DEFAULT 'Confirmed',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_workshop_id      ON appointments(workshop_id);
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_customer_id      ON appointments(customer_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE TABLE quotations (
    id                           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    quote_number                 TEXT UNIQUE NOT NULL,
    workshop_id                  TEXT NOT NULL REFERENCES workshops(id),
    customer_id                  TEXT NOT NULL REFERENCES customers(id),
    vehicle_id                   TEXT NOT NULL REFERENCES vehicles(id),
    created_by_user_id           TEXT NOT NULL REFERENCES users(id),
    repair_type                  TEXT NOT NULL,
    priority                     quote_priority NOT NULL DEFAULT 'Amber',
    customer_complaint           TEXT,
    front_desk_status            TEXT,
    total_estimate               NUMERIC(12, 2),
    currency                     TEXT NOT NULL DEFAULT 'ZAR',
    status                       quotation_status NOT NULL DEFAULT 'Draft',
    send_to_workshop_controller  BOOLEAN NOT NULL DEFAULT FALSE,
    send_to_technician           BOOLEAN NOT NULL DEFAULT FALSE,
    send_to_parts_interpreter    BOOLEAN NOT NULL DEFAULT FALSE,
    approval_token               TEXT UNIQUE,
    sent_to_customer_at          TIMESTAMPTZ,
    approved_at                  TIMESTAMPTZ,
    rejected_at                  TIMESTAMPTZ,
    customer_signature           TEXT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                   TIMESTAMPTZ
);

CREATE INDEX idx_quotations_workshop_id    ON quotations(workshop_id);
CREATE INDEX idx_quotations_customer_id    ON quotations(customer_id);
CREATE INDEX idx_quotations_status         ON quotations(status);
CREATE INDEX idx_quotations_approval_token ON quotations(approval_token);

-- ============================================================
-- QUOTATION LINE ITEMS
-- ============================================================

CREATE TABLE quotation_line_items (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    quotation_id  TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item          TEXT NOT NULL,
    added_by_role TEXT NOT NULL,
    repair_time   TEXT,
    cost          NUMERIC(12, 2),
    currency      TEXT NOT NULL DEFAULT 'ZAR',
    status        TEXT NOT NULL DEFAULT 'Added',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotation_line_items_quotation_id ON quotation_line_items(quotation_id);

-- ============================================================
-- QUOTATION UPDATES (Internal role updates)
-- ============================================================

CREATE TABLE quotation_updates (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    quotation_id      TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    updated_by_user_id TEXT NOT NULL REFERENCES users(id),
    role              TEXT NOT NULL,
    focus_note        TEXT,
    time_eta          TEXT,
    cost_impact       NUMERIC(12, 2),
    currency          TEXT NOT NULL DEFAULT 'ZAR',
    status            quotation_update_status NOT NULL DEFAULT 'PendingUpdate',
    notes             TEXT,
    sent_back_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotation_updates_quotation_id       ON quotation_updates(quotation_id);
CREATE INDEX idx_quotation_updates_updated_by_user_id ON quotation_updates(updated_by_user_id);

-- ============================================================
-- PART LINE ITEMS (Under Parts Interpreter update)
-- ============================================================

CREATE TABLE part_line_items (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    quotation_update_id TEXT NOT NULL REFERENCES quotation_updates(id) ON DELETE CASCADE,
    old_part            TEXT NOT NULL,
    replacement_part    TEXT NOT NULL,
    price               NUMERIC(12, 2),
    currency            TEXT NOT NULL DEFAULT 'ZAR',
    eta                 TEXT,
    replacement_time    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_part_line_items_quotation_update_id ON part_line_items(quotation_update_id);

-- ============================================================
-- QUOTATION MEDIA
-- ============================================================

CREATE TABLE quotation_media (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    quotation_id        TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    quotation_update_id TEXT REFERENCES quotation_updates(id),
    part_line_item_id   TEXT REFERENCES part_line_items(id),
    uploaded_by_user_id TEXT,
    media_type          media_type NOT NULL DEFAULT 'Photo',
    media_category      TEXT,
    file_name           TEXT NOT NULL,
    file_url            TEXT NOT NULL,
    file_size           INTEGER,
    mime_type           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotation_media_quotation_id        ON quotation_media(quotation_id);
CREATE INDEX idx_quotation_media_quotation_update_id ON quotation_media(quotation_update_id);

-- ============================================================
-- APPROVAL REMINDER RULES
-- ============================================================

CREATE TABLE approval_reminder_rules (
    id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    rule_code            TEXT UNIQUE NOT NULL,
    workshop_id          TEXT NOT NULL REFERENCES workshops(id),
    quotation_id         TEXT NOT NULL REFERENCES quotations(id),
    channel              TEXT NOT NULL,
    first_reminder_delay TEXT NOT NULL,
    repeat_frequency     TEXT NOT NULL,
    max_attempts         INTEGER NOT NULL DEFAULT 3,
    current_attempts     INTEGER NOT NULL DEFAULT 0,
    stop_condition       TEXT NOT NULL,
    message_template     TEXT,
    status               reminder_status NOT NULL DEFAULT 'Active',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reminder_logs (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    rule_id    TEXT NOT NULL REFERENCES approval_reminder_rules(id) ON DELETE CASCADE,
    channel    TEXT NOT NULL,
    status     TEXT NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_reminder_rules_workshop_id  ON approval_reminder_rules(workshop_id);
CREATE INDEX idx_approval_reminder_rules_quotation_id ON approval_reminder_rules(quotation_id);
CREATE INDEX idx_approval_reminder_rules_status       ON approval_reminder_rules(status);
CREATE INDEX idx_reminder_logs_rule_id                ON reminder_logs(rule_id);

-- ============================================================
-- JOB CARDS
-- ============================================================

CREATE TABLE job_cards (
    id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    job_number                  TEXT UNIQUE NOT NULL,
    workshop_id                 TEXT NOT NULL REFERENCES workshops(id),
    quotation_id                TEXT UNIQUE NOT NULL REFERENCES quotations(id),
    vehicle_id                  TEXT REFERENCES vehicles(id),
    assigned_controller_id      TEXT REFERENCES users(id),
    assigned_technician_id      TEXT REFERENCES users(id),
    notify_parts_interpreter_id TEXT,
    department                  TEXT,
    priority                    job_priority NOT NULL DEFAULT 'Amber',
    status                      job_status NOT NULL DEFAULT 'New',
    expected_start_date         TIMESTAMPTZ,
    started_at                  TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    completion_note             TEXT,
    progress                    INTEGER NOT NULL DEFAULT 0,
    qc_approved_at              TIMESTAMPTZ,
    qc_approved_by_user_id      TEXT REFERENCES users(id),
    delivery_preference         TEXT,
    customer_notified_at        TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_job_cards_workshop_id           ON job_cards(workshop_id);
CREATE INDEX idx_job_cards_status                ON job_cards(status);
CREATE INDEX idx_job_cards_priority              ON job_cards(priority);
CREATE INDEX idx_job_cards_assigned_technician_id ON job_cards(assigned_technician_id);

-- ============================================================
-- JOB CHECKLIST ITEMS
-- ============================================================

CREATE TABLE job_checklist_items (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    job_card_id  TEXT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,
    state        TEXT,
    color        checklist_color NOT NULL DEFAULT 'Green',
    is_required  BOOLEAN NOT NULL DEFAULT TRUE,
    completed_at TIMESTAMPTZ,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_checklist_items_job_card_id ON job_checklist_items(job_card_id);

-- ============================================================
-- JOB ISSUES
-- ============================================================

CREATE TABLE job_issues (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    job_card_id      TEXT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    severity         issue_severity NOT NULL,
    note             TEXT,
    status           TEXT NOT NULL DEFAULT 'Open',
    raised_by_user_id TEXT,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_issues_job_card_id ON job_issues(job_card_id);
CREATE INDEX idx_job_issues_severity    ON job_issues(severity);

-- ============================================================
-- JOB MEDIA
-- ============================================================

CREATE TABLE job_media (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    job_card_id         TEXT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    uploaded_by_user_id TEXT,
    media_type          media_type NOT NULL DEFAULT 'Photo',
    media_category      TEXT,
    file_name           TEXT NOT NULL,
    file_url            TEXT NOT NULL,
    file_size           INTEGER,
    mime_type           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_media_job_card_id ON job_media(job_card_id);

-- ============================================================
-- SERVICE TEMPLATES
-- ============================================================

CREATE TABLE service_templates (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name                TEXT NOT NULL,
    module              TEXT NOT NULL,
    default_pricing_mode pricing_mode NOT NULL DEFAULT 'StandardPrice',
    duration            TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICE CHECKLIST TEMPLATES
-- ============================================================

CREATE TABLE service_checklist_templates (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    service_template_id     TEXT NOT NULL REFERENCES service_templates(id) ON DELETE CASCADE,
    item                    TEXT NOT NULL,
    is_required             BOOLEAN NOT NULL DEFAULT TRUE,
    price_mode              pricing_mode NOT NULL DEFAULT 'StandardPrice',
    standard_price          NUMERIC(12, 2),
    custom_price            NUMERIC(12, 2),
    currency                TEXT NOT NULL DEFAULT 'ZAR',
    technician_instruction  TEXT,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_checklist_templates_service_template_id ON service_checklist_templates(service_template_id);

-- ============================================================
-- SERVICE PRICING
-- ============================================================

CREATE TABLE service_pricing (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    service_template_id   TEXT NOT NULL REFERENCES service_templates(id),
    workshop_id           TEXT REFERENCES workshops(id),
    currency              TEXT NOT NULL DEFAULT 'ZAR',
    standard_price        NUMERIC(12, 2),
    custom_price          NUMERIC(12, 2),
    allow_custom_override BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from        TIMESTAMPTZ,
    approval_required     TEXT,
    tax_included          BOOLEAN NOT NULL DEFAULT TRUE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_pricing_service_template_id ON service_pricing(service_template_id);
CREATE INDEX idx_service_pricing_workshop_id          ON service_pricing(workshop_id);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    quotation_id   TEXT UNIQUE NOT NULL REFERENCES quotations(id),
    job_card_id    TEXT UNIQUE REFERENCES job_cards(id),
    issue_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date       TIMESTAMPTZ,
    subtotal       NUMERIC(12, 2) NOT NULL,
    tax            NUMERIC(12, 2),
    total          NUMERIC(12, 2) NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'ZAR',
    payment_status payment_status NOT NULL DEFAULT 'DueToday',
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_issue_date     ON invoices(issue_date);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================

CREATE TABLE invoice_line_items (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    qty         INTEGER NOT NULL DEFAULT 1,
    unit_price  NUMERIC(12, 2) NOT NULL,
    total       NUMERIC(12, 2) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'ZAR',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    payment_code        TEXT UNIQUE NOT NULL,
    invoice_id          TEXT NOT NULL REFERENCES invoices(id),
    method              payment_method NOT NULL,
    amount_received     NUMERIC(12, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'ZAR',
    reference_number    TEXT,
    gateway_status      TEXT,
    notes               TEXT,
    status              payment_status NOT NULL DEFAULT 'DueToday',
    recorded_by_user_id TEXT REFERENCES users(id),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status     ON payments(status);
CREATE INDEX idx_payments_method     ON payments(method);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    workshop_id    TEXT REFERENCES workshops(id),
    customer_id    TEXT REFERENCES customers(id),
    user_id        TEXT REFERENCES users(id),
    job_card_id    TEXT,
    quotation_id   TEXT,
    channel        notification_channel NOT NULL,
    type           TEXT NOT NULL,
    message        TEXT NOT NULL,
    status         notification_status NOT NULL DEFAULT 'Pending',
    sent_at        TIMESTAMPTZ,
    failure_reason TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_customer_id  ON notifications(customer_id);
CREATE INDEX idx_notifications_workshop_id  ON notifications(workshop_id);
CREATE INDEX idx_notifications_status       ON notifications(status);
CREATE INDEX idx_notifications_created_at   ON notifications(created_at);

-- ============================================================
-- Enable updated_at auto-update trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'enterprise_admins', 'clients', 'workshops', 'users',
        'customers', 'vehicles', 'appointments', 'quotations',
        'quotation_line_items', 'quotation_updates', 'part_line_items',
        'approval_reminder_rules', 'job_cards', 'job_checklist_items',
        'job_issues', 'service_templates', 'service_checklist_templates',
        'service_pricing', 'invoices', 'invoice_line_items', 'payments',
        'client_modules', 'modules'
    ]
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t);
    END LOOP;
END;
$$;
