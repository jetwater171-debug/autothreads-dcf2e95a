-- Criar tabela de imagens
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para tabela images
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images"
  ON images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON images FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index para performance
CREATE INDEX idx_images_user_id ON images(user_id);

-- Modificar tabela periodic_posts
ALTER TABLE periodic_posts
ADD COLUMN post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'carousel')),
ADD COLUMN use_random_image BOOLEAN DEFAULT false,
ADD COLUMN specific_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
ADD COLUMN carousel_image_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN periodic_posts.post_type IS 'text = apenas texto | image = 1 imagem + texto opcional | carousel = 2-10 imagens + texto opcional';
COMMENT ON COLUMN periodic_posts.use_random_image IS 'Se true, seleciona imagem aleatória; se false, usa specific_image_id';
COMMENT ON COLUMN periodic_posts.specific_image_id IS 'ID da imagem específica quando use_random_image é false';
COMMENT ON COLUMN periodic_posts.carousel_image_ids IS 'Array de IDs de imagens para posts tipo carousel (máximo 10)';

-- Modificar tabela post_history
ALTER TABLE post_history
ADD COLUMN image_urls TEXT[],
ADD COLUMN post_type TEXT DEFAULT 'text';

COMMENT ON COLUMN post_history.image_urls IS 'URLs das imagens usadas no post';
COMMENT ON COLUMN post_history.post_type IS 'Tipo do post que foi feito';

-- Criar bucket de storage para imagens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies para o bucket
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view all public images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);