-- CreateEnum
CREATE TYPE "enterprise_admin_status" AS ENUM ('Active', 'Inactive', 'Blocked');

-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('Active', 'Inactive', 'Archived');

-- CreateEnum
CREATE TYPE "workshop_status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "workshop_type" AS ENUM ('Service', 'PaintAndPanel', 'FleetService', 'BodyShop');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('Technician', 'WorkshopController', 'Accounts', 'FrontDesk', 'Manager', 'PartsInterpreter', 'PartsController', 'CEO');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('Active', 'Inactive', 'Blocked');

-- CreateEnum
CREATE TYPE "communication_preference" AS ENUM ('WhatsApp', 'Email', 'PhoneCall', 'SMS');

-- CreateEnum
CREATE TYPE "customer_status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('Private', 'Fleet', 'Insurance', 'Warranty');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('Confirmed', 'WaitingApproval', 'Cancelled', 'Completed');

-- CreateEnum
CREATE TYPE "quote_priority" AS ENUM ('Red', 'Amber', 'Green');

-- CreateEnum
CREATE TYPE "quotation_status" AS ENUM ('Draft', 'InternalReview', 'InternalUpdatesReceived', 'SentToCustomer', 'CustomerApproved', 'CustomerRejected');

-- CreateEnum
CREATE TYPE "quotation_update_status" AS ENUM ('PendingUpdate', 'InProgress', 'Completed', 'NeedClarification');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('New', 'Accepted', 'InProgress', 'WaitingApproval', 'WaitingParts', 'Payment', 'Completed', 'QCReview', 'Critical', 'Ready');

-- CreateEnum
CREATE TYPE "job_priority" AS ENUM ('Red', 'Amber', 'Green');

-- CreateEnum
CREATE TYPE "issue_severity" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "checklist_color" AS ENUM ('Red', 'Amber', 'Green');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('Photo', 'Video', 'Document');

-- CreateEnum
CREATE TYPE "pricing_mode" AS ENUM ('StandardPrice', 'CustomPrice');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('Cash', 'Bank', 'MobileMoney', 'Card');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('DueToday', 'Overdue', 'PartPaid', 'Paid');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('Active', 'Paused');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('WhatsApp', 'Email', 'SMS');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('Pending', 'Sent', 'Failed', 'Skipped');

-- CreateTable
CREATE TABLE "enterprise_admins" (
    "id" TEXT NOT NULL,
    "admin_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Enterprise Admin',
    "email" TEXT NOT NULL,
    "login_email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "enterprise_admin_status" NOT NULL DEFAULT 'Active',
    "client_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "enterprise_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL DEFAULT 'ZAR',
    "abn" TEXT,
    "dealer_licence_number" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "invoice_format_url" TEXT,
    "status" "client_status" NOT NULL DEFAULT 'Active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_modules" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "workshop_type" NOT NULL DEFAULT 'Service',
    "address" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "opening_time" TEXT NOT NULL DEFAULT '10:00',
    "closing_time" TEXT NOT NULL DEFAULT '20:00',
    "daily_job_limit" INTEGER NOT NULL DEFAULT 30,
    "workshop_code" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "workshop_country" TEXT,
    "postal_code" TEXT,
    "ceo_name" TEXT,
    "ceo_email" TEXT,
    "ceo_phone" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "workshop_status" NOT NULL DEFAULT 'Active',
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "login_email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "phone" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'Active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "enterprise_admin_id" TEXT,
    "login_email" TEXT NOT NULL,
    "login_status" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "communication_preference" "communication_preference" NOT NULL DEFAULT 'WhatsApp',
    "license_number" TEXT,
    "address" TEXT,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_whatsapp_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "customer_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "vin" TEXT,
    "make_model" TEXT NOT NULL,
    "mileage" INTEGER,
    "vehicle_type" "vehicle_type" NOT NULL DEFAULT 'Private',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointment_code" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "appointment_time" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "notes" TEXT,
    "status" "appointment_status" NOT NULL DEFAULT 'Confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "repair_type" TEXT NOT NULL,
    "priority" "quote_priority" NOT NULL DEFAULT 'Amber',
    "customer_complaint" TEXT,
    "front_desk_status" TEXT,
    "total_estimate" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "quotation_status" NOT NULL DEFAULT 'Draft',
    "send_to_workshop_controller" BOOLEAN NOT NULL DEFAULT false,
    "send_to_technician" BOOLEAN NOT NULL DEFAULT false,
    "send_to_parts_interpreter" BOOLEAN NOT NULL DEFAULT false,
    "approval_token" TEXT,
    "sent_to_customer_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "customer_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_line_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "added_by_role" TEXT NOT NULL,
    "repair_time" TEXT,
    "cost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" TEXT NOT NULL DEFAULT 'Added',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_updates" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "focus_note" TEXT,
    "time_eta" TEXT,
    "cost_impact" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "quotation_update_status" NOT NULL DEFAULT 'PendingUpdate',
    "notes" TEXT,
    "sent_back_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_line_items" (
    "id" TEXT NOT NULL,
    "quotation_update_id" TEXT NOT NULL,
    "old_part" TEXT NOT NULL,
    "replacement_part" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "eta" TEXT,
    "replacement_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_media" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "quotation_update_id" TEXT,
    "part_line_item_id" TEXT,
    "uploaded_by_user_id" TEXT,
    "media_type" "media_type" NOT NULL DEFAULT 'Photo',
    "media_category" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_reminder_rules" (
    "id" TEXT NOT NULL,
    "rule_code" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "first_reminder_delay" TEXT NOT NULL,
    "repeat_frequency" TEXT NOT NULL,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "current_attempts" INTEGER NOT NULL DEFAULT 0,
    "stop_condition" TEXT NOT NULL,
    "message_template" TEXT,
    "status" "reminder_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_reminder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_cards" (
    "id" TEXT NOT NULL,
    "job_number" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "assigned_controller_id" TEXT,
    "assigned_technician_id" TEXT,
    "notify_parts_interpreter_id" TEXT,
    "department" TEXT,
    "priority" "job_priority" NOT NULL DEFAULT 'Amber',
    "status" "job_status" NOT NULL DEFAULT 'New',
    "expected_start_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completion_note" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "qc_approved_at" TIMESTAMP(3),
    "qc_approved_by_user_id" TEXT,
    "delivery_preference" TEXT,
    "customer_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "job_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_checklist_items" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "state" TEXT,
    "color" "checklist_color" NOT NULL DEFAULT 'Green',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_issues" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "issue_severity" NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "raised_by_user_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_media" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "media_type" "media_type" NOT NULL DEFAULT 'Photo',
    "media_category" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "default_pricing_mode" "pricing_mode" NOT NULL DEFAULT 'StandardPrice',
    "duration" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_checklist_templates" (
    "id" TEXT NOT NULL,
    "service_template_id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "price_mode" "pricing_mode" NOT NULL DEFAULT 'StandardPrice',
    "standard_price" DECIMAL(12,2),
    "custom_price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "technician_instruction" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pricing" (
    "id" TEXT NOT NULL,
    "service_template_id" TEXT NOT NULL,
    "workshop_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "standard_price" DECIMAL(12,2),
    "custom_price" DECIMAL(12,2),
    "allow_custom_override" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "approval_required" TEXT,
    "tax_included" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "job_card_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "payment_status" "payment_status" NOT NULL DEFAULT 'DueToday',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "payment_code" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "method" "payment_method" NOT NULL,
    "amount_received" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "reference_number" TEXT,
    "gateway_status" TEXT,
    "notes" TEXT,
    "status" "payment_status" NOT NULL DEFAULT 'DueToday',
    "recorded_by_user_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT,
    "customer_id" TEXT,
    "user_id" TEXT,
    "job_card_id" TEXT,
    "quotation_id" TEXT,
    "channel" "notification_channel" NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'Pending',
    "sent_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_admins_admin_code_key" ON "enterprise_admins"("admin_code");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_admins_email_key" ON "enterprise_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_admins_login_email_key" ON "enterprise_admins"("login_email");

-- CreateIndex
CREATE INDEX "enterprise_admins_email_idx" ON "enterprise_admins"("email");

-- CreateIndex
CREATE INDEX "enterprise_admins_status_idx" ON "enterprise_admins"("status");

-- CreateIndex
CREATE INDEX "enterprise_admins_client_id_idx" ON "enterprise_admins"("client_id");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_country_idx" ON "clients"("country");

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "client_modules_client_id_module_id_key" ON "client_modules"("client_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshops_workshop_code_key" ON "workshops"("workshop_code");

-- CreateIndex
CREATE INDEX "workshops_client_id_idx" ON "workshops"("client_id");

-- CreateIndex
CREATE INDEX "workshops_status_idx" ON "workshops"("status");

-- CreateIndex
CREATE INDEX "workshops_city_idx" ON "workshops"("city");

-- CreateIndex
CREATE INDEX "workshops_created_by_admin_id_idx" ON "workshops"("created_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_email_key" ON "users"("login_email");

-- CreateIndex
CREATE INDEX "users_workshop_id_idx" ON "users"("workshop_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "login_activities_user_id_idx" ON "login_activities"("user_id");

-- CreateIndex
CREATE INDEX "login_activities_login_email_idx" ON "login_activities"("login_email");

-- CreateIndex
CREATE INDEX "login_activities_created_at_idx" ON "login_activities"("created_at");

-- CreateIndex
CREATE INDEX "customers_workshop_id_idx" ON "customers"("workshop_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles"("customer_id");

-- CreateIndex
CREATE INDEX "vehicles_registration_no_idx" ON "vehicles"("registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointment_code_key" ON "appointments"("appointment_code");

-- CreateIndex
CREATE INDEX "appointments_workshop_id_idx" ON "appointments"("workshop_id");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quote_number_key" ON "quotations"("quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_approval_token_key" ON "quotations"("approval_token");

-- CreateIndex
CREATE INDEX "quotations_workshop_id_idx" ON "quotations"("workshop_id");

-- CreateIndex
CREATE INDEX "quotations_customer_id_idx" ON "quotations"("customer_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_approval_token_idx" ON "quotations"("approval_token");

-- CreateIndex
CREATE INDEX "quotation_line_items_quotation_id_idx" ON "quotation_line_items"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_updates_quotation_id_idx" ON "quotation_updates"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_updates_updated_by_user_id_idx" ON "quotation_updates"("updated_by_user_id");

-- CreateIndex
CREATE INDEX "part_line_items_quotation_update_id_idx" ON "part_line_items"("quotation_update_id");

-- CreateIndex
CREATE INDEX "quotation_media_quotation_id_idx" ON "quotation_media"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_media_quotation_update_id_idx" ON "quotation_media"("quotation_update_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_reminder_rules_rule_code_key" ON "approval_reminder_rules"("rule_code");

-- CreateIndex
CREATE INDEX "approval_reminder_rules_workshop_id_idx" ON "approval_reminder_rules"("workshop_id");

-- CreateIndex
CREATE INDEX "approval_reminder_rules_quotation_id_idx" ON "approval_reminder_rules"("quotation_id");

-- CreateIndex
CREATE INDEX "approval_reminder_rules_status_idx" ON "approval_reminder_rules"("status");

-- CreateIndex
CREATE INDEX "reminder_logs_rule_id_idx" ON "reminder_logs"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_cards_job_number_key" ON "job_cards"("job_number");

-- CreateIndex
CREATE UNIQUE INDEX "job_cards_quotation_id_key" ON "job_cards"("quotation_id");

-- CreateIndex
CREATE INDEX "job_cards_workshop_id_idx" ON "job_cards"("workshop_id");

-- CreateIndex
CREATE INDEX "job_cards_status_idx" ON "job_cards"("status");

-- CreateIndex
CREATE INDEX "job_cards_priority_idx" ON "job_cards"("priority");

-- CreateIndex
CREATE INDEX "job_cards_assigned_technician_id_idx" ON "job_cards"("assigned_technician_id");

-- CreateIndex
CREATE INDEX "job_checklist_items_job_card_id_idx" ON "job_checklist_items"("job_card_id");

-- CreateIndex
CREATE INDEX "job_issues_job_card_id_idx" ON "job_issues"("job_card_id");

-- CreateIndex
CREATE INDEX "job_issues_severity_idx" ON "job_issues"("severity");

-- CreateIndex
CREATE INDEX "job_media_job_card_id_idx" ON "job_media"("job_card_id");

-- CreateIndex
CREATE INDEX "service_checklist_templates_service_template_id_idx" ON "service_checklist_templates"("service_template_id");

-- CreateIndex
CREATE INDEX "service_pricing_service_template_id_idx" ON "service_pricing"("service_template_id");

-- CreateIndex
CREATE INDEX "service_pricing_workshop_id_idx" ON "service_pricing"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_quotation_id_key" ON "invoices"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_job_card_id_key" ON "invoices"("job_card_id");

-- CreateIndex
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "notifications_customer_id_idx" ON "notifications"("customer_id");

-- CreateIndex
CREATE INDEX "notifications_workshop_id_idx" ON "notifications"("workshop_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_admin_id_idx" ON "password_reset_tokens"("admin_id");

-- AddForeignKey
ALTER TABLE "enterprise_admins" ADD CONSTRAINT "enterprise_admins_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_modules" ADD CONSTRAINT "client_modules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_modules" ADD CONSTRAINT "client_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "enterprise_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_enterprise_admin_id_fkey" FOREIGN KEY ("enterprise_admin_id") REFERENCES "enterprise_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_updates" ADD CONSTRAINT "quotation_updates_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_updates" ADD CONSTRAINT "quotation_updates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_line_items" ADD CONSTRAINT "part_line_items_quotation_update_id_fkey" FOREIGN KEY ("quotation_update_id") REFERENCES "quotation_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_media" ADD CONSTRAINT "quotation_media_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_media" ADD CONSTRAINT "quotation_media_quotation_update_id_fkey" FOREIGN KEY ("quotation_update_id") REFERENCES "quotation_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_media" ADD CONSTRAINT "quotation_media_part_line_item_id_fkey" FOREIGN KEY ("part_line_item_id") REFERENCES "part_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_reminder_rules" ADD CONSTRAINT "approval_reminder_rules_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_reminder_rules" ADD CONSTRAINT "approval_reminder_rules_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "approval_reminder_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_assigned_technician_id_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_assigned_controller_id_fkey" FOREIGN KEY ("assigned_controller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_qc_approved_by_user_id_fkey" FOREIGN KEY ("qc_approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_checklist_items" ADD CONSTRAINT "job_checklist_items_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_issues" ADD CONSTRAINT "job_issues_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_media" ADD CONSTRAINT "job_media_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checklist_templates" ADD CONSTRAINT "service_checklist_templates_service_template_id_fkey" FOREIGN KEY ("service_template_id") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_service_template_id_fkey" FOREIGN KEY ("service_template_id") REFERENCES "service_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "enterprise_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
