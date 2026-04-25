# PRD-05: 税制对比视图（DetailView）

| 字段 | 值 |
|------|-----|
| 模块 | Calculator 右侧默认视图：3 KPI + 堆叠柱状图 + 费用明细表 |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Phase 5.4） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q1 / Q2 / Q3（2026-04-24） |
| 预期代码位置 | `src/components/calculator/DetailView.tsx`、`KpiCards.tsx`、`TaxComparisonChart.tsx`、`TaxDetailTable.tsx`、`ResultPanel.tsx` |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
PRD-04 完成了 Calculator 的左侧输入区 + 计算引擎联动，但**右侧结果区仍是占位文字**（"Right Panel — Phase 5.4"）。用户看不到结果，整个产品核心价值无法交付。

### 1.2 产品价值
- **一眼结论**：3 个 KPI 卡片 + 图表让用户 3 秒内获得结论
- **决策依据**：堆叠柱状图直观展示"钱流向了哪种税"
- **数字留痕**：费用明细表提供精确数字可复制/截图汇报老板

### 1.3 业务地位
这是**产品首次交付用户可感知的核心价值**。没有 DetailView，前面所有工作（认证/商品管理/引擎/状态管理）都是基建，用户无感。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：首次使用
> 新用户添加第 1 个商品 → 右侧立即显示 3 KPI（利润率 32% / 总税额 ₽252万 / 净利润 ₽548万）+ 堆叠柱状图对比 USN-6% vs USN-15% + 下方明细表。"原来 USN-15% 还要再交 ₽60万"。

### 场景 2：参数微调
> 用户把"申报成本"从 600 万改成 500 万 → 所有数字实时刷新 → 柱状图的"海关 VAT" 段变短（220 万→ 176 万）→ 净利润增加。

### 场景 3：档位跳变
> 用户把营业额从 1000 万（tier1）改成 3 亿（tier3）→ 图表自动显示附加 VAT 段（之前是 0）→ 总税额跳涨。

### 场景 4：档位 4 单视图
> 用户切到 tier4（强制 OSNO）→ 图表只剩 1 根柱子 + 推荐标签显示"仅 OSNO 适用"。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（⏳ 待实现）

| # | 功能 | 组件 |
|---|------|------|
| F-1 | 3 KPI 卡片：利润率 / 总税额 / 净利润（**Q1 决策**） | `KpiCards` |
| F-2 | 堆叠柱状图：3 段（海关VAT / 收入或利润税 / 附加VAT）（**Q2 决策**） | `TaxComparisonChart` |
| F-3 | 费用明细表：税种为行 + 税制为列 + 总计行 + ⭐标记推荐（**Q3 决策**） | `TaxDetailTable` |
| F-4 | ViewTabs 容器（3 个 tab 切换容器） | `ViewTabs` |
| F-5 | 空态提示："请先选择商品" | `DetailView` |
| F-6 | tier4 单税制适配：图表单柱、KPI 显示 OSNO 值 | `TaxComparisonChart` + `KpiCards` |

### 3.2 不做（Out of Scope）
- ❌ KPI 下方的 sparkline（DEVELOPMENT_STRATEGY 已明确移除）
- ❌ 图表交互（hover tooltip 之外的操作，如点击段切换筛选）
- ❌ 导出 PNG/PDF（v0.2.0 候选）
- ❌ 动画（禁止 CSS `transition: all`）

---

## 4. 业务规则

### 4.1 KPI 卡片（**Q1 决策：A 经典三件套**）

| 卡片 | 来源字段 | 格式 | 特殊规则 |
|------|---------|------|---------|
| **利润率** | 推荐税制的 `profitMargin` | `XX.XX%`（2 位小数） | 负数时红色，≥20% 时绿色 |
| **总税额** | 推荐税制的 `totalTax` | `₽X,XXX,XXX`（千分隔 2 位小数） | — |
| **净利润** | 推荐税制的 `netProfit` | `₽X,XXX,XXX` | 负数时红色 |

- "推荐税制"来源于 `calcOutput.recommended`（计算引擎返回）
- tier4 时 3 个 KPI 都取 OSNO 值（唯一税制即推荐）
- 字号：32px（DEVELOPMENT_STRATEGY §2.2 KPI 规范）
- 字体：`font-mono` + `font-weight: 700` + `letter-spacing: -1.5px`

### 4.2 堆叠柱状图（**Q2 决策：B 堆叠柱状图**）

**柱子结构**：
- 每个柱子 = 一个税制的 `totalTax`
- 柱子自底向上分 3 段：
  1. `customsVat`（海关增值税，橙色 `--color-warning`）
  2. `incomeTax`（USN-6% 的收入税 / USN-15% 的利润税 / OSNO 的企业所得税，蓝色 `--color-primary`）
  3. `additionalVat`（附加增值税，紫色 `--color-info`）

**数量**：
- tier1-3：2 根柱子（USN-6% + USN-15%）
- tier4：1 根柱子（OSNO）

**推荐标记**：
- 推荐税制的柱子顶部加 ⭐ 图标 + 文字 "推荐"
- 推荐税制柱子描边：`--color-success`

**图表库**：Recharts `<BarChart>` + `<Bar stackId="a">`

**尺寸**：
- 桌面：高度 240px，宽度 flex
- 移动端：高度 200px，宽度 100%
- 内边距 20px，圆角 10px（DEVELOPMENT_STRATEGY §2.2 卡片规范）

**悬停交互**：
- Tooltip 显示：税制名 / 3 段税额（税种 + 数字）/ 总税额 / 该税制净利润

### 4.3 费用明细表（**Q3 决策：B 税种为行**）

**表格结构**（tier1-3 形态）：
| 税种 | USN-6% ⭐ | USN-15% |
|------|---------:|--------:|
| 海关增值税 | `customsVat` | `customsVat` |
| 收入/利润税 | `incomeTax` | `incomeTax` |
| 附加增值税 | `additionalVat` | `additionalVat` |
| **总税** | **totalTax** | **totalTax** |
| 税负率 | `taxRate (%)` | `taxRate (%)` |
| 净利润 | `netProfit` | `netProfit` |
| 利润率 | `profitMargin (%)` | `profitMargin (%)` |

**tier4 形态**：单列 OSNO。

**样式**：
- 表头：10px 大写 + muted 色
- 数据列：`font-mono` + 右对齐
- 总计行：`font-weight: 700` + 上边框加粗（2px）
- 推荐税制列头：加 ⭐ 图标 + 背景 `bg-success-light`

**"收入/利润税"的动态名称**：
- USN-6% 对应列显示"收入税"
- USN-15% 对应列显示"利润税"
- OSNO 对应列显示"所得税"
- 当使用 B 布局时，由于每税制有自己的含义，标签处理为"收入/利润/所得税"单元格 tooltip 注明

### 4.4 ResultPanel 的视图路由
```ts
const views: Record<ActiveView, ReactNode> = {
  detail: <DetailView />,
  compare: <CompareView />,   // PRD-06
  batch: <BatchSimulation />, // PRD-07
};
return views[state.activeView] ?? <DetailView />;
```

### 4.5 空态规则
| 状态 | 显示 |
|------|------|
| `currentProduct === null` | 居中提示"请先选择或添加商品" + 图标 |
| `revenue === 0` | 正常显示（税为 0，KPI 显示 0%，图表柱子为 0 高度） |
| 计算结果异常（`results.length === 0`） | 显示"无可用税制，请检查档位设置" |

---

## 5. 交互细节

### 5.1 组件树
```
ResultPanel（Client Component）
└── ViewTabs
    ├── [tab: 税制对比] DetailView ← 默认
    │   ├── KpiCards
    │   │   ├── KpiCard（利润率）
    │   │   ├── KpiCard（总税额）
    │   │   └── KpiCard（净利润）
    │   ├── TaxComparisonChart（Recharts）
    │   └── TaxDetailTable
    ├── [tab: 多品对比] CompareView（PRD-06）
    └── [tab: 批量模拟] BatchSimulation（PRD-07）
```

### 5.2 ViewTabs 视觉
- 外框 `border + radius-md`
- 活跃 tab `bg-primary + text-white + font-weight: 600`
- 非活跃 tab `bg-surface + text-tertiary`
- 切换通过 `dispatch({ type: 'SET_VIEW', view })`

### 5.3 KPI 卡片视觉
- 3 卡片等宽排布，右侧带 1px 分隔线（除最后一个）
- 卡片内：小标签（13px muted）+ 大数字（32px mono bold）
- 响应式 ≤640px 三卡片堆叠为 1 列

### 5.4 图表交互
- 默认渲染带动画（Recharts 默认 `isAnimationActive={true}`，**仅限首次渲染**；后续参数变化不触发动画避免眩晕）
- Hover 显示 Tooltip（Recharts 自带）
- 图例在图表下方居中

### 5.5 明细表交互
- 默认不排序，按业务顺序（海关/收入/附加/总计/税率/净利/利润率）
- 可复制：用户选中单元格能 Ctrl+C
- 移动端横向滚动（`overflow-x: auto`）

---

## 6. 数据契约

### 6.1 组件输入来源
全部从 `useCalculatorContext()` 取：
```ts
const { calcOutput, currentProduct, state } = useCalculatorContext();

// KpiCards 输入
const recommended = calcOutput?.results.find(r => r.regime === calcOutput.recommended);
// → { profitMargin, totalTax, netProfit }

// TaxComparisonChart 输入
const chartData = calcOutput?.results.map(r => ({
  regime: TAX_REGIMES[r.regime].name,
  customsVat: r.customsVat,
  incomeTax: r.incomeTax,
  additionalVat: r.additionalVat,
  isRecommended: r.regime === calcOutput.recommended,
}));

// TaxDetailTable 输入
const tableData = calcOutput?.results; // TaxCalcResult[]
```

### 6.2 无新增 DB schema
本 PRD 纯展示层，不涉及 DB 表/列/migration。

---

## 7. 验收标准（Definition of Done）

### 7.1 功能验收
- [ ] 右侧默认显示 DetailView（其他 2 个 tab 由 PRD-06/07 实现）
- [ ] KPI 卡片 3 个指标：利润率 / 总税额 / 净利润，取推荐税制的值
- [ ] tier1-3 时图表显示 2 根柱子，每柱 3 段颜色
- [ ] tier4 时图表显示 1 根柱子（OSNO）
- [ ] 推荐税制柱顶 ⭐ + "推荐"标签
- [ ] 明细表税种为行，推荐列加 ⭐ 和 `bg-success-light`
- [ ] 总计行加粗 + 上边框 2px
- [ ] 空态：无选中商品显示"请先选择商品"

### 7.2 数值正确性验收（**硬门槛**）
- [ ] 用 PRD-02 的 6 个黄金用例在 UI 上打开 → KPI 数字与单测断言一致
- [ ] 图表 hover tooltip 显示的 3 段数字与明细表一致
- [ ] 明细表"总税"行 = 3 段之和（允许 ±0.01 浮点误差）

### 7.3 响应式验收
- [ ] 桌面 >1024px：KPI 3 列 + 图表 240px + 表格原宽
- [ ] 平板 641-1024px：KPI 3 列（字号变小）+ 图表 200px
- [ ] 手机 ≤640px：KPI 1 列堆叠 + 图表 200px + 表格横向滚动

### 7.4 测试验收
- [ ] `src/__tests__/component/calculator/DetailView.test.tsx` ≥ 5 用例通过
- [ ] `KpiCards.test.tsx` / `TaxComparisonChart.test.tsx` / `TaxDetailTable.test.tsx` 各有基础渲染测试
- [ ] 测试覆盖：有 `calcOutput` / 无 `calcOutput` / tier4 单税制 三种场景

---

## 8. 非功能需求

### 8.1 性能
- KPI 卡片渲染：< 10ms
- Recharts 图表首次渲染 < 100ms，参数变化重渲 < 50ms
- 整个 DetailView rerender（输入变化到视觉更新）< 80ms

### 8.2 可访问性
- KPI 卡片用 `<dl>`（描述列表）或 `role="group" aria-label="关键指标"`
- 图表用 `role="img" aria-label="税制对比柱状图"`
- 明细表用标准 `<table>` + `<thead><tbody>` 结构
- 颜色不作为唯一信息载体（⭐ 图标 + 色彩共同标记推荐）

### 8.3 视觉
- 严格遵循 DEVELOPMENT_STRATEGY §2.1 Design Tokens
- KPI 卡片 ≈ DEVELOPMENT_STRATEGY §2.2 规范（32px 字号 + mono + 右侧分隔线）
- 图表卡片容器：`--radius-lg` + `--shadow-sm`

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-02 计算引擎（`calcOutput`）
- PRD-04 Context（`state` + `currentProduct` + `calcOutput`）
- Recharts（需 `pnpm add recharts`，DEVELOPMENT_STRATEGY 已规划）
- shadcn/ui `Tabs` 组件（需 `npx shadcn@latest add tabs`）

### 9.2 技术约束
- **必须** 使用 Design Tokens（禁止硬编码颜色）
- **必须** 数字字段 `font-mono`
- **禁止** CSS `transition: all`（指定具体属性）
- **禁止** 图表内部维护状态（Recharts 自身状态除外）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| Recharts SSR 问题 | Medium | Recharts 是 Client-only，组件标记 `'use client'` |
| 小屏图表可读性差 | Low | 设置 `min-width`，溢出横向滚动 |
| 数字过长溢出卡片 | Low | `overflow: hidden` + `text-overflow: ellipsis`，tooltip 显示完整值 |
| tier4 单柱子视觉单薄 | Low | 加辅助文字 "营业额 >4.5 亿，强制适用 OSNO" |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.4
- 架构设计：`docs/plans/2026-03-28-step5-calculator-frontend-design.md`
- 头脑风暴记录：`.superpowers/brainstorm/1345-1776990206/content/*.html`
- 上游 PRD：PRD-02 核心计算引擎 / PRD-04 成本测算工作台
