-- CreateTable
CREATE TABLE "failed_components" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "job_card_id" TEXT,
    "quotation_id" TEXT,
    "technician_id" TEXT NOT NULL,
    "component_name" TEXT NOT NULL,
    "failure_description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'Medium',
    "replacement_required" BOOLEAN NOT NULL DEFAULT true,
    "technician_notes" TEXT,
    "technician_cost_impact" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "failed_component_image_url" TEXT,
    "replaced_component_image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PendingReview',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_component_reviews" (
    "id" TEXT NOT NULL,
    "failed_component_id" TEXT NOT NULL,
    "parts_interpreter_id" TEXT NOT NULL,
    "replacement_decision" TEXT,
    "part_number" TEXT,
    "part_description" TEXT,
    "availability_status" TEXT,
    "quantity_required" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "supplier_name" TEXT,
    "supplier_contact" TEXT,
    "expected_delivery_date" TIMESTAMP(3),
    "alternative_part_suggested" TEXT,
    "alternative_part_number" TEXT,
    "parts_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'InReview',
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_component_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "failed_components_workshop_id_idx" ON "failed_components"("workshop_id");

-- CreateIndex
CREATE INDEX "failed_components_job_card_id_idx" ON "failed_components"("job_card_id");

-- CreateIndex
CREATE INDEX "failed_components_technician_id_idx" ON "failed_components"("technician_id");

-- CreateIndex
CREATE INDEX "failed_components_status_idx" ON "failed_components"("status");

-- CreateIndex
CREATE UNIQUE INDEX "failed_component_reviews_failed_component_id_key" ON "failed_component_reviews"("failed_component_id");

-- CreateIndex
CREATE INDEX "failed_component_reviews_failed_component_id_idx" ON "failed_component_reviews"("failed_component_id");

-- CreateIndex
CREATE INDEX "failed_component_reviews_parts_interpreter_id_idx" ON "failed_component_reviews"("parts_interpreter_id");

-- AddForeignKey
ALTER TABLE "failed_components" ADD CONSTRAINT "failed_components_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_components" ADD CONSTRAINT "failed_components_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_components" ADD CONSTRAINT "failed_components_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_components" ADD CONSTRAINT "failed_components_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_component_reviews" ADD CONSTRAINT "failed_component_reviews_failed_component_id_fkey" FOREIGN KEY ("failed_component_id") REFERENCES "failed_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_component_reviews" ADD CONSTRAINT "failed_component_reviews_parts_interpreter_id_fkey" FOREIGN KEY ("parts_interpreter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
