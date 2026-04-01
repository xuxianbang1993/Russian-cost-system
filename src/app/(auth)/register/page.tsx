import Link from 'next/link';

import { signUp } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';
import { registerSchema } from '@/lib/schemas/auth';

export const dynamic = 'force-dynamic';

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
] as const;

export default function RegisterPage() {
  return (
    <AuthCard
      description="创建账号后即可访问成本测算与后续业务模块。"
      footer={
        <p>
          已有账号？{' '}
          <Link className="font-medium text-primary" href="/login">
            返回登录
          </Link>
        </p>
      }
      title="注册账号"
    >
      <AuthForm
        fields={REGISTER_FIELDS}
        loadingLabel="注册中..."
        onSubmit={signUp}
        schema={registerSchema}
        submitLabel="创建账号"
      />
    </AuthCard>
  );
}
