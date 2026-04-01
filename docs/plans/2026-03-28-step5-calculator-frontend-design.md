# Step 5: 成本测算前端 — 设计文档

> **日期**: 2026-03-28
> **状态**: 已审批
> **前置**: Step 1-4 全部完成（53 测试全绿）
> **实现进度（2026-03-30）**: `Phase 5.2` 已完成并验证；左侧面板中的 `TierSelector` 和 `CostInputPanel` 已落地，下一阶段进入商品管理。

---

## 1. 需求决策汇总

| 决策项 | 结论 |
|--------|------|
| 商品数据源 | 完整接入 Supabase（productRepository） |
| 视图 Tab | 3 个全做（税制对比 + 多品对比 + 批量模拟） |
| 图表库 | Recharts（shadcn/ui chart 组件） |
| 计算触发 | 实时计算（useMemo，输入变化即重算） |
| 保存时机 | 手动"保存测算"按钮 |
| KPI sparkline | 移除，只显示 KPI 数字 |
| 营收档位 | 显示 4 档（含 tier4 >4.5 亿 OSNO） |
| 状态管理 | 单一 CalculatorContext + useReducer |

---

## 2. 整体架构与数据流

```
calculator/page.tsx (Server Component)
  ├── 获取 taxConfig + 用户商品列表 (Server Side)
  └── CalculatorShell.tsx ('use client')
        ├── CalculatorProvider (Context + useReducer)
        ├── DashboardHeader (Logo + 汇率 + 保存按钮)
        ├── LeftPanel
        │   ├── TierSelector (4 档 pill 切换)
        │   ├── ProductManager (商品 chips + 添加/删除)
        │   └── CostInputPanel (核心参数 + 5 项支出)
        └── RightPanel
            ├── ViewTabs (3 tab 切换)
            ├── DetailView (KPI + 柱状图 + 详细表格)
            ├── CompareView (多品 x 多税制矩阵)
            └── BatchSimulation (数量输入 + 3 卡片)
```

**数据流**:
1. 用户输入变化 -> `dispatch(action)` -> reducer 更新 state
2. `useMemo(calculateTax(input))` -> CalcOutput
3. 子组件从 Context 读取计算结果并渲染

**Server/Client 边界**:
- `page.tsx` 是 Server Component，负责数据获取
- `CalculatorShell.tsx` 是 Client 包裹层，持有 Provider
- 所有交互子组件均为 Client Component

---

## 3. Context 状态结构

```typescript
interface CalculatorState {
  tierId: TierId
  products: Product[]
  currentProductId: string | null
  expenses: Expenses
  rates: ExchangeRates
  activeView: 'detail' | 'compare' | 'batch'
  batchQuantity: number
  revenue: number
}

type CalculatorAction =
  | { type: 'SET_TIER'; tierId: TierId }
  | { type: 'SET_PRODUCT'; productId: string }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'REMOVE_PRODUCT'; productId: string }
  | { type: 'UPDATE_PRODUCT'; productId: string; updates: Partial<Product> }
  | { type: 'SET_EXPENSES'; expenses: Partial<Expenses> }
  | { type: 'SET_RATES'; rates: Partial<ExchangeRates> }
  | { type: 'SET_VIEW'; view: 'detail' | 'compare' | 'batch' }
  | { type: 'SET_BATCH_QUANTITY'; quantity: number }
  | { type: 'SET_REVENUE'; revenue: number }
  | { type: 'INIT'; products: Product[]; rates: ExchangeRates }

interface CalculatorContextValue {
  state: CalculatorState
  dispatch: React.Dispatch<CalculatorAction>
  currentProduct: Product | null
  calcOutput: CalcOutput | null
  allProductsCalc: Map<string, CalcOutput>
}
```

---

## 4. 组件清单

### 左侧面板

| 组件 | 类型 | 职责 | 行数 |
|------|------|------|------|
| TierSelector | Client | 4 档 pill/chip 切换 | ~60 |
| ProductManager | Client | 商品列表 chips + 添加/删除 | ~120 |
| ProductFormModal | Client | 添加/编辑商品弹窗 (react-hook-form + zod) | ~130 |
| CostInputPanel | Client | 核心参数 + 附加参数 + 5 项支出 | ~140 |

### 右侧面板

| 组件 | 类型 | 职责 | 行数 |
|------|------|------|------|
| ViewTabs | Client | 3 tab 切换容器 | ~30 |
| DetailView | Client | 税制对比主视图 | ~140 |
| KpiCards | Client | 3 个 KPI 卡片 (利润率/总成本/净利润) | ~70 |
| TaxComparisonChart | Client | Recharts 柱状图 | ~80 |
| TaxDetailTable | Client | 各税制费用明细表格 | ~100 |
| CompareView | Client | 多品 x 多税制矩阵表 | ~120 |
| BatchSimulation | Client | 数量输入 + 3 卡片 | ~100 |

### 布局

| 组件 | 类型 | 职责 | 行数 |
|------|------|------|------|
| CalculatorShell | Client | Provider + 双栏布局 | ~80 |
| DashboardHeader | Client | Logo + 标题 + 汇率 + 保存 | ~80 |

### Hooks

| Hook | 职责 |
|------|------|
| useCalculatorContext | Context 消费 |
| useProducts | 商品 CRUD (包装 productRepository) |
| useSaveCalculation | 保存测算记录 |

### Server Actions

| Action | 职责 |
|--------|------|
| actions/products.ts | 商品 CRUD |
| actions/calculations.ts | 保存测算 |

---

## 5. 测试策略

预计新增 ~32 个组件测试，总计 ~85 个。

| 测试文件 | 类型 | 用例数 |
|---------|------|--------|
| component/calculator/TierSelector.test.tsx | 组件 | ~4 |
| component/calculator/CostInputPanel.test.tsx | 组件 | ~6 |
| component/calculator/DetailView.test.tsx | 组件 | ~5 |
| component/calculator/CompareView.test.tsx | 组件 | ~4 |
| component/calculator/BatchSimulation.test.tsx | 组件 | ~4 |
| component/calculator/ProductManager.test.tsx | 组件 | ~5 |
| component/calculator/CalculatorShell.test.tsx | 集成 | ~4 |

**测试方法**:
- 组件测试 mock `useCalculatorContext` 返回预设状态
- CalculatorShell 集成测试用真实 Context + mock Supabase
- 图表组件只测渲染不测交互
- 金额断言使用精确值匹配

---

## 6. 依赖安装

```bash
pnpm add recharts
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

shadcn/ui 组件按需添加: Dialog, Tabs, Input, Button, Table, Badge, Separator
