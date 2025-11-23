-- Create content_folders table
CREATE TABLE public.content_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'phrase')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for content_folders
CREATE POLICY "Users can view their own folders" 
ON public.content_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" 
ON public.content_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.content_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.content_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add folder_id to images table
ALTER TABLE public.images 
ADD COLUMN folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL;

-- Add folder_id to phrases table
ALTER TABLE public.phrases 
ADD COLUMN folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates on content_folders
CREATE TRIGGER update_content_folders_updated_at
BEFORE UPDATE ON public.content_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster folder queries
CREATE INDEX idx_images_folder_id ON public.images(folder_id);
CREATE INDEX idx_phrases_folder_id ON public.phrases(folder_id);
CREATE INDEX idx_content_folders_user_type ON public.content_folders(user_id, type);