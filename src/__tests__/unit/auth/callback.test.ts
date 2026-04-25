import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/auth/callback/route';

const { mockCreateClient, mockVerifyOtp, mockExchangeCodeForSession } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockVerifyOtp: vi.fn(),
  mockExchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

const origin = 'https://example.com';

function createCallbackRequest(searchParams: string) {
  return new Request(`${origin}/auth/callback${searchParams}`);
}

function mockSupabaseClient() {
  mockCreateClient.mockResolvedValueOnce({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  });
}

function expectRedirect(response: Response, path: string) {
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe(`${origin}${path}`);
}

function expectNoStore(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
}

describe('auth callback route', () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockVerifyOtp.mockReset();
    mockExchangeCodeForSession.mockReset();
  });

  it('verifies signup token_hash callbacks and redirects to the default app path', async () => {
    mockSupabaseClient();
    mockVerifyOtp.mockResolvedValueOnce({ error: null });

    const response = await GET(createCallbackRequest('?token_hash=token-1&type=signup'));

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'token-1', type: 'signup' });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expectRedirect(response, '/calculator');
    expectNoStore(response);
  });

  it('verifies recovery token_hash callbacks and redirects to a safe next path', async () => {
    mockSupabaseClient();
    mockVerifyOtp.mockResolvedValueOnce({ error: null });

    const response = await GET(
      createCallbackRequest('?token_hash=token-2&type=recovery&next=/reset-password')
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'token-2', type: 'recovery' });
    expectRedirect(response, '/reset-password');
    expectNoStore(response);
  });

  it('verifies email token_hash callbacks and redirects to a safe next path', async () => {
    mockSupabaseClient();
    mockVerifyOtp.mockResolvedValueOnce({ error: null });

    const response = await GET(
      createCallbackRequest('?token_hash=token-3&type=email&next=/calculator/products')
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'token-3', type: 'email' });
    expectRedirect(response, '/calculator/products');
    expectNoStore(response);
  });

  it('rejects token_hash callbacks without a type', async () => {
    const response = await GET(createCallbackRequest('?token_hash=token-4'));

    expect(mockCreateClient).not.toHaveBeenCalled();
    expectRedirect(response, '/login?error=callback');
  });

  it('rejects token_hash callbacks with an unsupported type', async () => {
    const response = await GET(createCallbackRequest('?token_hash=token-5&type=invalid'));

    expect(mockCreateClient).not.toHaveBeenCalled();
    expectRedirect(response, '/login?error=callback');
  });

  it('redirects to login when token_hash verification fails', async () => {
    mockSupabaseClient();
    mockVerifyOtp.mockResolvedValueOnce({ error: new Error('invalid token') });

    const response = await GET(createCallbackRequest('?token_hash=token-6&type=signup'));

    expectRedirect(response, '/login?error=callback');
  });

  it('exchanges OAuth codes and redirects to a safe next path', async () => {
    mockSupabaseClient();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const response = await GET(createCallbackRequest('?code=oauth-code&next=/calculator/history'));

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expectRedirect(response, '/calculator/history');
    expectNoStore(response);
  });

  it('redirects to login when OAuth code exchange fails', async () => {
    mockSupabaseClient();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: new Error('invalid code') });

    const response = await GET(createCallbackRequest('?code=oauth-code'));

    expectRedirect(response, '/login?error=callback');
  });

  it('redirects to login when neither token_hash nor code is present', async () => {
    const response = await GET(createCallbackRequest(''));

    expect(mockCreateClient).not.toHaveBeenCalled();
    expectRedirect(response, '/login?error=callback');
  });

  it('falls back to the default app path for unsafe next paths', async () => {
    mockSupabaseClient();
    mockVerifyOtp.mockResolvedValueOnce({ error: null });

    const response = await GET(
      createCallbackRequest('?token_hash=token-7&type=signup&next=//evil.com')
    );

    expectRedirect(response, '/calculator');
    expectNoStore(response);
  });

  it('treats an empty token_hash as absent and redirects to login when no code is present', async () => {
    const response = await GET(createCallbackRequest('?token_hash=&type=signup'));

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expectRedirect(response, '/login?error=callback');
  });

  it('rejects an empty type when token_hash is present', async () => {
    const response = await GET(createCallbackRequest('?token_hash=token-8&type='));

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expectRedirect(response, '/login?error=callback');
  });
});
