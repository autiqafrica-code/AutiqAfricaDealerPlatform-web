-- Add priority and notes fields to quotation_line_items
ALTER TABLE quotation_line_items
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes    TEXT;
