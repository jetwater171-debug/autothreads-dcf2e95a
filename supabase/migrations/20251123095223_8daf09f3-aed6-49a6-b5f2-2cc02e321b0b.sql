-- Add content hash and duplicate tracking to post_history
ALTER TABLE public.post_history 
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS duplicate_skipped BOOLEAN DEFAULT FALSE;

-- Create index for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_post_history_hash_time 
ON public.post_history(content_hash, posted_at) 
WHERE content_hash IS NOT NULL;