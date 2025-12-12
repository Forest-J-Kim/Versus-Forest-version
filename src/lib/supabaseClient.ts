
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zffbavegoppyhgdgtcxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZmJhdmVnb3BweWhnZGd0Y3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODMzODYsImV4cCI6MjA4MTA1OTM4Nn0.zkUxiu0HOtsREns-ObieU3G1xNy-r4JllHCYST4RC54';

export const supabase = createClient(supabaseUrl, supabaseKey);
