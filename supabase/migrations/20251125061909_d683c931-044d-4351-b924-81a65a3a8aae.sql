-- Add custom_text column to warmup_day_posts
ALTER TABLE public.warmup_day_posts
ADD COLUMN custom_text TEXT;