
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            players: {
                Row: {
                    id: string
                    email: string
                    name: string
                    position: string | null
                    tier: string | null
                    region: string | null
                    weight_class: string | null
                    created_at: string
                    // Add other inferred cols if any
                }
                Insert: {
                    id?: string
                    email: string
                    name: string
                    position?: string | null
                    tier?: string | null
                    region?: string | null
                    weight_class?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    position?: string | null
                    tier?: string | null
                    region?: string | null
                    weight_class?: string | null
                    created_at?: string
                }
            }
            teams: {
                Row: {
                    id: string
                    team_name: string
                    name: string | null // Keeping for compatibility if needed, or deprecate
                    emblem_url: string | null
                    emblem: string | null // Keeping for compatibility
                    region: string | null
                    home_stadium: boolean
                    avg_age: number | null
                    tier: string | null
                    uniform_color: string | null
                    manner_score: number
                    created_at: string
                    captain_id: string
                    sport_type: string
                    description: string | null
                }
                Insert: {
                    id?: string
                    team_name: string
                    name?: string | null
                    emblem_url?: string | null
                    emblem?: string | null
                    region?: string | null
                    home_stadium?: boolean
                    avg_age?: number | null
                    tier?: string | null
                    uniform_color?: string | null
                    manner_score?: number
                    created_at?: string
                    captain_id: string
                    sport_type: string
                    description?: string | null
                }
                Update: {
                    id?: string
                    team_name?: string
                    name?: string | null
                    emblem_url?: string | null
                    emblem?: string | null
                    region?: string | null
                    home_stadium?: boolean
                    avg_age?: number | null
                    tier?: string | null
                    uniform_color?: string | null
                    manner_score?: number
                    created_at?: string
                    captain_id?: string
                    sport_type?: string
                    description?: string | null
                }
            }
            team_members: {
                Row: {
                    id: string
                    player_id: string
                    user_id: string | null // Keeping incase, but assume player_id is primary
                    team_id: string
                    role: string
                    joined_at: string
                }
                Insert: {
                    id?: string
                    player_id: string
                    user_id?: string | null
                    team_id: string
                    role?: string
                    joined_at?: string
                }
                Update: {
                    id?: string
                    player_id?: string
                    user_id?: string | null
                    team_id?: string
                    role?: string
                    joined_at?: string
                }
            }
            matches: {
                Row: {
                    id: string
                    type: string
                    mode: string
                    sport: string
                    attributes: string
                    status: string
                    date: string | null
                    location: string | null
                    description: string | null
                    player_id: string | null
                    host_user_id: string | null
                    guest_user_id: string | null
                    host_team_id: string | null
                    guest_team_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    type: string
                    mode?: string
                    sport?: string
                    attributes?: string
                    status?: string
                    date?: string | null
                    location?: string | null
                    description?: string | null
                    player_id?: string | null
                    host_user_id?: string | null
                    guest_user_id?: string | null
                    host_team_id?: string | null
                    guest_team_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    type?: string
                    mode?: string
                    sport?: string
                    attributes?: string
                    status?: string
                    date?: string | null
                    location?: string | null
                    description?: string | null
                    player_id?: string | null
                    host_user_id?: string | null
                    guest_user_id?: string | null
                    host_team_id?: string | null
                    guest_team_id?: string | null
                    created_at?: string
                }
            }
            team_requests: {
                Row: {
                    id: string
                    status: string
                    created_at: string
                    updated_at: string
                    team_id: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                    team_id: string
                    user_id: string
                }
                Update: {
                    id?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                    team_id?: string
                    user_id?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    nickname: string | null
                    roles: Json | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    nickname?: string | null
                    roles?: Json | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    nickname?: string | null
                    roles?: Json | null
                }
            }
        }
    }
}
