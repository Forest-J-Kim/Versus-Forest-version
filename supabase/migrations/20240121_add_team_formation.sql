-- Add formation column to teams table for storing position data
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS formation JSONB DEFAULT '{}'::jsonb;

-- Optional: Add comment
COMMENT ON COLUMN public.teams.formation IS 'JSONB object storing formation data e.g. { "slot1": "userId" }';
