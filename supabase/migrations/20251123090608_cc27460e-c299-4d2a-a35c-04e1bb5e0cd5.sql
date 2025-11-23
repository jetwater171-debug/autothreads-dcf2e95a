-- Add random_phrase_folder_id column to periodic_posts
ALTER TABLE public.periodic_posts 
ADD COLUMN random_phrase_folder_id uuid REFERENCES public.content_folders(id) ON DELETE SET NULL;