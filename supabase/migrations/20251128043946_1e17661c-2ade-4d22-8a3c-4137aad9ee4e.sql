-- Remover constraint obsoleta de post_type em periodic_posts
-- O campo post_type agora armazena 'specific' ou 'random', não o tipo de mídia
ALTER TABLE public.periodic_posts 
DROP CONSTRAINT IF EXISTS periodic_posts_post_type_check;