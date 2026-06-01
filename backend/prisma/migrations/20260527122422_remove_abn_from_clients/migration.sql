-- Migration: remove abn column from clients table
ALTER TABLE "clients" DROP COLUMN IF EXISTS "abn";
