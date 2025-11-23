-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add campaign_id to periodic_posts
ALTER TABLE public.periodic_posts 
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates on campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();