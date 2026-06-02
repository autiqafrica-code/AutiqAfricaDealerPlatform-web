-- Add assigned_parts_interpreter_id column to job_cards

ALTER TABLE "job_cards" ADD COLUMN IF NOT EXISTS "assigned_parts_interpreter_id" TEXT;

CREATE INDEX IF NOT EXISTS "job_cards_assigned_parts_interpreter_id_idx"
  ON "job_cards"("assigned_parts_interpreter_id");
