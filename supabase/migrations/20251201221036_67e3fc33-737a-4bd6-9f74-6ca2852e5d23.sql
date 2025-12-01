-- Criar tabela user_settings para armazenar credenciais Meta de cada usuário
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threads_app_id TEXT,
  threads_app_secret TEXT,
  is_meta_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_settings
CREATE POLICY "Users can view own settings" 
  ON public.user_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
  ON public.user_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
  ON public.user_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();