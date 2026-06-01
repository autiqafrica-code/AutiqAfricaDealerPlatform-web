-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT,
    "isd_code" TEXT NOT NULL,
    "currency_name" TEXT,
    "currency_code" TEXT,
    "currency_symbol" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_drafts" (
    "id" TEXT NOT NULL,
    "enterprise_admin_id" TEXT NOT NULL,
    "draft_name" TEXT NOT NULL DEFAULT 'Untitled draft',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE INDEX "countries_iso2_idx" ON "countries"("iso2");

-- CreateIndex
CREATE INDEX "countries_currency_code_idx" ON "countries"("currency_code");

-- CreateIndex
CREATE INDEX "states_country_id_idx" ON "states"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "states_country_id_name_key" ON "states"("country_id", "name");

-- CreateIndex
CREATE INDEX "client_drafts_enterprise_admin_id_idx" ON "client_drafts"("enterprise_admin_id");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_drafts" ADD CONSTRAINT "client_drafts_enterprise_admin_id_fkey" FOREIGN KEY ("enterprise_admin_id") REFERENCES "enterprise_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
