import { z } from 'zod';

const emailSchema = z.string().trim().email('请输入有效的邮箱地址。');
const passwordSchema = z
  .string()
  .min(6, '密码至少需要 6 个字符。')
  .max(72, '密码长度不能超过 72 个字符。');

const displayNameSchema = z
  .string()
  .trim()
  .max(50, '显示名称不能超过 50 个字符。')
  .or(z.literal(''))
  .optional();

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    displayName: displayNameSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: '两次输入的密码不一致。',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
