-- Migration: remove SMS from communication_preference and notification_channel enums
-- First convert any existing SMS rows to WhatsApp so the enum drop doesn't fail

UPDATE "customers" SET "communication_preference" = 'WhatsApp' WHERE "communication_preference" = 'SMS';
UPDATE "notifications" SET "channel" = 'WhatsApp' WHERE "channel" = 'SMS';

-- Recreate communication_preference enum without SMS
-- Drop default first, change type, then restore default
ALTER TABLE "customers" ALTER COLUMN "communication_preference" DROP DEFAULT;
ALTER TYPE "communication_preference" RENAME TO "communication_preference_old";
CREATE TYPE "communication_preference" AS ENUM ('WhatsApp', 'Email', 'PhoneCall');
ALTER TABLE "customers" ALTER COLUMN "communication_preference" TYPE "communication_preference" USING "communication_preference"::text::"communication_preference";
ALTER TABLE "customers" ALTER COLUMN "communication_preference" SET DEFAULT 'WhatsApp'::"communication_preference";
DROP TYPE "communication_preference_old";

-- Recreate notification_channel enum without SMS
ALTER TYPE "notification_channel" RENAME TO "notification_channel_old";
CREATE TYPE "notification_channel" AS ENUM ('WhatsApp', 'Email');
ALTER TABLE "notifications" ALTER COLUMN "channel" TYPE "notification_channel" USING "channel"::text::"notification_channel";
DROP TYPE "notification_channel_old";
