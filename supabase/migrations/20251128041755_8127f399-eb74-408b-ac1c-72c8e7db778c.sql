-- Add post_id to warmup_day_posts
ALTER TABLE warmup_day_posts ADD COLUMN post_id UUID REFERENCES posts(id);

-- Add post_id to periodic_posts  
ALTER TABLE periodic_posts ADD COLUMN post_id UUID REFERENCES posts(id);

-- Create index for better performance
CREATE INDEX idx_warmup_day_posts_post_id ON warmup_day_posts(post_id);
CREATE INDEX idx_periodic_posts_post_id ON periodic_posts(post_id);