'use client';

import { signIn, type AuthActionResult } from '@/app/actions/auth';
import { AuthForm, type AuthFieldConfig } from '@/components/auth/AuthForm';
import { loginSchema } from '@/lib/schemas/auth';

interface LoginFormProps {
  initialFeedback?: AuthActionResult;
}

const LOGIN_FIELDS = [
  {
    name: 'email',
    label: '邮箱',
    type: 'email',
    placeholder: 'you@company.com',
    autoComplete: 'email',
  },
  {
    name: 'password',
    label: '密码',
    type: 'password',
    placeholder: '请输入登录密码',
    autoComplete: 'current-password',
  },
] satisfies readonly AuthFieldConfig[];

export function LoginForm({ initialFeedback }: LoginFormProps) {
  return (
    <AuthForm
      fields={LOGIN_FIELDS}
      initialFeedback={initialFeedback}
      loadingLabel="登录中..."
      onSubmit={signIn}
      schema={loginSchema}
      submitLabel="登录"
    />
  );
}
