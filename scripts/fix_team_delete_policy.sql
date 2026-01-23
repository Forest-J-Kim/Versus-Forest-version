-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists (to start fresh)
DROP POLICY IF EXISTS "Captains can delete their own team" ON teams;

-- Create Policy: Captains can delete their own team
-- This connects the 'captain_id' column to the authenticated user's ID
CREATE POLICY "Captains can delete their own team"
ON teams
FOR DELETE
USING (auth.uid() = captain_id);

-- Verify: You might also need UPDATE policy to set captain_id to NULL
DROP POLICY IF EXISTS "Captains can update their own team" ON teams;

CREATE POLICY "Captains can update their own team"
ON teams
FOR UPDATE
USING (auth.uid() = captain_id);
