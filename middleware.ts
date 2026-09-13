import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Domain-Aware Routing
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0].toLowerCase()
  const wvDomain = process.env.WV_APP_DOMAIN?.trim().toLowerCase() || ''
  const isWvDomain = Boolean(
    wvDomain && (hostname === wvDomain || hostname.endsWith(`.${wvDomain}`))
  )

  // 1. Handling requests from the dedicated Waynex Vault custom domain
  if (isWvDomain) {
    // Root route on WV domain maps directly to Vault
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/vault' : '/vault/login'
      return NextResponse.rewrite(url)
    }

    // Generic login route on WV domain rewrites to Vault login
    if (pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/vault' : '/vault/login'
      return user ? NextResponse.redirect(url) : NextResponse.rewrite(url)
    }

    // If authenticated user visits /vault/login on WV domain, redirect to /vault
    if (pathname === '/vault/login' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/vault'
      return NextResponse.redirect(url)
    }

    // Allow auth callbacks and static assets
    if (pathname.startsWith('/auth') || pathname.startsWith('/_next')) {
      return supabaseResponse
    }

    // Protect all vault routes on WV domain
    if (pathname.startsWith('/vault')) {
      if (!user && pathname !== '/vault/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/vault/login'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Isolate WV domain: Prevent exposure of portfolio CMS and public portfolio pages on WV domain
    const url = request.nextUrl.clone()
    url.pathname = user ? '/vault' : '/vault/login'
    return NextResponse.redirect(url)
  }

  // 2. Handling requests from Portfolio domain (or development/localhost)

  // Allow auth callbacks through without interference
  if (pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // Waynex Vault Login route protection
  if (pathname === '/vault/login') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/vault'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Waynex Vault application routes protection
  if (pathname.startsWith('/vault')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/vault/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Portfolio Admin routes protection
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Portfolio Admin login route: redirect authenticated users to /admin
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
