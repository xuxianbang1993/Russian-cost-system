'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';

import { updateProfile } from '@/lib/repositories/profileRepository';
import { loginSchema, registerSchema } from '@/lib/schemas/auth';
import { createClient } from '@/lib/supabase/server';

export interface AuthActionResult {
  error?: string;
  success?: string;
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const validation = loginSchema.safeParse(readLoginFormData(formData));

  if (!validation.success) {
    return { error: getValidationMessage(validation.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validation.data);

  if (error) {
    return { error: error.message };
  }

  redirect('/calculator');
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const validation = registerSchema.safeParse(readRegisterFormData(formData));

  if (!validation.success) {
    return { error: getValidationMessage(validation.error) };
  }

  const supabase = await createClient();
  const emailRedirectTo = await getEmailRedirectTo();
  const displayName = normalizeDisplayName(validation.data.displayName);
  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    return { error: error.message };
  }

  if (displayName && data.user) {
    await updateProfile(data.user.id, { displayName });
  }

  await supabase.auth.signOut();
  redirect('/login?success=registered');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function signOut(_formData?: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect('/login?error=signout');
  }

  redirect('/login?success=signed-out');
}

function readLoginFormData(formData: FormData) {
  return {
    email: readStringValue(formData, 'email'),
    password: readStringValue(formData, 'password'),
  };
}

function readRegisterFormData(formData: FormData) {
  return {
    email: readStringValue(formData, 'email'),
    password: readStringValue(formData, 'password'),
    confirmPassword: readStringValue(formData, 'confirmPassword'),
    displayName: readStringValue(formData, 'displayName'),
  };
}

function readStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function normalizeDisplayName(displayName: string | undefined) {
  if (!displayName) {
    return undefined;
  }

  const trimmedDisplayName = displayName.trim();
  return trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined;
}

function getValidationMessage(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;

  for (const messages of Object.values(fieldErrors)) {
    const firstMessage = messages?.[0];

    if (firstMessage) {
      return firstMessage;
    }
  }

  return '提交内容无效，请检查后重试。';
}

async function getEmailRedirectTo() {
  const headerStore = await headers();
  const origin = headerStore.get('origin');

  if (origin) {
    return `${origin}/auth/callback`;
  }

  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? 'https';

  if (!host) {
    return undefined;
  }

  return `${protocol}://${host}/auth/callback`;
}
