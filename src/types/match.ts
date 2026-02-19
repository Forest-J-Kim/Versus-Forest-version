export interface Match {
    id: string;
    sport_type: string | null;
    match_date: string | null;
    match_location: string | null;
    status: string | null;

    // New Columns (Refactored from attributes)
    match_weight?: number | null;
    match_type?: string | null; // e.g. Sparring Intensity
    rounds?: string | null;
    gear?: string | null;
    description?: string | null;
    tags?: string[] | null;

    // Newly Added Columns
    cost?: number | null;
    uniform_color?: string | null;
    match_gender?: 'MALE' | 'FEMALE' | 'MIXED' | string | null;
    match_mode?: 'HOME' | 'AWAY' | 'NEUTRAL' | string | null; // New field for location logic

    match_format?: string | null;
    has_pitch?: boolean | null;
    team_level?: number | null;

    // Relations
    home_player_id?: string | null;
    home_team_id?: string | null;

    // Joined Data
    home_player?: {
        name: string;
        avatar_url: string | null;
        weight_class: string | null;
        team?: {
            team_name: string;
            location?: string;
        } | null;
    } | null;
    home_team?: {
        team_name: string;
        emblem_url: string | null;
        location?: string;
    } | null;

    // User
    host_user_id?: string | null;
    author_id?: string | null;

    attributes: string | null; // Kept for legacy compatibility if needed
    created_at: string;
    match_applications?: { count: number; applicant_user_id?: string; applicant_player_id?: string; status?: string }[];
}

export interface MatchInsert {
    home_player_id?: string | null;
    home_team_id?: string | null;
    match_date: string;
    match_location: string;
    sport_type: string;
    status: string;
    host_user_id: string;
    type: string;

    match_weight?: number | null;
    match_type?: string | null;
    rounds?: number | null;
    gear?: string | null;
    description?: string | null;
    tags?: string[] | null;

    // New Fields
    cost?: number | null;
    uniform_color?: string | null;
    match_gender?: string | null;
    match_mode?: string | null;

    // [Step 1] New Fields for Match Creation Revamp
    match_format?: string | null;
    has_pitch?: boolean | null;
    team_level?: number | null;
}
