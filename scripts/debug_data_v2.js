
const { createClient } = require('@supabase/supabase-js');

// Load env vars manually for script locally
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://drafjxny...'; // User provided this previously? Wait, I need to read .env.local usually.
// I'll try to read .env.local first in the script or assume user set it.
// Actually, I can read it from the file system.

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
} catch (e) {
    console.error("Could not read .env.local", e);
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Debugging User & Team Data ---");

    // 1. Find User by Name or just list all to find '강펀치'
    console.log("Searching for user '강펀치'...");
    // Try explicit name match first
    let { data: users, error: userError } = await supabase
        .from('User')
        .select('*')
        .ilike('name', '%강펀치%'); // Flexible search

    if (userError) {
        console.error("Error searching user:", userError);
    } else {
        if (users.length === 0) {
            console.log("User '강펀치' not found. Listing all users (limit 5)...");
            const { data: allUsers } = await supabase.from('User').select('*').limit(5);
            console.log("Sample Users:", allUsers);
        } else {
            console.log("Found User(s):", users);
            // Check 'weightClass' specifically
            users.forEach(u => {
                console.log(`User: ${u.name}, ID: ${u.id}, Weight: ${u.weightClass}, Position: ${u.position}`);
            });
        }
    }

    // 2. Find Team '리엔케이 복싱클럽'
    console.log("\nSearching for team '리엔케이 복싱클럽'...");
    let { data: teams, error: teamError } = await supabase
        .from('Team')
        .select('*')
        .ilike('name', '%리엔케이%');

    if (teamError) {
        console.error("Error searching team:", teamError);
    } else {
        console.log("Found Team(s):", teams);
        if (teams.length > 0) {
            const team = teams[0];
            console.log(`Team Leader ID: ${team.leaderId}`);

            // 3. Check TeamMembers
            const { data: members, error: memberError } = await supabase
                .from('TeamMember')
                .select('*, user:User(*)') // Join to see user details
                .eq('teamId', team.id);

            if (memberError) console.error("Error fetching members:", memberError);
            else {
                console.log(`Team Members (${members.length}):`, members);
                members.forEach(m => {
                    const u = m.user; // fetching via join might return array or object depending on relationship in Supabase (if setup)
                    // Actually Supabase JS join syntax is: select('*, User(*)') 
                    // But let's look at raw data.
                    // NOTE: If FK is not detected by Supabase, join won't work. We might see just userId.
                });
            }
        }
    }
}

main();
