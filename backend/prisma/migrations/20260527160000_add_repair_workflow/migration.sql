-- ============================================================
-- Migration: add_repair_workflow
-- Adds multi-repair support: RepairItem, RepairItemInput,
-- RepairItemPartsOption, RepairItemTimeEstimate, VehicleInsuranceDetails
-- Extends: Invoice, Payment, QuotationLineItem, Quotation
-- ============================================================

-- Extend quotations
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" INTEGER;

-- Extend quotation_line_items
ALTER TABLE "quotation_line_items" ADD COLUMN IF NOT EXISTS "repair_item_id" TEXT;
ALTER TABLE "quotation_line_items" ADD COLUMN IF NOT EXISTS "line_type" TEXT;

-- Extend invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "clearance_status" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cleared_at" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cleared_by_user_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "has_insurance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "insurance_id" TEXT;

-- Extend payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_type" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "insurance_provider" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "claim_number" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "insurance_contact_name" TEXT;

-- ============================================================
-- CREATE: repair_items
-- ============================================================

CREATE TABLE "repair_items" (
    "id"                           TEXT NOT NULL,
    "workshop_id"                  TEXT NOT NULL,
    "job_card_id"                  TEXT NOT NULL,
    "quotation_id"                 TEXT,
    "customer_id"                  TEXT NOT NULL,
    "vehicle_id"                   TEXT NOT NULL,
    "title"                        TEXT NOT NULL,
    "description"                  TEXT,
    "category"                     TEXT,
    "customer_complaint"           TEXT,
    "requested_by_user_id"         TEXT NOT NULL,
    "status"                       TEXT NOT NULL DEFAULT 'Pending',
    "priority"                     TEXT NOT NULL DEFAULT 'Amber',
    "requires_technician_input"    BOOLEAN NOT NULL DEFAULT false,
    "requires_parts_input"         BOOLEAN NOT NULL DEFAULT false,
    "requires_controller_input"    BOOLEAN NOT NULL DEFAULT false,
    "estimated_duration_minutes"   INTEGER,
    "calculated_duration_minutes"  INTEGER,
    "estimated_start_at"           TIMESTAMP(3),
    "estimated_end_at"             TIMESTAMP(3),
    "is_parallel_allowed"          BOOLEAN NOT NULL DEFAULT true,
    "sequence_order"               INTEGER,
    "customer_approval_status"     TEXT NOT NULL DEFAULT 'Pending',
    "approved_by_customer_at"      TIMESTAMP(3),
    "sent_to_technician_at"        TIMESTAMP(3),
    "sent_to_parts_at"             TIMESTAMP(3),
    "sent_to_controller_at"        TIMESTAMP(3),
    "technician_input_submitted_at" TIMESTAMP(3),
    "parts_input_submitted_at"     TIMESTAMP(3),
    "controller_input_submitted_at" TIMESTAMP(3),
    "notes"                        TEXT,
    "sort_order"                   INTEGER NOT NULL DEFAULT 0,
    "created_at"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                   TIMESTAMP(3) NOT NULL,
    "deleted_at"                   TIMESTAMP(3),

    CONSTRAINT "repair_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_items_workshop_id_idx" ON "repair_items"("workshop_id");
CREATE INDEX "repair_items_job_card_id_idx" ON "repair_items"("job_card_id");
CREATE INDEX "repair_items_customer_id_idx" ON "repair_items"("customer_id");
CREATE INDEX "repair_items_status_idx" ON "repair_items"("status");

-- ============================================================
-- CREATE: repair_item_inputs
-- ============================================================

CREATE TABLE "repair_item_inputs" (
    "id"                         TEXT NOT NULL,
    "repair_item_id"             TEXT NOT NULL,
    "job_card_id"                TEXT NOT NULL,
    "workshop_id"                TEXT NOT NULL,
    "role_code"                  TEXT NOT NULL,
    "user_id"                    TEXT NOT NULL,
    "notes"                      TEXT,
    "diagnosis_notes"            TEXT,
    "labour_hours"               DECIMAL(8,2),
    "labour_cost"                DECIMAL(12,2),
    "currency"                   TEXT NOT NULL DEFAULT 'ZAR',
    "parts_required"             BOOLEAN NOT NULL DEFAULT false,
    "estimated_duration_minutes" INTEGER,
    "cost_impact"                DECIMAL(12,2),
    "technician_risk"            TEXT,
    "safety_flag"                BOOLEAN NOT NULL DEFAULT false,
    "additional_work_flag"       BOOLEAN NOT NULL DEFAULT false,
    "bay_required"               TEXT,
    "repair_route"               TEXT,
    "can_run_in_parallel"        BOOLEAN NOT NULL DEFAULT true,
    "workshop_notes"             TEXT,
    "status"                     TEXT NOT NULL DEFAULT 'Draft',
    "submitted_at"               TIMESTAMP(3),
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_item_inputs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_item_inputs_repair_item_id_idx" ON "repair_item_inputs"("repair_item_id");
CREATE INDEX "repair_item_inputs_job_card_id_idx" ON "repair_item_inputs"("job_card_id");
CREATE INDEX "repair_item_inputs_user_id_idx" ON "repair_item_inputs"("user_id");

-- ============================================================
-- CREATE: repair_item_parts_options
-- ============================================================

CREATE TABLE "repair_item_parts_options" (
    "id"                     TEXT NOT NULL,
    "repair_item_id"         TEXT NOT NULL,
    "workshop_id"            TEXT NOT NULL,
    "parts_interpreter_id"   TEXT NOT NULL,
    "part_name"              TEXT NOT NULL,
    "brand"                  TEXT,
    "part_number"            TEXT,
    "supplier_name"          TEXT,
    "availability_status"    TEXT NOT NULL,
    "available_quantity"     INTEGER,
    "lead_time_days"         INTEGER,
    "lead_time_hours"        INTEGER,
    "unit_cost"              DECIMAL(12,2) NOT NULL,
    "selling_price"          DECIMAL(12,2) NOT NULL,
    "quantity"               INTEGER NOT NULL DEFAULT 1,
    "total_cost"             DECIMAL(12,2) NOT NULL,
    "currency"               TEXT NOT NULL DEFAULT 'ZAR',
    "expected_available_at"  TIMESTAMP(3),
    "recommended"            BOOLEAN NOT NULL DEFAULT false,
    "selected"               BOOLEAN NOT NULL DEFAULT false,
    "notes"                  TEXT,
    "submitted_to_quote"     BOOLEAN NOT NULL DEFAULT false,
    "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_item_parts_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_item_parts_options_repair_item_id_idx" ON "repair_item_parts_options"("repair_item_id");

-- ============================================================
-- CREATE: repair_item_time_estimates
-- ============================================================

CREATE TABLE "repair_item_time_estimates" (
    "id"                         TEXT NOT NULL,
    "repair_item_id"             TEXT NOT NULL,
    "workshop_id"                TEXT NOT NULL,
    "source_role"                TEXT NOT NULL,
    "source_user_id"             TEXT NOT NULL,
    "labour_duration_minutes"    INTEGER,
    "parts_lead_time_minutes"    INTEGER,
    "total_duration_minutes"     INTEGER NOT NULL,
    "assumptions"                TEXT,
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_item_time_estimates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_item_time_estimates_repair_item_id_idx" ON "repair_item_time_estimates"("repair_item_id");

-- ============================================================
-- CREATE: vehicle_insurance_details
-- ============================================================

CREATE TABLE "vehicle_insurance_details" (
    "id"                       TEXT NOT NULL,
    "workshop_id"              TEXT NOT NULL,
    "customer_id"              TEXT NOT NULL,
    "vehicle_id"               TEXT NOT NULL,
    "job_card_id"              TEXT,
    "provider_name"            TEXT NOT NULL,
    "policy_number"            TEXT NOT NULL,
    "claim_number"             TEXT,
    "insurance_contact_name"   TEXT,
    "insurance_contact_phone"  TEXT,
    "insurance_contact_email"  TEXT,
    "coverage_type"            TEXT,
    "coverage_limit"           DECIMAL(12,2),
    "deductible_amount"        DECIMAL(12,2),
    "currency"                 TEXT NOT NULL DEFAULT 'ZAR',
    "expiry_date"              TIMESTAMP(3),
    "status"                   TEXT NOT NULL DEFAULT 'Active',
    "notes"                    TEXT,
    "created_by_user_id"       TEXT NOT NULL,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_insurance_details_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_insurance_details_workshop_id_idx" ON "vehicle_insurance_details"("workshop_id");
CREATE INDEX "vehicle_insurance_details_vehicle_id_idx" ON "vehicle_insurance_details"("vehicle_id");
CREATE INDEX "vehicle_insurance_details_customer_id_idx" ON "vehicle_insurance_details"("customer_id");

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

ALTER TABLE "repair_items"
    ADD CONSTRAINT "repair_items_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_items_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_items_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_item_inputs"
    ADD CONSTRAINT "repair_item_inputs_repair_item_id_fkey" FOREIGN KEY ("repair_item_id") REFERENCES "repair_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_item_inputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_item_parts_options"
    ADD CONSTRAINT "repair_item_parts_options_repair_item_id_fkey" FOREIGN KEY ("repair_item_id") REFERENCES "repair_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_item_parts_options_parts_interpreter_id_fkey" FOREIGN KEY ("parts_interpreter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_item_time_estimates"
    ADD CONSTRAINT "repair_item_time_estimates_repair_item_id_fkey" FOREIGN KEY ("repair_item_id") REFERENCES "repair_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "repair_item_time_estimates_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_insurance_details"
    ADD CONSTRAINT "vehicle_insurance_details_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "vehicle_insurance_details_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "vehicle_insurance_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "vehicle_insurance_details_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "vehicle_insurance_details_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotation_line_items"
    ADD CONSTRAINT "quotation_line_items_repair_item_id_fkey" FOREIGN KEY ("repair_item_id") REFERENCES "repair_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_insurance_id_fkey" FOREIGN KEY ("insurance_id") REFERENCES "vehicle_insurance_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
