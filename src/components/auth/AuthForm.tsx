'use client';

import { useActionState } from 'react';

import type { AuthActionResult } from '@/app/actions/auth';

export interface AuthFieldConfig {
  name: string;
  label: string;
  type: 'email' | 'password' | 'text';
  placeholder: string;
  autoComplete: string;
  optional?: boolean;
}

interface AuthFormProps {
  schema: unknown;
  onSubmit: (formData: FormData) => Promise<AuthActionResult>;
  fields: readonly AuthFieldConfig[];
  submitLabel: string;
  loadingLabel: string;
  initialFeedback?: AuthActionResult;
}

const EMPTY_FEEDBACK: AuthActionResult = {};

export function AuthForm({
  onSubmit,
  fields,
  submitLabel,
  loadingLabel,
  initialFeedback,
}: AuthFormProps) {
  const [feedback, formAction, pending] = useActionState(
    async (_previousState: AuthActionResult, formData: FormData) => onSubmit(formData),
    EMPTY_FEEDBACK
  );
  const visibleFeedback = feedback.error || feedback.success ? feedback : initialFeedback;

  return (
    <form action={formAction} className="space-y-5">
      {visibleFeedback ? <FeedbackBanner feedback={visibleFeedback} /> : null}
      {fields.map((field) => (
        <label key={field.name} className="block space-y-2">
          <span className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>{field.label}</span>
            {field.optional ? (
              <span className="text-xs font-normal text-tertiary">选填</span>
            ) : null}
          </span>
          <input
            autoComplete={field.autoComplete}
            className="w-full border-b border-border bg-transparent px-0 py-3 text-sm text-foreground outline-none transition-[border-color,color] duration-200 placeholder:text-placeholder focus:border-primary"
            defaultValue=""
            disabled={pending}
            name={field.name}
            placeholder={field.placeholder}
            type={field.type}
          />
        </label>
      ))}
      <button
        className="inline-flex w-full items-center justify-center rounded-[8px] bg-primary px-4 py-3 text-sm font-semibold text-white transition-[background-color,opacity] duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? loadingLabel : submitLabel}
      </button>
    </form>
  );
}

function FeedbackBanner({ feedback }: { feedback: AuthActionResult }) {
  const toneClassName = feedback.error
    ? 'border-destructive/10 bg-destructive-light text-destructive'
    : 'border-success/10 bg-success-light text-success';

  return (
    <div className={`rounded-[8px] border px-3 py-2 text-sm ${toneClassName}`}>
      {feedback.error ?? feedback.success}
    </div>
  );
}
