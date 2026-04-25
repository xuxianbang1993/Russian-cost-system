import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginForm } from '@/components/auth/LoginForm';

const { mockSignIn } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
}));

vi.mock('@/app/actions/auth', () => ({
  signIn: mockSignIn,
}));

describe('LoginForm', () => {
  it('renders email and password fields with the login button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('does not render feedback when initialFeedback is omitted', () => {
    render(<LoginForm />);

    expect(screen.queryByText('注册成功，请登录并继续完成业务操作。')).not.toBeInTheDocument();
  });

  it('renders success feedback from initialFeedback', () => {
    render(<LoginForm initialFeedback={{ success: '注册成功，请登录并继续完成业务操作。' }} />);

    expect(screen.getByText('注册成功，请登录并继续完成业务操作。')).toBeInTheDocument();
  });

  it('submits form data to the sign in server action', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({});
    render(<LoginForm />);

    await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    const formData = mockSignIn.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('email')).toBe('user@example.com');
    expect(formData?.get('password')).toBe('password123');
  });

  it('renders server action errors in the feedback banner', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: '登录失败，请检查账号或密码。' });
    render(<LoginForm />);

    await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('登录失败，请检查账号或密码。')).toBeInTheDocument();
  });
});
