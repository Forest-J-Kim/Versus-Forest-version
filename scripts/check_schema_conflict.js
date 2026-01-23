
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let envConfig = {};
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envConfig[key.trim()] = val.trim();
    });
} catch (e) { console.log("No .env.local"); }

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking 'teams' table...");
    const { data: teams, error: teamsError } = await supabase.from('teams').select('*').limit(1);
    if (teamsError) console.log("Error 'teams':", teamsError.message);
    else console.log("Found 'teams':", teams.length > 0 ? Object.keys(teams[0]) : "Empty table");

    console.log("Checking 'players' table...");
    const { data: players, error: playersError } = await supabase.from('players').select('*').limit(1);
    if (playersError) console.log("Error 'players':", playersError.message);
    else console.log("Found 'players':", players.length > 0 ? Object.keys(players[0]) : "Empty table");

    // Check capitalization just in case
    console.log("Checking 'Team' table...");
    const { data: Team, error: TeamError } = await supabase.from('Team').select('*').limit(1);
    if (TeamError) console.log("Error 'Team':", TeamError.message);
    else console.log("Found 'Team':", Team.length > 0 ? Object.keys(Team[0]) : "Empty table");
}

check();
