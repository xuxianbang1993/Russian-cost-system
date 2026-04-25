import Link from 'next/link';

import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const dynamic = 'force-dynamic';

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
      <RegisterForm />
    </AuthCard>
  );
}
