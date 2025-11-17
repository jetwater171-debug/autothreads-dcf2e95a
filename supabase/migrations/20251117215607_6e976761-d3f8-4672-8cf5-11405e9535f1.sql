-- Criar tabela de contas do Threads
CREATE TABLE threads_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Criar tabela de frases
CREATE TABLE phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de configurações de posts periódicos
CREATE TABLE periodic_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES threads_accounts(id) ON DELETE CASCADE,
  interval_minutes INTEGER NOT NULL,
  use_random_phrase BOOLEAN DEFAULT true,
  specific_phrase_id UUID REFERENCES phrases(id) ON DELETE SET NULL,
  use_intelligent_delay BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE threads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodic_posts ENABLE ROW LEVEL SECURITY;

-- Políticas para threads_accounts
CREATE POLICY "Users can view their own accounts"
  ON threads_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON threads_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON threads_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON threads_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para phrases
CREATE POLICY "Users can view their own phrases"
  ON phrases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phrases"
  ON phrases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phrases"
  ON phrases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phrases"
  ON phrases FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para periodic_posts
CREATE POLICY "Users can view their own periodic posts"
  ON periodic_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own periodic posts"
  ON periodic_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own periodic posts"
  ON periodic_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own periodic posts"
  ON periodic_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_threads_accounts_updated_at
  BEFORE UPDATE ON threads_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phrases_updated_at
  BEFORE UPDATE ON phrases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periodic_posts_updated_at
  BEFORE UPDATE ON periodic_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();