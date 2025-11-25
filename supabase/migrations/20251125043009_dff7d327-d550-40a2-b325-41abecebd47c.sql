-- Tabela principal de esteiras de aquecimento
CREATE TABLE public.warming_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  total_days INTEGER NOT NULL CHECK (total_days >= 1 AND total_days <= 10),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dias da esteira
CREATE TABLE public.warming_pipeline_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.warming_pipelines(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  posts_count INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0 AND posts_count <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, day_number)
);

-- Tabela de posts por dia
CREATE TABLE public.warming_pipeline_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES public.warming_pipeline_days(id) ON DELETE CASCADE,
  post_order INTEGER NOT NULL CHECK (post_order >= 1),
  scheduled_time TIME NOT NULL,
  use_intelligent_delay BOOLEAN NOT NULL DEFAULT false,
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'image', 'text_image', 'carousel')),
  text_mode TEXT CHECK (text_mode IN ('specific', 'random', 'random_folder')),
  specific_phrase_id UUID REFERENCES public.phrases(id) ON DELETE SET NULL,
  random_phrase_folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL,
  image_mode TEXT CHECK (image_mode IN ('specific', 'random', 'random_folder')),
  specific_image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
  random_image_folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL,
  carousel_image_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(day_id, post_order)
);

-- Tabela de contas vinculadas às esteiras
CREATE TABLE public.warming_pipeline_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.warming_pipelines(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.threads_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'warming' CHECK (status IN ('warming', 'completed', 'stopped')),
  current_day INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_automations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, account_id)
);

-- Enable RLS
ALTER TABLE public.warming_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warming_pipeline_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warming_pipeline_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warming_pipeline_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies para warming_pipelines
CREATE POLICY "Users can view their own warming pipelines"
  ON public.warming_pipelines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warming pipelines"
  ON public.warming_pipelines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warming pipelines"
  ON public.warming_pipelines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warming pipelines"
  ON public.warming_pipelines FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para warming_pipeline_days
CREATE POLICY "Users can view days of their pipelines"
  ON public.warming_pipeline_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_days.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert days in their pipelines"
  ON public.warming_pipeline_days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_days.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can update days of their pipelines"
  ON public.warming_pipeline_days FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_days.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete days of their pipelines"
  ON public.warming_pipeline_days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_days.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

-- RLS Policies para warming_pipeline_posts
CREATE POLICY "Users can view posts of their pipeline days"
  ON public.warming_pipeline_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipeline_days
    JOIN public.warming_pipelines ON warming_pipelines.id = warming_pipeline_days.pipeline_id
    WHERE warming_pipeline_days.id = warming_pipeline_posts.day_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert posts in their pipeline days"
  ON public.warming_pipeline_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.warming_pipeline_days
    JOIN public.warming_pipelines ON warming_pipelines.id = warming_pipeline_days.pipeline_id
    WHERE warming_pipeline_days.id = warming_pipeline_posts.day_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can update posts of their pipeline days"
  ON public.warming_pipeline_posts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipeline_days
    JOIN public.warming_pipelines ON warming_pipelines.id = warming_pipeline_days.pipeline_id
    WHERE warming_pipeline_days.id = warming_pipeline_posts.day_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete posts of their pipeline days"
  ON public.warming_pipeline_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipeline_days
    JOIN public.warming_pipelines ON warming_pipelines.id = warming_pipeline_days.pipeline_id
    WHERE warming_pipeline_days.id = warming_pipeline_posts.day_id
    AND warming_pipelines.user_id = auth.uid()
  ));

-- RLS Policies para warming_pipeline_accounts
CREATE POLICY "Users can view accounts of their pipelines"
  ON public.warming_pipeline_accounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_accounts.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert accounts in their pipelines"
  ON public.warming_pipeline_accounts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_accounts.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can update accounts of their pipelines"
  ON public.warming_pipeline_accounts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_accounts.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete accounts of their pipelines"
  ON public.warming_pipeline_accounts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.warming_pipelines
    WHERE warming_pipelines.id = warming_pipeline_accounts.pipeline_id
    AND warming_pipelines.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_warming_pipelines_updated_at
  BEFORE UPDATE ON public.warming_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warming_pipeline_accounts_updated_at
  BEFORE UPDATE ON public.warming_pipeline_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();