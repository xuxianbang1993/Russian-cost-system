'use client';

import { signUp } from '@/app/actions/auth';
import { AuthForm, type AuthFieldConfig } from '@/components/auth/AuthForm';
import { registerSchema } from '@/lib/schemas/auth';

const REGISTER_FIELDS = [
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
    placeholder: '至少 6 个字符',
    autoComplete: 'new-password',
  },
  {
    name: 'confirmPassword',
    label: '确认密码',
    type: 'password',
    placeholder: '再次输入密码',
    autoComplete: 'new-password',
  },
  {
    name: 'displayName',
    label: '显示名称',
    type: 'text',
    placeholder: '例如：运营主管',
    autoComplete: 'nickname',
    optional: true,
  },
] satisfies readonly AuthFieldConfig[];

export function RegisterForm() {
  return (
    <AuthForm
      fields={REGISTER_FIELDS}
      loadingLabel="注册中..."
      onSubmit={signUp}
      schema={registerSchema}
      submitLabel="创建账号"
    />
  );
}
