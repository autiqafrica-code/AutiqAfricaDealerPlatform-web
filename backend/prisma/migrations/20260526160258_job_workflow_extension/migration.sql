-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "job_status" ADD VALUE 'SentToWorkshopController';
ALTER TYPE "job_status" ADD VALUE 'AssignedToTechnician';
ALTER TYPE "job_status" ADD VALUE 'AdditionalWorkIdentified';
ALTER TYPE "job_status" ADD VALUE 'AdditionalWorkApproved';
ALTER TYPE "job_status" ADD VALUE 'AdditionalWorkRejected';
ALTER TYPE "job_status" ADD VALUE 'TechnicianCompleted';
ALTER TYPE "job_status" ADD VALUE 'ReadyForInvoice';
ALTER TYPE "job_status" ADD VALUE 'InvoiceGenerated';
ALTER TYPE "job_status" ADD VALUE 'PaymentCleared';
ALTER TYPE "job_status" ADD VALUE 'ReadyForDelivery';
ALTER TYPE "job_status" ADD VALUE 'CustomerContactedForDelivery';
ALTER TYPE "job_status" ADD VALUE 'VehicleDelivered';
ALTER TYPE "job_status" ADD VALUE 'Closed';
ALTER TYPE "job_status" ADD VALUE 'Cancelled';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "sent_to_front_desk_at" TIMESTAMP(3),
ADD COLUMN     "shared_with_customer_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "job_cards" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "issue_severity" TEXT,
ADD COLUMN     "sent_to_controller_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "job_status_history" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "performed_by_user_id" TEXT,
    "performed_by_name" TEXT,
    "performed_by_role" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_completion_reports" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "issue_severity" TEXT NOT NULL,
    "completion_notes" TEXT,
    "remaining_issues" TEXT,
    "customer_advisory_notes" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_completion_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_additional_work_requests" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'Medium',
    "estimated_labour_hours" TEXT,
    "estimated_parts_cost" DECIMAL(12,2),
    "estimated_total_cost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" TEXT NOT NULL DEFAULT 'SENT_TO_FRONT_DESK',
    "quotation_id" TEXT,
    "customer_decision" TEXT,
    "customer_decided_at" TIMESTAMP(3),
    "front_desk_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_additional_work_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_status_history_job_card_id_idx" ON "job_status_history"("job_card_id");

-- CreateIndex
CREATE INDEX "job_status_history_workshop_id_idx" ON "job_status_history"("workshop_id");

-- CreateIndex
CREATE INDEX "job_status_history_created_at_idx" ON "job_status_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_completion_reports_job_card_id_key" ON "job_completion_reports"("job_card_id");

-- CreateIndex
CREATE INDEX "job_completion_reports_job_card_id_idx" ON "job_completion_reports"("job_card_id");

-- CreateIndex
CREATE INDEX "job_completion_reports_workshop_id_idx" ON "job_completion_reports"("workshop_id");

-- CreateIndex
CREATE INDEX "job_completion_reports_technician_id_idx" ON "job_completion_reports"("technician_id");

-- CreateIndex
CREATE INDEX "job_additional_work_requests_job_card_id_idx" ON "job_additional_work_requests"("job_card_id");

-- CreateIndex
CREATE INDEX "job_additional_work_requests_workshop_id_idx" ON "job_additional_work_requests"("workshop_id");

-- CreateIndex
CREATE INDEX "job_additional_work_requests_technician_id_idx" ON "job_additional_work_requests"("technician_id");

-- CreateIndex
CREATE INDEX "job_additional_work_requests_status_idx" ON "job_additional_work_requests"("status");

-- AddForeignKey
ALTER TABLE "job_status_history" ADD CONSTRAINT "job_status_history_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_completion_reports" ADD CONSTRAINT "job_completion_reports_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_additional_work_requests" ADD CONSTRAINT "job_additional_work_requests_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
