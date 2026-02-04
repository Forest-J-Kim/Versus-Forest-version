import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient<T = Database>() {
    return createBrowserClient<T>(
        'https://drafjxnyzkdlmcoiqgul.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs'
    )
}
