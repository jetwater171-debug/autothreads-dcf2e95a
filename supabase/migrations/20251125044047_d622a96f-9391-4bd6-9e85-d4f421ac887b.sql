-- Add custom_text column to warming_pipeline_posts table
ALTER TABLE warming_pipeline_posts
ADD COLUMN custom_text TEXT;

COMMENT ON COLUMN warming_pipeline_posts.custom_text IS 'Custom text content written directly for this post';