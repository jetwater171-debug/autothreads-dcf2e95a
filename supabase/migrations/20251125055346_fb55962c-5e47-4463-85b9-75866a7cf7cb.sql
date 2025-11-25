-- Drop old warming pipeline tables
DROP TABLE IF EXISTS warming_pipeline_executions CASCADE;
DROP TABLE IF EXISTS warming_pipeline_posts CASCADE;
DROP TABLE IF EXISTS warming_pipeline_days CASCADE;
DROP TABLE IF EXISTS warming_pipeline_accounts CASCADE;
DROP TABLE IF EXISTS warming_pipelines CASCADE;

-- Create new warmup_sequences table (template)
CREATE TABLE warmup_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  total_days int NOT NULL CHECK (total_days BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warmup_sequences_user_id_idx ON warmup_sequences(user_id);

-- Enable RLS on warmup_sequences
ALTER TABLE warmup_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own warmup sequences"
  ON warmup_sequences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warmup sequences"
  ON warmup_sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warmup sequences"
  ON warmup_sequences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warmup sequences"
  ON warmup_sequences FOR DELETE
  USING (auth.uid() = user_id);

-- Create warmup_days table
CREATE TABLE warmup_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES warmup_sequences(id) ON DELETE CASCADE,
  day_index int NOT NULL CHECK (day_index >= 1),
  is_rest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX warmup_days_sequence_day_idx
  ON warmup_days(sequence_id, day_index);

-- Enable RLS on warmup_days
ALTER TABLE warmup_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view days of their warmup sequences"
  ON warmup_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_days.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert days in their warmup sequences"
  ON warmup_days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_days.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can update days of their warmup sequences"
  ON warmup_days FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_days.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete days of their warmup sequences"
  ON warmup_days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_days.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Create warmup_day_posts table
CREATE TABLE warmup_day_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES warmup_days(id) ON DELETE CASCADE,
  order_index int NOT NULL CHECK (order_index >= 1),
  time_of_day time NOT NULL,
  intelligent_delay boolean NOT NULL DEFAULT false,
  content_type text NOT NULL CHECK (content_type IN ('text', 'image', 'text_image', 'carousel')),
  use_random_phrase boolean NOT NULL DEFAULT false,
  specific_phrase_id uuid REFERENCES phrases(id),
  random_phrase_folder_id uuid REFERENCES content_folders(id),
  use_random_image boolean NOT NULL DEFAULT false,
  specific_image_id uuid REFERENCES images(id),
  random_image_folder_id uuid REFERENCES content_folders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warmup_day_posts_day_id_idx ON warmup_day_posts(day_id);

-- Enable RLS on warmup_day_posts
ALTER TABLE warmup_day_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts of their warmup days"
  ON warmup_day_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_days
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_days.id = warmup_day_posts.day_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert posts in their warmup days"
  ON warmup_day_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM warmup_days
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_days.id = warmup_day_posts.day_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can update posts of their warmup days"
  ON warmup_day_posts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM warmup_days
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_days.id = warmup_day_posts.day_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete posts of their warmup days"
  ON warmup_day_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM warmup_days
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_days.id = warmup_day_posts.day_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Create warmup_day_post_carousel_images table
CREATE TABLE warmup_day_post_carousel_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_post_id uuid NOT NULL REFERENCES warmup_day_posts(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES images(id),
  position int NOT NULL CHECK (position >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX warmup_day_post_carousel_unique
  ON warmup_day_post_carousel_images(day_post_id, position);

-- Enable RLS on warmup_day_post_carousel_images
ALTER TABLE warmup_day_post_carousel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view carousel images of their warmup posts"
  ON warmup_day_post_carousel_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_day_posts
    JOIN warmup_days ON warmup_days.id = warmup_day_posts.day_id
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_day_posts.id = warmup_day_post_carousel_images.day_post_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert carousel images in their warmup posts"
  ON warmup_day_post_carousel_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM warmup_day_posts
    JOIN warmup_days ON warmup_days.id = warmup_day_posts.day_id
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_day_posts.id = warmup_day_post_carousel_images.day_post_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can update carousel images of their warmup posts"
  ON warmup_day_post_carousel_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM warmup_day_posts
    JOIN warmup_days ON warmup_days.id = warmup_day_posts.day_id
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_day_posts.id = warmup_day_post_carousel_images.day_post_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete carousel images of their warmup posts"
  ON warmup_day_post_carousel_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM warmup_day_posts
    JOIN warmup_days ON warmup_days.id = warmup_day_posts.day_id
    JOIN warmup_sequences ON warmup_sequences.id = warmup_days.sequence_id
    WHERE warmup_day_posts.id = warmup_day_post_carousel_images.day_post_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Create warmup_runs table (execution per account)
CREATE TABLE warmup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES warmup_sequences(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES threads_accounts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('scheduled', 'running', 'completed', 'cancelled')) DEFAULT 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  current_day_index int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warmup_runs_account_id_idx ON warmup_runs(account_id);
CREATE INDEX warmup_runs_status_idx ON warmup_runs(status);

-- Enable RLS on warmup_runs
ALTER TABLE warmup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view runs of their warmup sequences"
  ON warmup_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_runs.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert runs in their warmup sequences"
  ON warmup_runs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_runs.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can update runs of their warmup sequences"
  ON warmup_runs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_runs.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete runs of their warmup sequences"
  ON warmup_runs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM warmup_sequences
    WHERE warmup_sequences.id = warmup_runs.sequence_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Create warmup_scheduled_posts table (queue)
CREATE TABLE warmup_scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES warmup_runs(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES warmup_days(id) ON DELETE CASCADE,
  day_post_id uuid NOT NULL REFERENCES warmup_day_posts(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  executed_at timestamptz,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')) DEFAULT 'pending',
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warmup_scheduled_posts_run_status_time_idx
  ON warmup_scheduled_posts(run_id, status, scheduled_at);

-- Enable RLS on warmup_scheduled_posts
ALTER TABLE warmup_scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled posts of their runs"
  ON warmup_scheduled_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_runs
    JOIN warmup_sequences ON warmup_sequences.id = warmup_runs.sequence_id
    WHERE warmup_runs.id = warmup_scheduled_posts.run_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Create warmup_paused_automations table
CREATE TABLE warmup_paused_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES warmup_runs(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES threads_accounts(id) ON DELETE CASCADE,
  automation_type text NOT NULL CHECK (automation_type IN ('periodic_post', 'campaign')),
  automation_id uuid NOT NULL,
  previous_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warmup_paused_automations_run_idx ON warmup_paused_automations(run_id);

-- Enable RLS on warmup_paused_automations
ALTER TABLE warmup_paused_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view paused automations of their runs"
  ON warmup_paused_automations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM warmup_runs
    JOIN warmup_sequences ON warmup_sequences.id = warmup_runs.sequence_id
    WHERE warmup_runs.id = warmup_paused_automations.run_id
    AND warmup_sequences.user_id = auth.uid()
  ));

-- Alter threads_accounts table
ALTER TABLE threads_accounts
ADD COLUMN IF NOT EXISTS warmup_status text NOT NULL DEFAULT 'not_warmed'
  CHECK (warmup_status IN ('not_warmed', 'warming', 'warmed'));

ALTER TABLE threads_accounts
ADD COLUMN IF NOT EXISTS active_warmup_run_id uuid NULL REFERENCES warmup_runs(id);

-- Add optional warmup_run_id to post_history
ALTER TABLE post_history
ADD COLUMN IF NOT EXISTS warmup_run_id uuid REFERENCES warmup_runs(id);

-- Create trigger for updated_at on warmup_sequences
CREATE TRIGGER update_warmup_sequences_updated_at
BEFORE UPDATE ON warmup_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on warmup_runs
CREATE TRIGGER update_warmup_runs_updated_at
BEFORE UPDATE ON warmup_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on warmup_scheduled_posts
CREATE TRIGGER update_warmup_scheduled_posts_updated_at
BEFORE UPDATE ON warmup_scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();