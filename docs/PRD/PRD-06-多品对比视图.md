# PRD-06: 多品对比视图（CompareView）

| 字段 | 值 |
|------|-----|
| 模块 | Calculator 右侧第 2 个 tab：N 商品 × M 税制矩阵 |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Phase 5.5） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q4 / Q5（2026-04-24） |
| 预期代码位置 | `src/components/calculator/CompareView.tsx` |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
卖家常同时运营多个 SKU。PRD-05 的 DetailView 一次只能看**一个商品**，回答"这个商品选哪个税制"；但无法回答：
- "我这 5 个商品，哪个最赚？"
- "同一套支出分摊下，谁该主推谁该砍？"
- "每个商品的最优税制是一样的吗？"

### 1.2 产品价值
- **横向决策**：一屏看完所有商品的盈利对比
- **结构洞察**：发现"小众商品利润率反而高"这类反直觉结论
- **主推决策支撑**：为老板汇报"哪个 SKU 值得加大广告投入"提供依据

### 1.3 业务地位
对比视图是 PRD-05 的"广角镜头"，二者分工：
- **DetailView（PRD-05）**：单品深度，回答 "how"（这个商品怎么最优）
- **CompareView（本 PRD）**：多品广度，回答 "which"（哪个商品最优）

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：经营复盘
> 用户年底复盘：录入 8 个商品 → 切换到"多品对比" tab → 按"净利润"排序 → 发现 3 个商品贡献了 80% 净利 → 决定下一年砍掉底部 3 个长尾 SKU。

### 场景 2：推广决策
> 用户准备双 12 大促：把 5 个候选商品录入 → 切换到多品对比 → 一眼看到"蓝牙耳机"利润率 29% 最高 → 决定主推耳机。

### 场景 3：税制一致性确认
> 用户之前单个商品测算时都选 USN-6%，切到多品对比 → 发现其中 2 个商品其实 USN-15% 更优 → 调整注册税制时纳入考量。

### 场景 4：空态（<2 商品）
> 新用户只有 1 个商品 → 切到多品对比 → 显示空态："至少添加 2 个商品才能对比"+ 快捷"去添加"按钮回到 ProductManager。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（⏳ 待实现）

| # | 功能 |
|---|------|
| F-1 | 矩阵表格：商品为行 × 税制为列（**Q4 决策**） |
| F-2 | 单元格双行显示：大字净利润 + 小字利润率（**Q5 决策**） |
| F-3 | 每行的最优单元格高亮：`bg-success-light` + `text-success` + `font-weight: 700` |
| F-4 | "推荐税制"列（最右一列，显示 USN-6% / USN-15% / OSNO 之一） |
| F-5 | 表头可点击排序（当前指标降序）—— 默认按净利润降序 |
| F-6 | 行点击跳转 DetailView 并 `dispatch({ type: 'SET_PRODUCT', productId })` |
| F-7 | 空态："至少添加 2 个商品才能对比" + "去添加"按钮 |
| F-8 | 商品缩略标识：emoji + 名称（首列） |

### 3.2 不做（Out of Scope）
- ❌ 列排序（列固定为 USN-6% / USN-15% / 推荐）
- ❌ 批量操作（v0.2.0 候选，如"批量切换税制"）
- ❌ 按商品分组折叠（商品太少时不需要）
- ❌ 导出 CSV（v0.2.0 候选）

---

## 4. 业务规则

### 4.1 矩阵方向（**Q4 决策：A 商品为行**）

**主视图**：
```
| 商品              | USN-6%         | USN-15%       | 推荐税制 |
| 📱 智能音箱       | ₽8,240 (41%) ⭐| ₽7,120 (36%)  | USN-6%   |
| 🎧 蓝牙耳机       | ₽5,100 (26%)   | ₽5,890 (29%) ⭐| USN-15%  |
| 💼 帆布包         | ₽2,300 (12%)   | ₽2,450 (12%) ⭐| USN-15%  |
```

**tier4 时**：
```
| 商品        | OSNO ⭐        | 推荐税制 |
| 📱音箱      | ₽7,500 (38%)   | OSNO     |
```
（单税制列，推荐列永远显示 OSNO）

### 4.2 单元格显示（**Q5 决策：D 双行**）

每个单元格两行：
- **第 1 行（大字）**：净利润 `₽X,XXX`（`font-mono font-weight:700 font-size:14px`）
- **第 2 行（小字）**：利润率 `XX.XX%`（`font-mono font-size:10px color-muted`）

**符号规则**：
- 负数用红色 `--color-destructive`
- 最高值加 ⭐ 后缀 + 绿色 + 轻背景高亮

### 4.3 "最优"标记规则（**每行**）
- 对每个商品，比较该行所有税制的 `netProfit`
- **净利润最高者**高亮（单元格背景 `bg-success-light` + `text-success` + `font-weight:700` + ⭐ 后缀）
- **打平规则**：如果两个税制 `netProfit` 差距 < 1 卢布（浮点误差），都不高亮，改用 "="

### 4.4 "推荐税制"列
- 来源：`allProductsCalc.get(productId).recommended`
- 显示：税制名 + 简写，如 "USN-6%"
- 无选中商品时此列为"—"
- 点击该列可按推荐税制分组排序（点第二次取消分组）

### 4.5 排序规则
- 默认：按"USN-6%"列的净利润降序（第 1 列最高的在最上）
- 点击列头：按该列净利润降序（再点升序，再点恢复默认）
- tier4 只有 OSNO 列可排序

### 4.6 交互规则
- **单击行**：`dispatch({ type: 'SET_PRODUCT', productId })` + `dispatch({ type: 'SET_VIEW', view: 'detail' })` → 跳回 DetailView 聚焦该商品
- **鼠标悬停行**：`bg-primary-light` 浅蓝色
- **键盘**：Tab 进入 + Enter 触发 "跳转 DetailView"

### 4.7 空态（< 2 商品）
```
┌────────────────────────────────────────┐
│   📊                                    │
│                                         │
│   至少添加 2 个商品才能对比             │
│                                         │
│   [去添加商品]  ← 点击聚焦 ProductManager│
└────────────────────────────────────────┘
```

---

## 5. 交互细节

### 5.1 组件结构
```
CompareView（Client Component）
├── 空态（products.length < 2）
│   └── EmptyState
└── 正常态
    ├── 表头（商品 | USN-6% | USN-15% | 推荐）
    ├── 表体（map products → <tr>）
    └── 可选：底部"合计"行（每列净利润之和）
```

### 5.2 表格样式
- 表头 10px 大写 muted，点击变 primary
- 排序列头加箭头图标（↑↓）
- 行分隔线 `1px solid --color-border-light`
- 行高 ≈ 48px（双行单元格 + padding）
- 数字列右对齐 + `font-mono`

### 5.3 响应式
- 桌面：所有列展开显示
- 平板：单元格字号缩小（14px → 12px）
- 手机：表格溢出 `overflow-x: auto`，首列 sticky left（商品名永远可见）

### 5.4 动画
- 表格首次渲染 `fadeUp` 动画（DEVELOPMENT_STRATEGY §2.4）
- 排序切换不加动画（Recharts/表格抖动影响体验）
- 高亮变化时 200ms 颜色过渡

---

## 6. 数据契约

### 6.1 数据来源
```ts
const { state, allProductsCalc } = useCalculatorContext();
// state.products: Product[]
// allProductsCalc: Map<productId, CalcOutput>

// 派生：每行的数据
const rows = state.products.map(product => {
  const calc = allProductsCalc.get(product.id);
  if (!calc) return null;
  
  return {
    product,                                              // 首列
    byRegime: calc.results.reduce<Record<TaxRegimeId, TaxCalcResult>>(
      (acc, r) => ({ ...acc, [r.regime]: r }),
      {}
    ),
    recommended: calc.recommended,
  };
}).filter(isNonNull);
```

### 6.2 无新增 DB schema
纯展示层，不涉及 DB。

### 6.3 性能考量
- `allProductsCalc` 已在 `CalculatorProvider` 的 `useMemo` 里预算
- N 个商品每次 rerender 计算复杂度 O(N)，N < 50 无感
- 排序用 `useMemo(() => rows.sort(...), [rows, sortKey])`

---

## 7. 验收标准（Definition of Done）

### 7.1 功能验收
- [ ] 切换到"多品对比" tab 显示 CompareView
- [ ] 表格首列商品 emoji + 名称，后面 N-1 列是税制
- [ ] 每单元格双行：净利润 + 利润率
- [ ] 每行最优单元格高亮：绿色 + ⭐ + `bg-success-light`
- [ ] 推荐税制列正确显示 `calcOutput.recommended`
- [ ] 表头点击排序：默认 USN-6% 降序，点击切换
- [ ] 点击行 → 跳 DetailView + 选中该商品
- [ ] 商品 < 2 时显示空态 + 跳转按钮
- [ ] tier4 时只有 OSNO 列

### 7.2 数值正确性
- [ ] 每行的"推荐"单元格与 `calcOutput.recommended` 一致
- [ ] 高亮单元格的净利润确实是该行最大值
- [ ] 与 DetailView 数字一致（同商品，同税制）

### 7.3 响应式验收
- [ ] 桌面所有列可见
- [ ] 手机可横向滚动，首列 sticky
- [ ] 平板字号自适应

### 7.4 测试验收
- [ ] `src/__tests__/component/calculator/CompareView.test.tsx` ≥ 4 用例
- [ ] 测试场景：2 商品 × 2 税制 / 5 商品 × 2 税制 / tier4 单税制 / 空态（0 和 1 商品）

---

## 8. 非功能需求

### 8.1 性能
- 10 商品渲染 < 50ms
- 50 商品渲染 < 200ms（考虑 v0.2.0 加虚拟滚动）
- 排序 < 10ms

### 8.2 可访问性
- 标准 `<table>` + `<thead>/<tbody>` 结构
- 表头 `<th scope="col">` + 点击排序有 `aria-sort="ascending"` 等状态
- 行可聚焦 `tabIndex={0}`，Enter 触发
- 颜色不作唯一标记（⭐ + 色彩共同传达最优）

### 8.3 视觉
- 高亮色与 DetailView 推荐标记保持一致（都是 success 绿系）
- 表格风格遵循 DEVELOPMENT_STRATEGY §2.2 表格规范

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-02 计算引擎（`calculateTax`）
- PRD-04 Context（`state.products` + `allProductsCalc`）
- PRD-05 DetailView（点击跳转目标）

### 9.2 技术约束
- **必须** 用 `allProductsCalc`（已在 Provider 层预算），禁止组件内重复算
- **必须** 排序用 `useMemo` 避免重渲时重排
- **禁止** 直接读写 `state.products`（只通过 dispatch）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 商品 >50 时表格卡 | Medium | v0.2.0 加虚拟滚动（react-window） |
| 手机首列 sticky 兼容性 | Low | iOS Safari 14+ 支持，polyfill 不做 |
| 浮点平局处理不一致 | Low | 统一 `Math.abs(a-b) < 0.01` 判断平局 |
| "推荐税制"列用户误以为强制 | Low | 列头加 tooltip 说明"推荐=税负最低，不强制" |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.5 Task 1-2
- 上游 PRD：PRD-02 / PRD-04 / PRD-05
- 头脑风暴决策：Q4（矩阵方向） + Q5（单元格双行）
