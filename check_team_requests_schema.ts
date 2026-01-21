
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually since we are running with ts-node
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking team_requests schema...');
    const { data, error } = await supabase
        .from('team_requests')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching team_requests:', error);
    } else {
        console.log('team_requests data sample:', data);
        if (data && data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        } else {
            console.log('No data found, but table likely exists.');
        }
    }
}

checkSchema();
