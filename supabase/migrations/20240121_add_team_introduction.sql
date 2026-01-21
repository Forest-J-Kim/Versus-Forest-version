-- Add introduction column to teams table for detailed team description
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS introduction TEXT;

-- Optional: Add comment
COMMENT ON COLUMN public.teams.introduction IS 'Detailed introduction of the team, editable by captain';
