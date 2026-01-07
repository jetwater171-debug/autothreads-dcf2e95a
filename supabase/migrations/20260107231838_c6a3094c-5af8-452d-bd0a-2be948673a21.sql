-- Adicionar coluna is_spoiler na tabela posts
ALTER TABLE public.posts 
ADD COLUMN is_spoiler BOOLEAN DEFAULT false;