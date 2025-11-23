-- Add title column to periodic_posts table
ALTER TABLE public.periodic_posts 
ADD COLUMN title TEXT NOT NULL DEFAULT 'Automação sem título';