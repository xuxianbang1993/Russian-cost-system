import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const CACHE_CONTROL_VALUE = 'private, no-store';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));

  if (!code) {
    return createRedirectResponse(new URL('/login?error=callback', requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return createRedirectResponse(new URL('/login?error=callback', requestUrl.origin));
  }

  return createRedirectResponse(new URL(nextPath, requestUrl.origin));
}

function getSafeNextPath(nextPath: string | null) {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return nextPath;
  }

  return '/calculator';
}

function createRedirectResponse(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', CACHE_CONTROL_VALUE);
  return response;
}
