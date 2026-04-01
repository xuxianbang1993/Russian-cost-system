import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from '@/lib/schemas/auth';
import {
  isAuthBypassPath,
  shouldRedirectNonAdmin,
  shouldRedirectToLogin,
} from '@/lib/supabase/middleware';

describe('auth schemas', () => {
  it('accepts valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: '123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register input when passwords do not match', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'secret2',
      displayName: 'Cost Analyst',
    });

    expect(result.success).toBe(false);
  });

  it('accepts register input with an omitted display name', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    });

    expect(result.success).toBe(true);
  });
});

describe('auth route protection', () => {
  it('bypasses auth redirects for auth entry points and callbacks', () => {
    expect(isAuthBypassPath('/login')).toBe(true);
    expect(isAuthBypassPath('/register')).toBe(true);
    expect(isAuthBypassPath('/auth/callback')).toBe(true);
  });

  it('redirects unauthenticated users away from protected routes', () => {
    expect(shouldRedirectToLogin('/calculator', false)).toBe(true);
    expect(shouldRedirectToLogin('/admin/users', false)).toBe(true);
    expect(shouldRedirectToLogin('/login', false)).toBe(false);
  });

  it('redirects non-admin users away from admin routes', () => {
    expect(shouldRedirectNonAdmin('/admin/users', 'user')).toBe(true);
    expect(shouldRedirectNonAdmin('/admin/users', 'admin')).toBe(false);
    expect(shouldRedirectNonAdmin('/calculator', 'user')).toBe(false);
  });
});
