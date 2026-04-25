import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const CACHE_CONTROL_VALUE = 'private, no-store';
const VALID_EMAIL_OTP_TYPES = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
] as const;

type EmailOtpCallbackType = (typeof VALID_EMAIL_OTP_TYPES)[number];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));

  if (tokenHash) {
    if (!isValidEmailOtpType(type)) {
      return createRedirectResponse(new URL('/login?error=callback', requestUrl.origin));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return createRedirectResponse(new URL('/login?error=callback', requestUrl.origin));
    }

    return createRedirectResponse(new URL(nextPath, requestUrl.origin));
  }

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

function isValidEmailOtpType(type: string | null): type is EmailOtpCallbackType {
  return VALID_EMAIL_OTP_TYPES.some((validType) => validType === type);
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
