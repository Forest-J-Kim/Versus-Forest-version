
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://drafjxnyzkdlmcoiqgul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking players table...");
    const { data, error } = await supabase.from('players').select('avatar_url').limit(1);
    if (error) {
        console.log("Error selecting avatar_url:", error.message);
    } else {
        console.log("avatar_url exists!");
    }
}

check();
