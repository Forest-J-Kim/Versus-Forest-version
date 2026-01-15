'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Login successful
    // We do NOT redirect here because we want the client to handle the cleanup/refresh
    // or we can redirect to '/' directly.
    // The user requested window.location.href in client, but redirect('/') here works too.
    // However, returning success allows the client to show "Welcome" alert.
    return { success: true }
}

export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    // Use SSR client for signup too to ensure consistent config
    const supabase = await createClient()

    try {
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    nickname: name, // Added nickname metadata
                },
            },
        })

        if (authError) {
            return { error: authError.message }
        }

        if (authData.user) {
            // 2. Insert Profile
            const { error: profileError } = await supabase.from('profiles').insert([
                {
                    id: authData.user.id,
                    email,
                    username: name,
                    nickname: name, // explicit insert if column exists
                    full_name: name,
                },
            ])

            if (profileError) console.error('Profile Error', profileError)
        } else {
            return { error: 'Signup failed' }
        }
    } catch (err: any) {
        return { error: err.message }
    }

    // Redirect on success
    redirect('/login')
}
