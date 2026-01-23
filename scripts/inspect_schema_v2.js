
const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = 'https://drafjxnyzkdlmcoiqgul.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check(name) {
    console.log(`CHECKING: ${name}`);
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (error) {
        console.log(`[${name}] ERROR: ${error.message}`);
    } else {
        console.log(`[${name}] FOUND. records: ${data.length}`);
        if (data.length > 0) console.log(`[${name}] KEYS: ${Object.keys(data[0]).join(', ')}`);
    }
    console.log('------------------------------------------------');
}

async function main() {
    await check('players');
    await check('users');
    await check('User');

    await check('teams');
    await check('Team');

    await check('team_members');
    await check('TeamMember');

    await check('matches');
    await check('Match');

    await check('team_requests');
}

main();
