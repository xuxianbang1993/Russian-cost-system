# PHASE-5.5-SPEC: PRD-06 多品对比 + PRD-07 批量销量模拟

> **范围**：Phase 5.5（CompareView + BatchSimulation）
> **父分支**：`feat/step-5-4-to-5-7-tax-views`（HEAD `b5f3689`）
> **子分支**：`feat/step-5-5-compare-batch`
> **基线**：173 passing / 19 files；三件套全绿
> **审查模式**：§11.4 场景 C（C1 ✅ PASS / C2 待 phase 完成后做）
> **作者**：Plan subagent（Sonnet）→ 主线 Claude 落盘 → Codex C1 反馈吸收
> **版本**：v4（v3 经 Codex 三审 PASS 后吸收 3 个 new issues；§11.4 场景 C SPEC 审已耗尽，下一步直接进 Step 0）
> **日期**：2026-04-27

---

## 1. PRD 解读

### 1.1 PRD-06 MUST HAVE（F-1 ~ F-8 + F-4.1）
- F-1 矩阵表格：商品为行 × 税制为列（Q4 决策）
- F-2 单元格双行：大字净利润 + 小字利润率（Q5 决策）
- F-3 每行最优单元格高亮 `bg-success-light` + `text-success` + bold + ⭐
- F-4 最右一列"推荐税制"显示 `recommended`（USN-6%/USN-15%/OSNO）
- **F-4.1（v2 补）点击推荐税制列：按 `recommended` 分组排序，**组顺序固定 `USN-6% → USN-15% → OSNO`**（v3 补），组内仍按 sortKey 净利润降序，再点取消分组（PRD-06 §4.4）**
- F-5 表头点击排序（默认 USN-6% 净利润降序，再点切升序，再点恢复）
- F-6 行点击 → `dispatch SET_PRODUCT` + `SET_VIEW=detail` 跳 DetailView
- F-7 < 2 商品时空态 + "去添加"快捷按钮
- F-8 首列 emoji + 商品名（响应式手机 sticky-left）
- 浮点平局：`Math.abs(a-b) < 0.01` → 都不高亮，显示 "="
- tier4：单 OSNO 列 + 推荐列（永远 OSNO）

### 1.2 PRD-07 MUST HAVE（F-1 ~ F-10）
- F-1 双端滑块：销量下限 + 上限（Q6 决策）
- F-2 Recharts `<LineChart>`：净利润线（绿）+ 总税额线（红）
- F-3 档位边界 `<ReferenceLine>` 虚线 + 标签（"tier1 → tier2" / "→ OSNO 强制"）
- F-4 滑块拖动 100ms **真 debounce**（v2 修正：用 setTimeout 时间维度，不是 useDeferredValue）实时刷曲线
- F-5/F-6 X=营业额(₽)、Y=金额(₽)
- F-7 默认范围按当前 tier 自动设（tier1: 0-2.5亿 / tier2: 0-4.5亿 / tier3: 2.5-10亿 / tier4: 4.5-10亿）
- F-8 滑块两侧精确数字输入
- F-9 无 currentProduct 时空态
- F-10 采样 20 点 + 强制插入档位边界（2000万 / 2.5亿 / 4.5亿）+ boundary+1 防毛刺
- 范围限制 `min ≤ max - 1000`；max > 10亿截断；min==max 提示扩大范围
- 每个采样点独立判断 recommended（档位会切）

> **实施规则（非 PRD MUST HAVE，用户 B 决策 2026-04-27）**：SET_TIER 时 batchMin/batchMax **不重置**，保留用户编辑值（按 PRD-07 §6.2 "离开 tab 再回来保留本次输入" 引申）。PRD-07 字面未写，待 PRD 作者后续修订追加。

### 1.3 复用点 / 隔离边界
- **共享**：`useCalculatorContext` / `EmptyState` / `format.ts` 颜色函数 / `cn` `formatRUB` `formatPercent` / `engine.calculateTax`+`determineTier`+`REVENUE_TIERS`
- **隔离**：CompareView 用 `allProductsCalc`（已在 Provider memo），BatchSimulation 用 `currentProduct` 自行 sample 调用 `calculateTax`；两组件零相互依赖

---

## 2. 文件清单

| 文件路径 | 新增/修改 | 职责 |
|---|---|---|
| **共享** | | |
| `src/contexts/calculator/types.ts` | 修改 | (1) **删** `batchQuantity` + `SET_BATCH_QUANTITY` action（5.4 前 placeholder，0 UI 引用）；(2) 加 `batchMin: number; batchMax: number`；(3) 加 `SET_BATCH_RANGE` action |
| `src/contexts/calculator/reducer.ts` | 修改 | (1) **删** `batchQuantity: 1` 默认 + `case 'SET_BATCH_QUANTITY'`；(2) `createInitialState` 默认 `batchMin/batchMax` 按当前 tier 计算；(3) 新增 `case 'SET_BATCH_RANGE'`；(4) **`SET_TIER` 不重置** `batchMin/batchMax`（B 决策） |
| `src/__tests__/component/calculator/reducer.test.ts` | 修改 | (1) 删 `SET_BATCH_QUANTITY` 测试；(2) 加 `SET_BATCH_RANGE` 测试；(3) 加 `SET_TIER` 不重置 batchMin/batchMax 断言；(4) 加 `createInitialState` 默认值断言 |
| `src/__tests__/component/calculator/{ViewTabs,CostInputPanel,DetailView,TaxComparisonChart,KpiCards,ProductManager,TaxDetailTable}.test.tsx` | 修改 | 7 个 buildContext mock 同步：删 `batchQuantity:1`，加 `batchMin/batchMax`（默认按 tier） |
| `src/lib/hooks/useDebouncedValue.ts` | 新增 | **真 100ms 时间维度 debounce hook**（`useState + useEffect + setTimeout/clearTimeout`，cleanup 清旧 timer）；不引入 lodash / use-debounce |
| `src/__tests__/unit/hooks/useDebouncedValue.test.ts` | 新增 | hook 行为测试（`vi.useFakeTimers`） |
| **PRD-06** | | |
| `src/components/calculator/CompareView.tsx` | 替换实现 | 主组件：empty / matrix / 排序 / 跳转（含 group sort 状态机） |
| `src/components/calculator/CompareTable.tsx` | 新增 | 矩阵表格子组件（拆分以保持 ≤150 行） |
| `src/components/calculator/CompareCell.tsx` | 新增 | 双行单元格（净利润 + 利润率），含高亮态/平局态 |
| `src/lib/calc/compare.ts` | 新增 | 纯函数：`buildCompareRows` / `findBestRegime`（含 `<0.01` 平局逻辑）/ `sortRows` / **`groupSortByRecommended`（v2）**；导出 `SortMode = 'column' \| 'group'` |
| `src/__tests__/component/calculator/CompareView.test.tsx` | 新增 | 组件测试 ≥7 用例（含 group sort） |
| `src/__tests__/unit/calc/compare.test.ts` | 新增 | 纯函数测试（最佳/平局/排序/group sort） |
| **PRD-07** | | |
| `src/components/calculator/BatchSimulation.tsx` | 替换实现 | 主组件：empty / 范围控件 / 图表 |
| `src/components/calculator/BatchRangeControls.tsx` | 新增 | 双端滑块 + 两个数字输入；持 `draftMin/draftMax` 本地 useState 即时反馈 UI（v3 加，避免 snap-back），用 `useDebouncedValue(100)` 派生 stable 值后再 dispatch；**sync useEffect 仅在 committed `batchMin/batchMax` props 实际变化时触发**（v4 修正：不绑特定 action 来源，避免 SET_PRODUCT/SET_TIER 行为耦合） |
| `src/__tests__/component/calculator/BatchRangeControls.test.tsx` | 新增（v3） | ≥3 用例：拖动即时反馈 / 100ms 后才 dispatch / 外部 SET_PRODUCT 后 sync 进 draft |
| `src/components/calculator/BatchChart.tsx` | 新增 | Recharts LineChart（含 ReferenceLine 边界标注） |
| `src/lib/calc/sample.ts` | 新增 | 纯函数：`buildSamplePoints({product, expenses, rates, min, max})` / `getDefaultBatchRange(tierId)`（含 boundary+1 / 10亿截断 / min==max 标记） |
| `src/__tests__/component/calculator/BatchSimulation.test.tsx` | 新增 | 组件测试 ≥4 用例 |
| `src/__tests__/unit/calc/sample.test.ts` | 新增 | 纯函数测试（≥9 用例：默认范围/边界/boundary+1/10亿截断/min==max/50 点上限/try-catch） |

> **不改对外接口**：ViewTabs / ResultPanel / DetailView / KpiCards（§11.5 红线）。ResultPanel.test 中 "待实现" 文本断言会失效 → Step F 同步更新。

---

## 3. 实施步骤（SPEC→TEST→IMPL→VERIFY）

**前提**：已切分支 `feat/step-5-5-compare-batch`，从父分支 `b5f3689`。

### Step 0 — 预读（写代码前必做，AGENTS.md 要求）
- 扫读 `node_modules/next/dist/docs/` 中（v3 路径修正）：
  - `01-app/01-getting-started/` — App Router 当前规范
  - `01-app/03-api-reference/01-directives/use-client.md` — Client Component 边界
  - `01-app/03-api-reference/04-functions/` — Server Action / hook 规范
  - `01-app/03-api-reference/05-config/01-next-config-js/reactCompiler.md` — React Compiler 限制（避免 5.4 翻车的"render 中读 ref"陷阱）
- 输出：≤200 字预读摘要，列 5.5 实施需要警觉的 3-5 条 Next.js 16 / React 19 规则。
- VERIFY：摘要写进 `docs/SPEC/PHASE-5.5-PREREAD.md`（一次性临时文件，5.5 完成后删）。

### Step A — Context 扩展 + 历史 batchQuantity 清理
- A.SPEC：(1) 删 `batchQuantity` + `SET_BATCH_QUANTITY`（已 grep 确认 0 UI 引用）；(2) 加 `batchMin/batchMax` + `SET_BATCH_RANGE`；(3) `getDefaultBatchRange(tierId)` 计算默认；(4) **`SET_TIER` 不重置** batchMin/batchMax（按用户 B 决策；PRD-07 §6.2 作为"保留本次输入"的依据，v4 措辞修正）。
- A.TEST：reducer.test.ts (1) 删 `SET_BATCH_QUANTITY` 用例；(2) 加 `SET_BATCH_RANGE` + `createInitialState` 默认 + `SET_TIER` 不重置范围 3 用例；7 个 component 测试 buildContext mock 同步。
- A.IMPL：改 `types.ts` + `reducer.ts`；7 测试 mock 字段同步；不动 Provider `useMemo`。
- A.VERIFY：`pnpm test:run reducer` + 7 component 测试全绿；`tsc --noEmit` 干净。

### Step B — PRD-06 纯函数层
- B.SPEC：`buildCompareRows(products, allProductsCalc) → CompareRow[]`；`findBestRegime(row, tieEpsilon=0.01) → TaxRegimeId | null`（null=平局）；`sortRows(rows, sortKey, direction)`；**`groupSortByRecommended(rows, sortKey, direction)`**（v2，按 recommended 分组 + 组内净利润降序）；`SortMode = 'column' | 'group'`。
- B.TEST：`compare.test.ts` ≥6 用例（基础最高/平局/tier4/空 calc/3 向排序/group sort）。
- B.IMPL：`src/lib/calc/compare.ts` 纯函数。
- B.VERIFY：单元测试绿。

### Step C — PRD-06 UI 层
- C.SPEC：`CompareCell`（props: value/isBest/isTie）；`CompareTable`（props: rows + sortKey + sortMode + onSort + onGroupSort + onRowClick）；`CompareView`（顶层容器，state 维护 `{sortKey, direction, sortMode}`）；推荐列表头 `aria-pressed` 表示是否 group active。
- C.TEST：`CompareView.test.tsx` ≥7 用例：① 空态；② 矩阵+高亮；③ 默认排序+点表头切换；④ tier4 单 OSNO 列；⑤ 行点击跳 detail；⑥ 平局 "=" 不高亮；**⑦ 点推荐列触发 group sort + 再点恢复**。
- C.IMPL：组件三件 `'use client'`；金额 `font-mono tabular-nums`；表头 `aria-sort`；行 `tabIndex={0}` + Enter 处理；颜色全走 Token。
- C.VERIFY：`pnpm test:run CompareView`、`compare`、`reducer` 绿；`tsc --noEmit` 干净。

### Step D — PRD-07 纯函数层
- D.SPEC：`getDefaultBatchRange(tierId): {min,max}`；`buildSamplePoints({product, expenses, rates, min, max}): SamplePoint[] | {error:'min_eq_max'}`（含 boundaries / boundary+1 防毛刺 / try-catch warn 跳过 / 上限 50 点 / max>10亿截断 / min==max 返回错误标记）。
- D.TEST：`sample.test.ts` ≥9 用例：① tier1 默认 0-2.5亿；② tier4 默认 4.5亿-10亿；③ 范围内只有 1 个边界 → 强制插入；④ 全部 tier1 内 → 无边界；⑤ tier4 跨界采样 → recommended 切为 osno；⑥ revenue=0 不抛错；**⑦ boundary+1 防毛刺；⑧ max>10亿 截断到 10亿；⑨ min==max 返回 `{error:'min_eq_max'}`**。
- D.IMPL：`src/lib/calc/sample.ts` 纯函数；不依赖 React。
- D.VERIFY：单元测试绿。

### Step E — PRD-07 UI 层（含 useDebouncedValue hook）
- E.SPEC：(1) `useDebouncedValue<T>(value, delay=100)` —— `useState + useEffect + setTimeout/clearTimeout`，**真时间维度 debounce**；(2) `BatchRangeControls` 持 `draftMin/draftMax` **本地 useState**（v3 加，避免 snap-back）—— 输入/拖动直接更新 draft **即时反馈 UI**，draft 喂给 `useDebouncedValue(100)` 派生 stableMin/stableMax → useEffect 内 dispatch SET_BATCH_RANGE；额外 sync useEffect **仅在 committed `batchMin/batchMax` props 实际变化时**把 prop 值 sync 回 draft（**v4 修正**：不绑特定 action 来源，深度比较前一次 committed 值；处理诸如外部 reset / 默认范围首次注入等边界，但与 SET_PRODUCT/SET_TIER 行为解耦）；(3) `BatchChart` Recharts LineChart + 两条 Line + ReferenceLine + 自定义 Tooltip；(4) `BatchSimulation` 组装空态 + 控件 + chart + min==max 错误提示。
- E.TEST：(1) `useDebouncedValue.test.ts` `vi.useFakeTimers` 验证 100ms 后稳定 + cleanup + 频繁切换不漏 timer（≥3 用例）；(2) `BatchSimulation.test.tsx` ≥4 用例（empty / 默认范围 / 范围变更后 dispatch / 边界标注）；(3) `BatchRangeControls.test.tsx` ≥3 用例（v3 加：拖动即时反馈不延迟 / 100ms 后才 dispatch / 外部 props 变化时 sync 进 draft）。**测试规范（v4 加）**：fake timers 与 userEvent 一起用时，必须 `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` 或退化到 `fireEvent` + `act(() => vi.advanceTimersByTime(100))`，避免 timer 调度 flake。
- E.IMPL：滑块原生 `<input type="range">` × 2；hook 用 `setTimeout`；不引入 lodash / use-debounce / react-range。
- E.VERIFY：`pnpm test:run BatchSimulation`、`sample`、`useDebouncedValue` 绿。

### Step F — 全量验证 + ResultPanel 测试同步
- F.SPEC：更新 `ResultPanel.test.tsx` 中 "CompareView - 待实现" / "BatchSimulation - 待实现" 文本断言，改为查找新组件标志元素。
- F.IMPL：仅修改测试断言，不改 ResultPanel 组件。
- F.VERIFY：完整三件套：`pnpm tsc --noEmit` + `pnpm lint` + `pnpm test:run` 全绿；预期 173 + ≥34 = **≥207 passing**（v3 修正，含 BatchRangeControls 3 用例）。

---

## 4. 测试计划

### 4.1 新增 / 修改测试文件
- `src/__tests__/unit/calc/compare.test.ts` — 最佳/平局/3 向排序/**group sort**（≥6 用例）。
- `src/__tests__/unit/calc/sample.test.ts` — 默认范围/边界/**boundary+1**/**max>10亿截断**/**min==max 提示**/50 点上限/try-catch（≥9 用例）。
- `src/__tests__/unit/hooks/useDebouncedValue.test.ts` — 100ms 后稳定/cleanup/频繁切换不漏 timer（≥3 用例）。
- `src/__tests__/component/calculator/CompareView.test.tsx` — empty/matrix/排序/tier4/跳转/平局/**group sort**（≥7 用例）。
- `src/__tests__/component/calculator/BatchSimulation.test.tsx` — empty/默认范围/范围变更/边界标注（≥4 用例）。
- `src/__tests__/component/calculator/reducer.test.ts` — 修改：删 BATCH_QUANTITY，加 BATCH_RANGE/默认值/SET_TIER 不重置（净 +2 用例）。
- 7 个 component 测试 buildContext mock 同步（不增不减用例）。

### 4.2 黄金用例沿用
- 5.4 的 6 个税务黄金用例继续在 `engine.test.ts` 和 `DetailView.test.tsx` 跑（不动）。
- CompareView 测试在"渲染 PRD-02 黄金数据"用例中**断言矩阵单元格文本 = `formatRUB(usn6.netProfit)`** 一行确保数字端到端不漂。
- BatchSimulation 测试调真 `calculateTax` 算 expected，不 hard-code。

### 4.3 ResultPanel.test 同步
"CompareView - 待实现" / "BatchSimulation - 待实现" 文本断言改为查找新组件签名（如 `screen.getByRole('table')` / empty state 标题）。

### 4.4 覆盖目标
- 当前：173 passing / 19 files。
- 新增：reducer +2，compare +6，sample +9，useDebouncedValue +3，**BatchRangeControls +3（v3 加）**，CompareView +7，BatchSimulation +4 = +34。
- **目标 ≥ 207 passing / 25 files**（v3 修正，与 §3 Step F 一致）。

---

## 5. 风险点

### 5.1 与 5.4 共享 ViewTabs 容器
- ViewTabs / ResultPanel 已稳定，`SET_VIEW` action 已就位 → 零改动承载新视图。**风险低**。
- ResultPanel.test 中 "待实现" 文本断言失效 → Step F 同步更新。

### 5.2 性能（多品对比 N 个 engine 并行）
- `allProductsCalc` 已在 Provider `useMemo` 内 O(N) 预算，CompareView 不重算。
- 排序/group sort 用 `useMemo([rows, sortKey, dir, sortMode])`。
- BatchSimulation 20-26 点采样 < 5ms（PRD §8.1）。**slider 必须 100ms 真 debounce** 否则每像素一次 calculate（PRD-07 §9.2 红线）。

### 5.3 React 19 / Next.js 16 陷阱
- **'use client'** 必须在 CompareView/CompareTable/CompareCell/BatchSimulation/BatchRangeControls/BatchChart 全标。纯函数 `compare.ts`/`sample.ts` 和 hook `useDebouncedValue.ts` 不标。
- **ResizeObserver**：`src/test-setup.ts` 已全局 stub，**测试内不要重复**；BatchSimulation.test 仍需 `vi.mock('recharts', ...)` stub `LineChart` / `Line` / `ReferenceLine`（这是组件级 mock，与 ResizeObserver 全局 stub 是两层）。
- **真 debounce vs useDeferredValue**：v2 关键修正——PRD-07 要求"100ms"是时间维度，必须用 `setTimeout`，不能用 `useDeferredValue`（后者是优先级调度，无时间保证）。
- **debounce snap-back 反例**（v3 警示）：BatchRangeControls 如果只把 `state.batchMin/batchMax` 直接绑定到滑块/输入框，拖动时 input value 直到 100ms 后才更新 → 视觉感觉滑块"卡住-跳跃"。**必须**用 `draftMin/draftMax` 本地 useState 即时反馈 UI，debounce 后才 dispatch。
- **Compiler render 中读 ref 禁令**：5.4 翻车点，Step 0 预读时复习；BatchChart 如果用 ref 必须放 useEffect。

### 5.4 财务数字红线（§7）
- `compare.ts` / `sample.ts` 不重新实现税计算，**只调** `calculateTax`。
- 平局判定 `Math.abs(a-b) < 0.01`（PRD-06 §9.3 一致；§4.3 文字 "<1 RUB" 需 PRD 作者后续修订或注释）。
- 金额展示 `formatRUB`，百分比 `formatPercent(value, 2)`。
- `font-mono tabular-nums` 强制（§2.1）。
- 颜色全走 Token：高亮 `bg-success-light text-success`，负数 `text-destructive`。**禁止硬编码**。

---

## 6. 复用 / 隔离决策表

| 5.4 已有组件 / 工具 | 5.5 决策 |
|---|---|
| `useCalculatorContext` | **直接复用** |
| `EmptyState` | **直接复用**（CompareView + BatchSimulation 空态都用） |
| `KpiCard` / `KpiCards` | **不用**（PRD-06/07 没 KPI 需求） |
| `format.ts` 颜色函数 | **直接复用**（CompareCell 用色函数） |
| `formatRUB` / `formatPercent` / `cn` | **直接复用** |
| `TaxComparisonChart` | **不用**（PRD-07 是 LineChart） |
| `TaxDetailTable` | **不用**（CompareView 是矩阵） |
| `engine.calculateTax` / `determineTier` / `REVENUE_TIERS` | **直接复用** |
| `DetailView.test` 的 `buildContext` 模式 | **微调复用**（5.5 各测试 inline 一份；不强行抽公共，留 5.7 重构） |
| `src/test-setup.ts` 的 ResizeObserver 全局 stub | **直接复用**（v2 修正：测试内不重复 mock） |

---

## 7. 与 §11.4 场景 C 的衔接

### 7.1 C1 SPEC 审已完成（2026-04-27）✅

**Codex 审核结果**：PASS（overall 8/10），3 方案抉择全部 approve，给出 7 项 v2 修订要求（详见 §8）。

| 抉择 | Codex 结论 |
|---|---|
| 1. batchMin/batchMax 全局 state | ✅ approve |
| 2. 平局阈值 0.01 RUB | ✅ approve（PRD-06 §4.3 "<1 RUB" 与 §9.3 "<0.01" 不一致，按 0.01 统一） |
| 3. 采样 20+boundary+boundary+1 = 23-26 点 | ✅ approve（远低于 50 点性能红线） |

**用户决策（2026-04-27）**：SET_TIER 时 batchMin/batchMax **保留用户编辑值**（B 决策，PRD §6.2 优先）。

> **注**：此为"实施规则 / 用户决策"，**非 PRD-07 字面 MUST HAVE**（v3 标注修正）。建议 PRD-07 §6.2 后续追加一条："SET_TIER 不重置已编辑的销量范围"以消除字面歧义。

### 7.2 C2（终审 diff）应重点关注
1. **Recharts ResizeObserver + 视觉**：BatchChart 在不同 viewport 渲染（生产 min-width 320px，PRD-07 §7.3）—— 让 Codex 跑 chrome-devtools 视觉验证。
2. **真 debounce 实战**：`useDebouncedValue` 在快速拖动滑块下是否漏调用 / 漏 cleanup —— Codex 走 race-condition 思维。
3. **CompareView 行/列双语义点击**：行点击跳 detail，推荐列表头点击 group sort，必须互不冲突；`tabIndex` + Enter 在 row vs th 上的处理一致 —— Codex 走 a11y 红线 + 键盘导航。

---

## 8. v2 修订点（吸收 Codex C1 反馈 + 用户 B 决策，2026-04-27）

| # | severity | 反馈来源 | 修订内容 | 落点 |
|---|---|---|---|---|
| 1 | high | Codex §3 Step E | useDeferredValue → 真 100ms timer debounce hook | §2 新增 useDebouncedValue.ts；§3 Step E |
| 2 | medium | Codex §2 | 删除遗留 `batchQuantity` / `SET_BATCH_QUANTITY` | §2 + §3 Step A |
| 3 | medium | Codex §3 Step A | SET_TIER 不重置 batchMin/batchMax（B 决策） | §1.2 + §2 reducer + §3 Step A |
| 4 | medium | Codex §1.1 | 加 PRD-06 F-4.1 推荐列分组排序 | §1.1 + §2 + §3 Step B/C + §4.1 |
| 5 | medium | Codex §4.1 | 测试补 boundary+1 / 10亿截断 / min==max | §3 Step D.TEST + §4.1 |
| 6 | low | Codex §5.3 | 不重复 mock ResizeObserver（用 test-setup.ts 全局 stub） | §5.3 |
| 7 | low | Codex AGENTS.md | 加 Step 0 预读 next docs | §3 Step 0 + §6 |

**Codex v1 评分**：completeness 8 / feasibility 8 / prd_alignment 8 / risk_coverage 7 / test_strategy 8 / **overall 8** / verdict **PASS**。

### 8.1 v3 修订点（v2 经 Codex 二审 PASS 后吸收 5 个 new issues，2026-04-27）

| # | severity | 反馈来源 | 修订内容 | 落点 |
|---|---|---|---|---|
| 1 | medium | Codex v2 §3 Step E | BatchRangeControls 加 `draftMin/draftMax` 本地 state 防 snap-back + 外部 sync useEffect | §3 Step E + §5.3 + §4.1 BatchRangeControls.test 新增 |
| 2 | low | Codex v2 §3 Step 0 | next docs 路径修正：`02-app/` → `01-app/`；补 use-client / reactCompiler.md 具体路径 | §3 Step 0 |
| 3 | low | Codex v2 §1.2/§7.1 | SET_TIER 不重置标注为"实施规则 / 用户决策"，非 PRD-07 字面 MUST HAVE | §1.2 + §7.1 |
| 4 | low | Codex v2 §3 Step F | 测试目标内部不一致（≥198 vs ≥204）→ 统一改 ≥207（含 BatchRangeControls.test 3 用例） | §3 Step F + §4.4 |
| 5 | low | Codex v2 §3 Step B/C | group sort 组顺序未定义 → 锁定 `USN-6% → USN-15% → OSNO` | §1.1 F-4.1 |

**Codex v2 评分**：completeness 9 / feasibility 8 / prd_alignment 8 / risk_coverage 8 / test_strategy 8 / **overall 8** / verdict **PASS**。
**v2 修订完整性**：7/7 complete。

### 8.2 v4 修订点（v3 经 Codex 三审 PASS 后吸收 3 个 new issues，2026-04-27）

| # | severity | 反馈来源 | 修订内容 | 落点 |
|---|---|---|---|---|
| 1 | medium | Codex v3 §2/§3 Step E | sync useEffect 改为"基于 committed props 实际变化"触发，不绑 SET_PRODUCT/SET_TIER action 来源 | §2 BatchRangeControls 描述 + §3 Step E |
| 2 | low | Codex v3 §3 Step E/§4.1 | 加 fake timers + userEvent 测试规范防 flake | §3 Step E E.TEST |
| 3 | low | Codex v3 §3 Step A/§7.1 | "按 PRD §6.2" 改为"用户 B 决策；PRD-07 §6.2 作为依据"消除 PRD-literal 误读 | §3 Step A |

**Codex v3 评分**：completeness 9 / feasibility 8 / prd_alignment 8 / risk_coverage 8 / test_strategy 8 / **overall 8** / verdict **PASS**。
**v3 修订完整性**：5/5 complete。

### 8.3 v4 通过门槛（按 §11.4 场景 C，SPEC 审已耗尽）
- **C1 SPEC 审三轮全部 PASS**（v1 PASS+7 / v2 PASS+5 / v3 PASS+3，issues 数量递减表明边际收益已耗尽）
- v4 吸收 v3 复审反馈后 **不再走 C1 第 4 轮**（场景 C 设计本意是 SPEC 双审 + phase 终审 C2，不是 SPEC 无限迭代）
- 用户审 v4 → 批准后进 Step 0 + Step A，开始写代码
- C2 在 Step F VERIFY 三件套全绿后触发（phase 完成的终审）

---

## Critical Files for Implementation
- `src/components/calculator/CompareView.tsx`
- `src/components/calculator/BatchSimulation.tsx`
- `src/lib/calc/compare.ts`
- `src/lib/calc/sample.ts`
- `src/lib/hooks/useDebouncedValue.ts`
- `src/contexts/calculator/types.ts`
- `src/contexts/calculator/reducer.ts`
