-- Migrate any existing PartsController users to WorkshopController
UPDATE "users"
SET role = 'WorkshopController'
WHERE role = 'PartsController';

-- Remove workshop_role_user_counts for PARTS_CONTROLLER
DELETE FROM "workshop_role_user_counts"
WHERE role_id IN (SELECT id FROM "roles" WHERE code = 'PARTS_CONTROLLER');

-- Remove PARTS_CONTROLLER from roles table
DELETE FROM "roles"
WHERE code = 'PARTS_CONTROLLER';

-- Recreate enum without PartsController
CREATE TYPE "user_role_new" AS ENUM (
  'Technician',
  'WorkshopController',
  'Accounts',
  'FrontDesk',
  'Manager',
  'PartsInterpreter',
  'CEO'
);

ALTER TABLE "users"
  ALTER COLUMN role TYPE "user_role_new"
  USING role::text::"user_role_new";

DROP TYPE "user_role";

ALTER TYPE "user_role_new" RENAME TO "user_role";