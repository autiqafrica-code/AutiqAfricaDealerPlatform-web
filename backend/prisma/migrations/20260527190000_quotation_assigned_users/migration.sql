-- Add per-role user assignment to quotations
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS assigned_technician_id          VARCHAR,
  ADD COLUMN IF NOT EXISTS assigned_workshop_controller_id VARCHAR,
  ADD COLUMN IF NOT EXISTS assigned_parts_interpreter_id   VARCHAR;

CREATE INDEX IF NOT EXISTS idx_quotations_assigned_tech  ON quotations (assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_ctrl  ON quotations (assigned_workshop_controller_id);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_parts ON quotations (assigned_parts_interpreter_id);
