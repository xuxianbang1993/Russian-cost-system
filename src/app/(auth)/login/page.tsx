import Link from 'next/link';

import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

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
      <LoginForm initialFeedback={feedback} />
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

  if (searchParams.error === 'signout') {
    return { error: '退出登录失败，请重试。' };
  }

  if (searchParams.success === 'registered') {
    return { success: '注册成功，请登录并继续完成业务操作。' };
  }

  if (searchParams.success === 'signed-out') {
    return { success: '您已安全退出系统。' };
  }

  return undefined;
}
