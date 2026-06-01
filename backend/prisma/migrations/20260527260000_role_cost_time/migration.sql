ALTER TABLE quotation_line_items
  ADD COLUMN IF NOT EXISTS technician_cost              DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS technician_repair_time       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS workshop_controller_cost     DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS workshop_controller_repair_time VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parts_interpreter_cost       DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS parts_interpreter_repair_time VARCHAR(255),
  ADD COLUMN IF NOT EXISTS selected_cost_source         VARCHAR(50);
