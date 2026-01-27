-- Update delete_team_and_captain to also remove the captain role from profiles table
-- Logic refined to be case-insensitive and robust against whitespace

CREATE OR REPLACE FUNCTION delete_team_and_captain(target_team_id uuid, target_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_sport_type text;
BEGIN
    -- 1. Get User ID and Sport Type from Player (Before deletion)
    SELECT user_id, sport_type INTO v_user_id, v_sport_type
    FROM players
    WHERE id = target_player_id;

    -- 2. Delete Team Requests (Cascading cleanup)
    DELETE FROM team_requests WHERE team_id = target_team_id;

    -- 3. Delete Team Members (Cascading cleanup)
    DELETE FROM team_members WHERE team_id = target_team_id;

    -- 4. Delete Team
    DELETE FROM teams WHERE id = target_team_id;

    -- 5. Delete Player Profile
    DELETE FROM players WHERE id = target_player_id;

    -- 6. Update User Profile Roles (Remove Captain Badge)
    -- Remove the key v_sport_type from the roles jsonb
    -- Handles lowercase, uppercase, and original case to be safe
    IF v_user_id IS NOT NULL AND v_sport_type IS NOT NULL THEN
        UPDATE profiles
        SET roles = roles 
            - v_sport_type 
            - lower(v_sport_type) 
            - upper(v_sport_type)
        WHERE id = v_user_id;
    END IF;
END;
$$;
