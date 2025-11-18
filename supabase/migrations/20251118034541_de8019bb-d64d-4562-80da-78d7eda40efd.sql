-- Create table to store account insights history
CREATE TABLE IF NOT EXISTS account_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES threads_accounts(id) ON DELETE CASCADE,
  followers_count INTEGER,
  views INTEGER,
  likes INTEGER,
  replies INTEGER,
  reposts INTEGER,
  quotes INTEGER,
  shares INTEGER,
  engaged_audience INTEGER,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE account_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own account insights"
ON account_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account insights"
ON account_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_account_insights_account_id ON account_insights(account_id);
CREATE INDEX idx_account_insights_collected_at ON account_insights(collected_at DESC);