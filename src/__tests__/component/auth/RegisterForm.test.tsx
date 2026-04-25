import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RegisterForm } from '@/components/auth/RegisterForm';

const { mockSignUp } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
}));

vi.mock('@/app/actions/auth', () => ({
  signUp: mockSignUp,
}));

describe('RegisterForm', () => {
  it('renders the create account button', () => {
    render(<RegisterForm />);

    expect(screen.getByRole('button', { name: '创建账号' })).toBeInTheDocument();
  });

  it('renders all register fields', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：运营主管')).toBeInTheDocument();
  });

  it('submits form data to the sign up server action', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({});
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.type(screen.getByPlaceholderText('例如：运营主管'), '运营主管');
    await user.click(screen.getByRole('button', { name: '创建账号' }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    const formData = mockSignUp.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('email')).toBe('user@example.com');
    expect(formData?.get('password')).toBe('password123');
    expect(formData?.get('confirmPassword')).toBe('password123');
    expect(formData?.get('displayName')).toBe('运营主管');
  });

  it('renders server action errors in the feedback banner', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: '两次输入的密码不一致。' });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'different123');
    await user.click(screen.getByRole('button', { name: '创建账号' }));

    expect(await screen.findByText('两次输入的密码不一致。')).toBeInTheDocument();
  });
});
