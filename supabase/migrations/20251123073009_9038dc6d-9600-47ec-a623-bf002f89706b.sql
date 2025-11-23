-- Adicionar campos para controle de expiração do token
ALTER TABLE threads_accounts
ADD COLUMN token_expires_at TIMESTAMPTZ,
ADD COLUMN token_refreshed_at TIMESTAMPTZ;

-- Comentários explicativos
COMMENT ON COLUMN threads_accounts.token_expires_at IS 'Data de expiração do token (60 dias após criação/renovação)';
COMMENT ON COLUMN threads_accounts.token_refreshed_at IS 'Data da última renovação do token';