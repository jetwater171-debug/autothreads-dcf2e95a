-- Criar tabela para trackear execução de posts da esteira
CREATE TABLE IF NOT EXISTS public.warming_pipeline_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_account_id UUID NOT NULL REFERENCES public.warming_pipeline_accounts(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.warming_pipeline_posts(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_warming_executions_account ON public.warming_pipeline_executions(pipeline_account_id);
CREATE INDEX idx_warming_executions_post ON public.warming_pipeline_executions(post_id);
CREATE INDEX idx_warming_executions_executed_at ON public.warming_pipeline_executions(executed_at);

-- RLS
ALTER TABLE public.warming_pipeline_executions ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver execuções das suas próprias esteiras
CREATE POLICY "Users can view their own pipeline executions"
  ON public.warming_pipeline_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.warming_pipeline_accounts wpa
      JOIN public.warming_pipelines wp ON wpa.pipeline_id = wp.id
      WHERE wpa.id = warming_pipeline_executions.pipeline_account_id
      AND wp.user_id = auth.uid()
    )
  );

-- Índices adicionais para otimização das queries do dialog
CREATE INDEX IF NOT EXISTS idx_warming_pipeline_accounts_pipeline_status 
  ON public.warming_pipeline_accounts(pipeline_id, status);

CREATE INDEX IF NOT EXISTS idx_warming_pipeline_accounts_account_status 
  ON public.warming_pipeline_accounts(account_id, status);

CREATE INDEX IF NOT EXISTS idx_warming_pipeline_days_pipeline 
  ON public.warming_pipeline_days(pipeline_id, day_number);

CREATE INDEX IF NOT EXISTS idx_warming_pipeline_posts_day 
  ON public.warming_pipeline_posts(day_id, post_order);