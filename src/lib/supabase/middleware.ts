import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type ProfileRole = 'admin' | 'user' | null;

const CACHE_CONTROL_VALUE = 'private, no-store';

export function isAuthBypassPath(pathname: string) {
  return pathname === '/login'
    || pathname === '/register'
    || pathname.startsWith('/auth/callback');
}

export function shouldRedirectToLogin(pathname: string, hasUser: boolean) {
  return !hasUser && !isAuthBypassPath(pathname) && pathname !== '/';
}

export function shouldRedirectNonAdmin(pathname: string, role: ProfileRole) {
  return pathname.startsWith('/admin') && role !== 'admin';
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = applyNoStoreHeaders(NextResponse.next({ request }));
  const { anonKey, url } = getSupabaseMiddlewareConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = applyNoStoreHeaders(NextResponse.next({ request }));
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (shouldRedirectToLogin(pathname, Boolean(user))) {
    return redirectWithNoStore(request, '/login');
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (shouldRedirectNonAdmin(pathname, profile?.role ?? null)) {
      return redirectWithNoStore(request, '/calculator');
    }
  }

  return supabaseResponse;
}

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', CACHE_CONTROL_VALUE);
  return response;
}

function redirectWithNoStore(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return applyNoStoreHeaders(NextResponse.redirect(url));
}

function getSupabaseMiddlewareConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase middleware environment variables.');
  }

  return { url, anonKey };
}
