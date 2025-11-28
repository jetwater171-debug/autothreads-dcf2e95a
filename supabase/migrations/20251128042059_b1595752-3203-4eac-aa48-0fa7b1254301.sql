-- Remove old columns from periodic_posts
ALTER TABLE periodic_posts 
  DROP COLUMN IF EXISTS specific_phrase_id,
  DROP COLUMN IF EXISTS random_phrase_folder_id,
  DROP COLUMN IF EXISTS use_random_phrase,
  DROP COLUMN IF EXISTS specific_image_id,
  DROP COLUMN IF EXISTS use_random_image,
  DROP COLUMN IF EXISTS carousel_image_ids;

-- Remove old columns from warmup_day_posts  
ALTER TABLE warmup_day_posts
  DROP COLUMN IF EXISTS use_random_phrase,
  DROP COLUMN IF EXISTS specific_phrase_id,
  DROP COLUMN IF EXISTS random_phrase_folder_id,
  DROP COLUMN IF EXISTS use_random_image,
  DROP COLUMN IF EXISTS specific_image_id,
  DROP COLUMN IF EXISTS random_image_folder_id;

-- Remove carousel images table (not needed anymore)
DROP TABLE IF EXISTS warmup_day_post_carousel_images;

-- Remove phrase_id from post_history (keep image_urls for now as it's just data)
ALTER TABLE post_history DROP COLUMN IF EXISTS phrase_id;

-- Drop the old tables
DROP TABLE IF EXISTS phrases;
DROP TABLE IF EXISTS images;

-- Clean up content_folders to only allow 'post' type
UPDATE content_folders SET type = 'post' WHERE type IN ('phrase', 'image');

-- Update constraint
ALTER TABLE content_folders DROP CONSTRAINT IF EXISTS content_folders_type_check;
ALTER TABLE content_folders ADD CONSTRAINT content_folders_type_check CHECK (type = 'post');