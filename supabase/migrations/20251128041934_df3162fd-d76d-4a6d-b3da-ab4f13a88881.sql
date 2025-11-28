-- Drop the old constraint
ALTER TABLE content_folders DROP CONSTRAINT IF EXISTS content_folders_type_check;

-- Add new constraint including 'post' type
ALTER TABLE content_folders ADD CONSTRAINT content_folders_type_check 
CHECK (type IN ('image', 'phrase', 'post'));