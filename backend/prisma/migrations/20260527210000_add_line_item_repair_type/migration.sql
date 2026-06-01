-- Add repair_type to quotation_line_items so each line item can specify its own repair category
ALTER TABLE quotation_line_items
  ADD COLUMN IF NOT EXISTS repair_type VARCHAR(50);
