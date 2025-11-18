-- Add profile_picture_url column to threads_accounts table
ALTER TABLE threads_accounts ADD COLUMN IF NOT EXISTS profile_picture_url text;