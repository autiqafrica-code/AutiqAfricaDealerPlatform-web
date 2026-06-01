-- Add sent-back flags to quotations so each role can mark "done"
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS technician_sent_back BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS workshop_controller_sent_back BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parts_interpreter_sent_back BOOLEAN NOT NULL DEFAULT false;

-- Add per-role notes to quotation line items
ALTER TABLE quotation_line_items
  ADD COLUMN IF NOT EXISTS technician_notes TEXT,
  ADD COLUMN IF NOT EXISTS workshop_controller_notes TEXT,
  ADD COLUMN IF NOT EXISTS parts_interpreter_notes TEXT;
