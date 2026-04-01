import Link from 'next/link';

import { signIn } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';
import { loginSchema } from '@/lib/schemas/auth';

export const dynamic = 'force-dynamic';

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
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const feedback = resolveLoginFeedback(await searchParams);

  return (
    <AuthCard
      description="使用企业邮箱登录 ELSCBSSXT 跨境电商成本测算系统。"
      footer={
        <p>
          还没有账号？{' '}
          <Link className="font-medium text-primary" href="/register">
            立即注册
          </Link>
        </p>
      }
      title="登录系统"
    >
      <AuthForm
        fields={LOGIN_FIELDS}
        initialFeedback={feedback}
        loadingLabel="登录中..."
        onSubmit={signIn}
        schema={loginSchema}
        submitLabel="登录"
      />
    </AuthCard>
  );
}

function resolveLoginFeedback(searchParams: {
  error?: string;
  success?: string;
}) {
  if (searchParams.error === 'callback') {
    return { error: '邮箱验证回调失败，请重新登录后再试。' };
  }

  if (searchParams.success === 'registered') {
    return { success: '注册成功，请登录并继续完成业务操作。' };
  }

  if (searchParams.success === 'signed-out') {
    return { success: '您已安全退出系统。' };
  }

  return undefined;
}
