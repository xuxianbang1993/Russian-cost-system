import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { REVENUE_TIERS } from '@/lib/calc/engine';
import { TierSelector } from '@/components/calculator/TierSelector';

const mockDispatch = vi.fn();

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { tierId: 'tier1' },
    dispatch: mockDispatch,
  }),
}));

describe('TierSelector', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders all 4 tier options', () => {
    render(<TierSelector />);

    for (const tier of REVENUE_TIERS) {
      expect(screen.getByRole('button', { name: tier.label })).toBeInTheDocument();
    }
  });

  it('highlights the active tier', () => {
    render(<TierSelector />);

    const activeTier = screen.getByRole('button', { name: REVENUE_TIERS[0]?.label ?? '' });
    expect(activeTier.className).toMatch(/bg-primary/);
    expect(activeTier.className).toMatch(/text-white/);
  });

  it('dispatches SET_TIER on click', async () => {
    const user = userEvent.setup();

    render(<TierSelector />);
    await user.click(screen.getByRole('button', { name: REVENUE_TIERS[2]?.label ?? '' }));

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_TIER', tierId: 'tier3' });
  });

  it('shows OSNO label on tier4 helper text', () => {
    render(<TierSelector />);

    expect(screen.getByText('一般税制')).toBeInTheDocument();
  });
});
