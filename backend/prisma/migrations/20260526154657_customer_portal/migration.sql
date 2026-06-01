-- CreateEnum
CREATE TYPE "portal_link_status" AS ENUM ('Active', 'Expired', 'Revoked');

-- AlterTable
ALTER TABLE "job_media" ADD COLUMN     "customer_visible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "customer_portal_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "status" "portal_link_status" NOT NULL DEFAULT 'Active',
    "expires_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "customer_portal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_delivery_preferences" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "preference" TEXT NOT NULL DEFAULT 'COLLECTION_AT_WORKSHOP',
    "delivery_address" TEXT,
    "preferred_date" TEXT,
    "preferred_time_window" TEXT,
    "notes" TEXT,
    "selected_via" TEXT NOT NULL DEFAULT 'CUSTOMER_PORTAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_delivery_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_portal_links_token_hash_key" ON "customer_portal_links"("token_hash");

-- CreateIndex
CREATE INDEX "customer_portal_links_token_hash_idx" ON "customer_portal_links"("token_hash");

-- CreateIndex
CREATE INDEX "customer_portal_links_job_card_id_idx" ON "customer_portal_links"("job_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_delivery_preferences_job_card_id_key" ON "job_delivery_preferences"("job_card_id");

-- CreateIndex
CREATE INDEX "job_delivery_preferences_job_card_id_idx" ON "job_delivery_preferences"("job_card_id");

-- AddForeignKey
ALTER TABLE "customer_portal_links" ADD CONSTRAINT "customer_portal_links_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_links" ADD CONSTRAINT "customer_portal_links_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_links" ADD CONSTRAINT "customer_portal_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_delivery_preferences" ADD CONSTRAINT "job_delivery_preferences_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
