
const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = 'https://drafjxnyzkdlmcoiqgul.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    console.log('--- Checking Supabase Data (Simple) ---');

    // 1. Check Teams (Capitalized per DDL)
    const { data: teams, error: teamError } = await supabase.from('Team').select('*').limit(1);
    if (teamError) {
        console.error('Error fetching "Team":', teamError.message);
    } else {
        console.log('"Team" found:', teams.length);
    }

    // 2. Check User (Capitalized)
    const { data: users, error: userError } = await supabase.from('User').select('*').limit(1);
    if (userError) {
        console.error('Error fetching "User":', userError.message);
    } else {
        if (users.length > 0) {
            console.log('"User" found. Keys:', Object.keys(users[0]));
            console.log('Has weightClass?', Object.keys(users[0]).includes('weightClass'));
        } else {
            console.log('"User" found but empty.');
        }
    }

    // 3. Check TeamMember (Capitalized)
    const { data: members, error: memberError } = await supabase.from('TeamMember').select('*').limit(1);

    if (memberError) {
        console.error('Error fetching "TeamMember":', memberError.message);
    } else {
        console.log('"TeamMember" found:', members.length);
    }
}

main();
