import { describe, expect, it } from 'vitest';

import {
  productFormSchema,
  productUpdateSchema,
  productWriteSchema,
  toProductWriteInput,
} from '@/lib/schemas/product';

const validWriteInput = {
  name: 'Desk Lamp',
  emoji: '📦',
  platformPrice: 599.5,
  declaredCost: 280.5,
  purchaseCost: 120.25,
  volume: 0.5,
  weight: 1.2,
  dutyRate: 0.12,
  platformFeeRate: 0.19,
  shippingMethod: 'standard' as const,
};

const validFormInput = {
  ...validWriteInput,
  dutyRate: 12,
  platformFeeRate: 19,
};

describe('product schemas', () => {
  it('accepts valid write input with fractional rates', () => {
    expect(productWriteSchema.safeParse(validWriteInput).success).toBe(true);
  });

  it('rejects write input when fractional rates are outside 0 to 1', () => {
    const result = productWriteSchema.safeParse({
      ...validWriteInput,
      dutyRate: 1.1,
    });

    expect(result.success).toBe(false);
  });

  it('accepts form input with percentage rates from 0 to 100', () => {
    expect(productFormSchema.safeParse(validFormInput).success).toBe(true);
  });

  it('rejects form input when percentage rates exceed 100', () => {
    const result = productFormSchema.safeParse({
      ...validFormInput,
      platformFeeRate: 101,
    });

    expect(result.success).toBe(false);
  });

  it('converts percentage form rates to fractional write rates', () => {
    expect(toProductWriteInput(validFormInput)).toEqual(validWriteInput);
  });

  it('allows partial update input', () => {
    expect(productUpdateSchema.safeParse({ name: 'Updated Lamp' }).success).toBe(true);
  });
});
