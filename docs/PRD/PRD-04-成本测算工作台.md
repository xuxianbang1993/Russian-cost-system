# PRD-04: 成本测算工作台（Calculator Workbench）

| 字段 | 值 |
|------|-----|
| 模块 | Calculator 主布局、状态管理、实时联动 |
| 版本 | v0.1.0 |
| 状态 | ✅ 已实现骨架（Phase 5.1 + 5.2 + 5.3），右侧结果区待 Phase 5.4 接入 |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 代码入口 | `src/app/(dashboard)/calculator/page.tsx`、`src/components/calculator/CalculatorShell.tsx`、`src/contexts/calculator/*`、`src/components/calculator/TierSelector.tsx`、`src/components/calculator/CostInputPanel.tsx` |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
成本测算涉及多个输入变量（档位 / 商品参数 / 支出 / 汇率），任一变化都应**立即看到 3 种税制的对比结果**。如果需要手动点"计算"按钮或切换页面，会严重降低决策效率。

### 1.2 产品价值
- **所见即所算**：用户调整任一参数，右侧结果立即更新
- **分区聚焦**：左侧输入区（固定 320px sticky）+ 右侧结果区（可滚动）
- **多品同屏**：chip 快速切换，不用回列表页
- **响应式**：≤1024px 单列，左面板在上

### 1.3 作用
这是 **产品的核心使用场景**。其他 PRD（05/06/07 三个视图；08 测算保存）都挂载在这个工作台的右侧。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：单品快速测算
> 用户登录 → 选择 tier2 → 从 chip 列表选中"手机壳" → 右侧立即显示 USN-6% 和 USN-15% 的 KPI + 图表 → 调整"营业额"从 5000 万改到 8000 万 → 结果实时刷新 → 发现 USN-15% 更划算 → 截图给老板。

### 场景 2：多品对比
> 用户想决定主推哪款商品 → 切换 tab 到"多品对比" → 矩阵显示 5 个商品 × 2 税制的净利润 → 一眼看出"智能音箱"在 USN-6% 下净利润率 28%（最高）。

### 场景 3：销量规划
> 用户在当前档位已饱和 → 切换 tab 到"批量模拟" → 输入计划销量 → 看到销量翻倍后税负会从 12% 跳到 18%（档位切换） → 决定暂不扩张。

### 场景 4：跨设备持续编辑
> 用户在公司填了一半输入 → 下班回家打开电脑 → 商品库完整恢复，但输入参数（营收 / 支出）**不持久化**（Context 只在内存）→ 需要重新填（Phase 5.6 加"保存测算"才能恢复输入）。

---

## 3. 功能清单（WHAT）

### 3.1 已实现（✅ Phase 5.1/5.2/5.3）

| # | 功能 | 状态 | 代码 |
|---|------|------|------|
| F-1 | 双栏响应式布局（桌面 320px + flex / 移动端单列） | ✅ | `CalculatorShell.tsx` |
| F-2 | Header（标题 + 退出登录按钮） | ✅ | `CalculatorShell.tsx:19-29` |
| F-3 | 全局 Context + useReducer 状态管理 | ✅ | `CalculatorProvider.tsx` |
| F-4 | TierSelector（4 档 chip 切换） | ✅ | `TierSelector.tsx` |
| F-5 | ProductManager（chip 列表 + CRUD） | ✅ | 见 PRD-03 |
| F-6 | CostInputPanel（营业额 + 商品参数 + 5 项支出） | ✅ | `CostInputPanel.tsx` |
| F-7 | 实时计算（`useMemo(calculateTax)`） | ✅ | `CalculatorProvider.tsx:32-38` |
| F-8 | 多品预计算（`allProductsCalc` Map） | ✅ | `CalculatorProvider.tsx:40-49` |
| F-9 | Server-side 首屏数据（商品列表 + 汇率） | ✅ | `page.tsx` 传 `initialProducts + initialRates` |
| F-10 | 退出登录 | ✅ | `<form action={signOut}>` |

### 3.2 未实现（⏳ 后续 Phase）

| # | 功能 | 计划 Phase | 对应 PRD |
|---|------|----------|---------|
| F-11 | 右侧 ViewTabs（3 个 tab 切换） | 5.4 | PRD-05/06/07 |
| F-12 | DetailView（KPI + 柱状图 + 明细表） | 5.4 | PRD-05 |
| F-13 | CompareView（多品矩阵） | 5.5 | PRD-06 |
| F-14 | BatchSimulation（销量模拟） | 5.5 | PRD-07 |
| F-15 | Header 汇率输入框 + 保存测算按钮 | 5.6 | PRD-08 |
| F-16 | 保存测算到历史记录 | 5.6 | PRD-08 |

---

## 4. 业务规则

### 4.1 状态树结构
```ts
interface CalculatorState {
  tierId: TierId;                           // 'tier1' | ... | 'tier4'
  products: Product[];                       // 当前用户的商品库
  currentProductId: string | null;           // 当前选中的商品 id
  expenses: Expenses;                        // 5 项支出
  rates: ExchangeRates;                      // 汇率（cnyPerRub, usdPerCny）
  activeView: 'detail' | 'compare' | 'batch'; // 右侧 tab
  batchQuantity: number;                     // 批量模拟的销量
  revenue: number;                           // 年度营业额
}
```

### 4.2 Action 集合
```ts
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
  | { type: 'INIT'; products: Product[]; rates: ExchangeRates };
```

### 4.3 派生值（Context 暴露）
- `currentProduct` — `products.find(p => p.id === currentProductId)`
- `calcOutput` — `calculateTax({ product: currentProduct, tier, revenue, expenses, rates })`（无 currentProduct 时为 `null`）
- `allProductsCalc` — `Map<productId, CalcOutput>`，供多品对比视图使用

### 4.4 计算触发规则
- **实时计算**：`calcOutput` 和 `allProductsCalc` 都通过 `useMemo` 订阅状态变化，**任一输入变化立即重算**。
- **无节流**：计算引擎 <1ms，不需要 debounce。
- **无 currentProduct 时**：`calcOutput = null`，右侧显示空态提示（Phase 5.4 实现）。

### 4.5 持久化规则（当前版本）
| 数据 | 持久化 | 恢复方式 |
|------|-------|---------|
| 商品库（`products`） | ✅ Supabase | 页面 SSR 时 `getProducts(userId)` 预取 |
| 当前选中商品 (`currentProductId`) | ❌ 只在内存 | 每次进入默认选第 1 个 |
| 营业额 / 支出 / 汇率 | ❌ 只在内存 | 每次进入用默认值 |
| 档位 (`tierId`) | ❌ 只在内存 | 默认 `tier1` |

> **Phase 5.6** 的"保存测算"会把当次输入 + 结果快照存入 `calculations` 表，用户可显式保存 + 加载历史。

### 4.6 退出登录规则
- Header 右上角 `<form action={signOut}>`
- 无二次确认（Phase 5.7 可选加）
- 退出后 Context 随页面卸载自动清空

### 4.7 布局断点
| 断点 | 行为 |
|------|------|
| ≥1024px | 双栏：左面板 320px sticky，右面板 flex-1 滚动 |
| <1024px | 单列：左面板在上（不 sticky），右面板在下 |

---

## 5. 交互细节

### 5.1 路由与组件树
```
/calculator (app/(dashboard)/calculator/page.tsx, Server Component)
  ├── 服务端: getProducts(userId) + 默认 rates
  └── CalculatorShell.tsx (Client, 'use client')
        ├── CalculatorProvider (Context + useReducer)
        ├── <header> (Logo + "退出登录" form)
        └── <div> flex-col lg:flex-row
              ├── <aside> (左面板 sticky)
              │     ├── TierSelector
              │     ├── ProductManager (见 PRD-03)
              │     └── CostInputPanel
              └── <main> (右面板)
                    └── [Phase 5.4: ViewTabs + ResultPanel]
```

### 5.2 TierSelector 视觉
- 4 个 chip 水平排列（移动端自动换行）
- 选中：`bg-primary text-white`
- 未选中：`border-border text-tertiary`，hover 变主色
- tier4 额外显示"一般税制"标签
- 下方显示当前档位副标题（如 "初创期"、"成长期"）

### 5.3 CostInputPanel 视觉
三个 SectionCard 纵向堆叠：
1. **成本参数**：营业额（1 个 NumberField）
2. **商品参数**：8 个 NumberField + 1 个 SelectField（仅当 `currentProduct` 存在时显示）
3. **五项支出**：5 个 NumberField（进货 / 物流 / 佣金 / 广告 / 人工）

- 输入框样式：**下划线式**（border-bottom），不用框式
- 数字字段：`font-mono` + 右对齐 + `font-weight: 600`
- 实时 dispatch：每次 onChange 立即 reducer 更新状态 → useMemo 重算 → 右侧刷新

### 5.4 Header 内容（当前 vs Phase 5.6 完整形态）
| 区域 | 当前 | Phase 5.6 |
|------|------|----------|
| 左 | "跨境电商成本计算器" 标题 | Logo + 标题 |
| 中 | —（空） | 汇率输入（CNY→RUB / USD→CNY） |
| 右 | "退出登录" | 保存测算按钮 + 用户菜单 + 退出 |

### 5.5 空态处理
| 情形 | 表现 |
|------|------|
| 无商品 | ProductManager 显示 "暂无商品" 空态；CostInputPanel 的"商品参数"section 显示"请先选择商品" |
| 无选中商品 | 右侧结果区（Phase 5.4 后）显示"请选择一个商品开始测算" |
| 无输入 | 默认值 0 / ''，结果按 0 计算（因为边界规则允许） |

---

## 6. 数据流

### 6.1 输入 → 状态 → 结果的完整链路
```
用户在 TierSelector 点击 tier2
  → onClick → dispatch({ type: 'SET_TIER', tierId: 'tier2' })
  → reducer 返回新 state（tierId 改变）
  → useMemo(calcOutput) 依赖变化重算
  → calculateTax({ product, tier: 'tier2', revenue, expenses, rates }) 返回新 CalcOutput
  → Context.value 更新
  → 右侧组件 rerender
```

### 6.2 商品 CRUD 与状态同步（见 PRD-03）
- `createProductAction` 成功 → `dispatch({ type: 'ADD_PRODUCT', product })`
- `updateProductAction` 成功 → `dispatch({ type: 'UPDATE_PRODUCT', productId, updates })`
- `deleteProductAction` 成功 → `dispatch({ type: 'REMOVE_PRODUCT', productId })`

**Why 这样做**：保持 UI 响应（乐观更新风格）+ Server Action 是真实持久化源。

### 6.3 Server Component 首屏数据
```tsx
// app/(dashboard)/calculator/page.tsx (Server Component, SSR)
export default async function CalculatorPage() {
  const userId = await getCurrentUserId();  // 无则 middleware 已重定向
  const products = await getProducts(userId);
  const rates = DEFAULT_RATES;              // Phase 5.6 改从用户偏好读
  return <CalculatorShell initialProducts={products} initialRates={rates} />;
}
```

**Why**：首屏 HTML 已包含商品列表，无 loading flash。

---

## 7. 验收标准（Definition of Done）

### 7.1 已完成的验收（✅ 截至 Phase 5.3）
- [x] 登录后跳 `/calculator`，左面板完整显示（TierSelector + ProductManager + CostInputPanel）
- [x] 右面板显示占位文字 "Right Panel — Phase 5.4"
- [x] TierSelector 切换 → `aria-pressed` 切换 + 下方副标题更新
- [x] 商品 chip 切换 → 右侧（Phase 5.4 后）结果更新
- [x] 任一输入变化 → Context `calcOutput` 重算（通过 useMemo）
- [x] 响应式：桌面双栏 / ≤1024px 单列
- [x] 退出登录按钮可点 → 跳 `/login?success=signed-out`
- [x] 硬刷页面 → 商品列表保留（Supabase 持久化）

### 7.2 待 Phase 5.4-5.6 完成的验收
- [ ] ViewTabs 3 个 tab 切换正常
- [ ] DetailView 显示 KPI + 柱状图 + 明细表（与 6 个黄金用例数值一致）
- [ ] CompareView 显示矩阵表
- [ ] BatchSimulation 显示销量 → 利润曲线
- [ ] 保存测算按钮持久化到 `calculations` 表
- [ ] Header 汇率输入影响计算结果

### 7.3 非功能验收
- [ ] 首屏 TTI < 3s（包含 Supabase 初次查询）
- [ ] 参数变化到右侧重算 < 50ms
- [ ] 6 个黄金测试用例在 UI 上结果与单测一致（人眼抽查）
- [ ] ≤1024px 响应式手动测试通过

---

## 8. 非功能需求

### 8.1 性能
- `useReducer` 所有 Action 必须是 pure function（便于优化和测试）
- `useMemo` 依赖精确（避免过度重算）
- `allProductsCalc` 只在商品列表变化或共享输入变化时重算
- 商品 >20 条时考虑虚拟滚动（Phase 5.7 或 v0.2.0）

### 8.2 可访问性
- 所有按钮有 `aria-label`
- Chip 选中态 `aria-pressed`
- 键盘可完整操作（Tab + Enter + 方向键候选）
- 字体基础 14px（遵循 DEVELOPMENT_STRATEGY Design Token）

### 8.3 可维护性
- `CalculatorShell` ≤150 行（当前 45 行，达标）
- reducer 分文件（`reducer.ts`），Action 类型集中在 `types.ts`
- 派生计算（如 `currentProduct`）放 Context 层，不让组件重复计算

### 8.4 类型安全
- `CalculatorContextValue` 接口严格，`useCalculatorContext()` 断言 hook 在 Provider 内使用
- `CalculatorAction` 是 discriminated union，reducer 内必须 exhaustive switch

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-01 用户认证（userId）
- PRD-02 核心计算引擎（`calculateTax`）
- PRD-03 商品管理（商品 CRUD）
- React 19 Context API + useReducer + useMemo

### 9.2 技术约束
- **必须** Server Component 做首屏数据获取（page.tsx）
- **必须** Client Component 承载 Provider（CalculatorShell）
- **禁止** 在 reducer 里调 Supabase（reducer 必须纯函数）
- **禁止** 在 CSS 里 `transition: all`（性能问题，必须指定属性）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 输入状态不持久化 | Medium | Phase 5.6 加"保存测算"按钮 |
| 多品计算 O(N) 规模大 | Low | N < 50 时无感；Phase 5.7 加 Worker 池方案 |
| 汇率错误导致结果偏差 | Medium | Phase 5.6 Header 汇率输入 + 显示"最后更新时间"；v0.2.0 实时汇率 API |
| Context rerender 过度 | Low | useMemo 已分层，Phase 5.4 如果性能问题再用 selector pattern |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.1 + 5.2 + 5.3
- 架构设计：`docs/plans/2026-03-28-step5-calculator-frontend-design.md`
- Context 类型：`src/contexts/calculator/types.ts`
- Reducer：`src/contexts/calculator/reducer.ts`
- Checkpoint：`docs/20260422-checkpoint.md`
