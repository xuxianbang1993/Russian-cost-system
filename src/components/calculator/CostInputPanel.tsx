'use client';

import type { Dispatch } from 'react';

import type { CalculatorAction } from '@/contexts/calculator/types';
import type { Expenses, Product } from '@/lib/calc/types';
import { useCalculatorContext } from '@/contexts/calculator';
import { NumberField } from '@/components/calculator/ui/NumberField';
import { SectionCard } from '@/components/calculator/ui/SectionCard';
import { SelectField } from '@/components/calculator/ui/SelectField';

function updateField(dispatch: Dispatch<CalculatorAction>, productId: string, updates: Partial<Product>) {
  dispatch({ type: 'UPDATE_PRODUCT', productId, updates });
}

function setExpense(dispatch: Dispatch<CalculatorAction>, key: keyof Expenses, value: number) {
  dispatch({ type: 'SET_EXPENSES', expenses: { [key]: value } });
}

export function CostInputPanel() {
  const { state, currentProduct, dispatch } = useCalculatorContext();
  const pid = currentProduct?.id ?? '';

  return (
    <div className="space-y-4">
      <SectionCard description="填写营业额、商品参数和五项支出，结果会实时联动更新。" title="成本参数">
        <NumberField
          label="年度营业额"
          name="revenue"
          onChange={(v) => dispatch({ type: 'SET_REVENUE', revenue: v })}
          value={state.revenue}
        />
      </SectionCard>

      {currentProduct ? (
        <SectionCard description={`当前商品：${currentProduct.emoji} ${currentProduct.name}`} title="商品参数">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="商品售价" name="platformPrice" value={currentProduct.platformPrice}
              onChange={(v) => updateField(dispatch, pid, { platformPrice: v })} />
            <NumberField label="采购成本" name="purchaseCost" value={currentProduct.purchaseCost}
              onChange={(v) => updateField(dispatch, pid, { purchaseCost: v })} />
            <NumberField label="申报成本" name="declaredCost" value={currentProduct.declaredCost}
              onChange={(v) => updateField(dispatch, pid, { declaredCost: v })} />
            <NumberField label="平台费率" name="platformFeeRate" value={currentProduct.platformFeeRate}
              onChange={(v) => updateField(dispatch, pid, { platformFeeRate: v })} />
            <NumberField label="关税税率" name="dutyRate" value={currentProduct.dutyRate}
              onChange={(v) => updateField(dispatch, pid, { dutyRate: v })} />
            <NumberField label="重量" name="weight" value={currentProduct.weight}
              onChange={(v) => updateField(dispatch, pid, { weight: v })} />
            <NumberField label="体积" name="volume" value={currentProduct.volume}
              onChange={(v) => updateField(dispatch, pid, { volume: v })} />
            <SelectField label="物流方式" value={currentProduct.shippingMethod}
              onChange={(v) => updateField(dispatch, pid, { shippingMethod: v })} />
          </div>
        </SectionCard>
      ) : (
        <div className="rounded-[14px] border border-dashed border-border bg-primary-light/40 px-4 py-5 text-sm text-muted-foreground">
          请先选择商品，再继续填写成本参数。
        </div>
      )}

      <SectionCard description="这里填写整体经营支出，不区分单个 SKU。" title="五项支出">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="进货成本" name="procurement" value={state.expenses.procurement}
            onChange={(v) => setExpense(dispatch, 'procurement', v)} />
          <NumberField label="物流费" name="logistics" value={state.expenses.logistics}
            onChange={(v) => setExpense(dispatch, 'logistics', v)} />
          <NumberField label="平台佣金" name="commission" value={state.expenses.commission}
            onChange={(v) => setExpense(dispatch, 'commission', v)} />
          <NumberField label="广告费" name="advertising" value={state.expenses.advertising}
            onChange={(v) => setExpense(dispatch, 'advertising', v)} />
          <NumberField label="人工成本" name="labor" value={state.expenses.labor}
            onChange={(v) => setExpense(dispatch, 'labor', v)} />
        </div>
      </SectionCard>
    </div>
  );
}

export default CostInputPanel;
