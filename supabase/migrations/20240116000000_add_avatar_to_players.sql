-- Add avatar_url column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
