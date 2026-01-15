
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        'https://drafjxnyzkdlmcoiqgul.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWZqeG55emtkbG1jb2lxZ3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ1NzAsImV4cCI6MjA4NDAzMDU3MH0.C0TCQUg0nOxxyOWdz5PUtP8NQOFN0nadwJWcgjm1sGs',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protected Routes Logic
    // Added '/' to protected routes so unauthenticated users go to /welcome
    const protectedRoutes = ['/match/write', '/profile', '/chat']
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route)) || pathname === '/';

    if (isProtected && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/welcome'
        return NextResponse.redirect(url)
    }

    // Auth Pages Logic (Redirect to Home if already logged in)
    const authRoutes = ['/login', '/signup', '/welcome']
    const isAuthPage = authRoutes.some(route => pathname.startsWith(route))

    if (isAuthPage && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
