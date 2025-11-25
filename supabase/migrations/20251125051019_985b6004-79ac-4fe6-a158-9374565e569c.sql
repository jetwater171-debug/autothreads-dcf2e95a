-- Atualizar constraint de text_mode para incluir 'custom'
ALTER TABLE public.warming_pipeline_posts 
DROP CONSTRAINT IF EXISTS warming_pipeline_posts_text_mode_check;

ALTER TABLE public.warming_pipeline_posts 
ADD CONSTRAINT warming_pipeline_posts_text_mode_check 
CHECK (text_mode IN ('custom', 'specific', 'random', 'random_folder'));