-- Add error tracking fields to post_history table
ALTER TABLE public.post_history 
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;