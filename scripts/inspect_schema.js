
const { createClient } = require('@supabase/supabase-js');

// Using creds from previous scripts
const NEXT_PUBLIC_SUPABASE_URL = 'https://drafjxnyzkdlmcoiqgul.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTable(tableName) {
    console.log(`\n--- Checking table: ${tableName} ---`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.log(`Error or Table not found (${tableName}):`, error.message);
        return null;
    }

    if (data && data.length > 0) {
        console.log(`Success! Columns for ${tableName}:`, Object.keys(data[0]));
        return Object.keys(data[0]);
    } else {
        console.log(`Table ${tableName} exists but is empty. Cannot determine columns.`);
        return [];
    }
}

async function main() {
    // Check possible table names (lower/snake vs Pascal)
    await checkTable('players');
    await checkTable('User');

    await checkTable('teams');
    await checkTable('Team');

    await checkTable('team_members');
    await checkTable('TeamMember');

    await checkTable('matches');
    await checkTable('Match');

    await checkTable('team_requests');
}

main();
