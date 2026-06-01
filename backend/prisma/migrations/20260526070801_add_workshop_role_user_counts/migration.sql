-- CreateTable
CREATE TABLE "workshop_role_user_counts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "required_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_role_user_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workshop_role_user_counts_client_id_idx" ON "workshop_role_user_counts"("client_id");

-- CreateIndex
CREATE INDEX "workshop_role_user_counts_workshop_id_idx" ON "workshop_role_user_counts"("workshop_id");

-- CreateIndex
CREATE INDEX "workshop_role_user_counts_role_id_idx" ON "workshop_role_user_counts"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_role_user_counts_workshop_id_role_id_key" ON "workshop_role_user_counts"("workshop_id", "role_id");

-- AddForeignKey
ALTER TABLE "workshop_role_user_counts" ADD CONSTRAINT "workshop_role_user_counts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_role_user_counts" ADD CONSTRAINT "workshop_role_user_counts_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_role_user_counts" ADD CONSTRAINT "workshop_role_user_counts_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
