
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) process.env[k] = envConfig[k];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function check() {
    const { data: teams } = await supabase.from('teams').select('captain_id').limit(1);
    const { data: user } = await supabase.auth.getUser(); // Won't work in script without session
    // Just showing logic assumption:
    // If captain_id looks like a user ID (uuid), we need to compare with user.id or player.user_id
    console.log('Sample Team Captain ID:', teams?.[0]?.captain_id);
}

check();
