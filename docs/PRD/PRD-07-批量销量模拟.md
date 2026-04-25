# PRD-07: 批量销量模拟（BatchSimulation）

| 字段 | 值 |
|------|-----|
| 模块 | Calculator 右侧第 3 个 tab：销量范围滑块 + 利润/税额曲线图 |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Phase 5.5） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q6（2026-04-24） |
| 预期代码位置 | `src/components/calculator/BatchSimulation.tsx` |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
PRD-05/06 告诉用户"**当前销量下**哪个税制好"，但无法回答**动态问题**：
- "销量翻倍后，税负会不会跳一个档位？"
- "我的盈利从 1 万件到 10 万件，利润曲线是线性还是有拐点？"
- "档位 2→3 的阈值在哪，我距离还有多远？"
- "规模效应到底多大？"

### 1.2 产品价值
- **规划型决策**：支撑融资/年度目标/市场进入等"展望未来"的决策
- **档位预警**：可视化"从 2.5 亿跨到 2.5 亿 001"这种尴尬区间
- **投资回报演示**：给老板/投资人展示曲线更有说服力

### 1.3 业务地位
这是产品从"算账工具"升级为"经营决策工具"的关键功能。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：规模规划
> 创始人准备 A 轮融资 → 切到"批量模拟" → 拖动滑块到 5千–5 亿 → 看到曲线在 2.5 亿处有明显拐点（tier2→tier3 阈值）→ 截图放进 BP → 说服投资人"规模效应可持续"。

### 场景 2：避开尴尬区间
> 卖家年底冲量，距离 tier3（2.5 亿）上限还差 800 万 → 切到批量模拟 → 拖动找 4.5 亿档位切换处 → 发现"越过 4.5 亿强制 OSNO 反而税负增加"→ 决定控制在 4.45 亿内。

### 场景 3：对比两种主推策略
> 策略 A：主推单品冲 3 亿 / 策略 B：多品分散 5 个商品 → 两个商品分别跑批量模拟 → 看哪种策略的曲线更平滑。

### 场景 4：空态
> 无选中商品 → 显示 "请先选择商品再开始模拟"。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（⏳ 待实现）

| # | 功能 |
|---|------|
| F-1 | 双端滑块：销量下限 + 销量上限（**Q6 决策**） |
| F-2 | Recharts `<LineChart>` 折线图：净利润曲线 + 总税额曲线 |
| F-3 | 档位跳变标注：垂直虚线 + 标签（如 "tier1→tier2"） |
| F-4 | 滑块联动：拖动实时刷新曲线（debounce 100ms） |
| F-5 | X 轴：销量（营业额卢布，非件数） |
| F-6 | Y 轴：金额（卢布） |
| F-7 | 默认范围：当前档位下限 – 下一档位上限（覆盖当前 + 下个档位） |
| F-8 | 手动输入框：滑块两侧提供精确数字输入 |
| F-9 | 空态：无选中商品时提示 |
| F-10 | 采样逻辑：20 个点（首尾 + 档位边界 + 均匀分布） |

### 3.2 不做（Out of Scope）
- ❌ 多税制对比曲线叠加（只显示推荐税制的曲线，防视觉噪声）
- ❌ 历史销量时间序列（"过去 12 个月利润"——v0.2.0）
- ❌ 导出图片（v0.2.0）
- ❌ 保存模拟方案（v0.2.0 或 PRD-08 扩展）

---

## 4. 业务规则

### 4.1 输入控件（**Q6 决策：C 销量范围 + 曲线**）

**双端滑块**：
- 左滑块 = 下限
- 右滑块 = 上限
- 约束：`min ≤ max - 1000`（至少跨度 1000 卢布）
- 总范围：0 – 10 亿卢布（覆盖所有档位 + 缓冲）

**精确输入**：
- 两侧各一个 `<input type="number">`，用户可以直接键入精确值
- 输入后滑块位置同步

**默认范围**：
- 进入页面时根据当前档位自动设：
  - tier1：0 – 2.5 亿（覆盖 tier1 + tier2）
  - tier2：0 – 4.5 亿（覆盖到 tier4 边界）
  - tier3：2.5 亿 – 10 亿
  - tier4：4.5 亿 – 10 亿

### 4.2 曲线计算

**采样策略**：
- 20 个采样点均匀分布在 [min, max]
- **强制插入**档位边界点：2000 万 / 2.5 亿 / 4.5 亿（如果落在范围内）
- 每个采样点调用 `calculateTax({ ...input, revenue: samplePoint })` 获取结果

**两条线**：
1. **净利润线**（绿色 `--color-success`）：y = `recommended.netProfit`
2. **总税额线**（红色 `--color-destructive`）：y = `recommended.totalTax`

**推荐税制**：每个采样点独立判断（因为档位切换会改变最优税制）

### 4.3 档位跳变标注

- 档位边界（2000万 / 2.5亿 / 4.5亿）落在范围内时：
  - 画垂直虚线 `stroke-dasharray: 4,4`
  - 顶部标签：`tier1 → tier2`（样式 `text-tertiary` + 10px）
  - tier3 → tier4 的 4.5 亿虚线额外红色，标签 `→ OSNO 强制`

### 4.4 图表交互
- Hover 显示 tooltip：销量 / 推荐税制 / 净利润 / 总税额 / 利润率
- 图例：绿色="净利润" 红色="总税额"
- 无交互：不支持缩放、拖动、双击（避免复杂度爆炸）

### 4.5 空态与边界
| 情形 | 行为 |
|------|------|
| 无选中商品 | 显示 "请先选择商品再开始模拟" |
| min == max（滑块贴在一起） | 曲线变单点，提示 "请扩大销量范围" |
| 范围跨度 > 10 亿 | 自动截断到 10 亿（性能保护） |
| 某点计算抛错 | 跳过该点，曲线连接相邻点；控制台打 warning |

### 4.6 数据持久化
- 模拟参数（min/max）**不持久化**（只在 Context state）
- 离开 tab 再回来保留本次输入
- 页面刷新重置（与 PRD-04 的持久化规则一致）

---

## 5. 交互细节

### 5.1 组件结构
```
BatchSimulation（Client Component）
├── 空态（currentProduct === null）
└── 正常态
    ├── 范围控制栏
    │   ├── 下限输入框
    │   ├── 双端滑块
    │   └── 上限输入框
    ├── LineChart（Recharts）
    │   ├── 净利润曲线（绿）
    │   ├── 总税额曲线（红）
    │   └── 档位边界虚线（ReferenceLine）
    └── 信息栏（采样点数、计算耗时）
```

### 5.2 滑块视觉
- 轨道：`--color-border-light` 4px 高
- 激活段：`--color-primary`（两滑块之间）
- 滑块手柄：12px 圆 + `--color-primary`
- 拖动阴影：`--shadow-sm`

### 5.3 响应式
- 桌面：图表高度 280px
- 平板：240px
- 手机：200px + 滑块移到图表下方（占宽更紧凑）

### 5.4 性能优化
- 滑块拖动用 `useDeferredValue` + 100ms debounce，避免每像素触发重算
- `useMemo` 缓存采样点计算（依赖 product + range + expenses + rates）
- 采样计算在主线程同步（20 点 <5ms）

---

## 6. 数据契约

### 6.1 输入来源
```ts
const { state, currentProduct, dispatch } = useCalculatorContext();
// state.batchMin, state.batchMax（需要新增到 state）

// 派生：采样点
const samplePoints = useMemo(() => {
  if (!currentProduct) return [];
  const boundaries = [20_000_000, 250_000_000, 450_000_000]
    .filter(b => b >= state.batchMin && b <= state.batchMax);
  const uniform = Array.from({ length: 20 }, (_, i) =>
    state.batchMin + (state.batchMax - state.batchMin) * (i / 19)
  );
  const all = [...uniform, ...boundaries].sort((a, b) => a - b);
  return all.map(revenue => {
    const calc = calculateTax({
      product: currentProduct,
      tier: determineTier(revenue).id,
      revenue,
      expenses: state.expenses,
      rates: state.rates,
    });
    const rec = calc.results.find(r => r.regime === calc.recommended)!;
    return {
      revenue,
      netProfit: rec.netProfit,
      totalTax: rec.totalTax,
      regime: calc.recommended,
      tier: calc.tier.id,
    };
  });
}, [currentProduct, state.batchMin, state.batchMax, state.expenses, state.rates]);
```

### 6.2 State 扩展
需在 `src/contexts/calculator/types.ts` 增加：
```ts
interface CalculatorState {
  // ...
  batchMin: number;
  batchMax: number;
}

type CalculatorAction =
  // ...
  | { type: 'SET_BATCH_RANGE'; min: number; max: number };
```

### 6.3 无新增 DB schema

---

## 7. 验收标准（Definition of Done）

### 7.1 功能验收
- [ ] 切换到"批量模拟" tab 显示 BatchSimulation
- [ ] 双端滑块可拖动，对应曲线实时更新
- [ ] 两条曲线（净利润绿 / 总税额红）正确绘制
- [ ] 档位边界画虚线 + 标签
- [ ] 精确输入框和滑块位置联动
- [ ] 默认范围根据当前档位自动计算
- [ ] 无选中商品时显示空态
- [ ] 范围 > 10 亿自动截断

### 7.2 数值正确性
- [ ] 任一采样点的净利润 / 总税额 与 DetailView 用相同 `revenue` 算的一致
- [ ] 档位跳变处曲线连续（不跳跃——除非真有不连续的税制切换）
- [ ] tier3 → tier4（4.5 亿）处应该能看到**推荐税制切换**导致曲线斜率变化

### 7.3 响应式验收
- [ ] 桌面/平板/手机三种屏幕下滑块可拖动
- [ ] 图表容器不溢出（`min-width: 320px`）

### 7.4 测试验收
- [ ] `src/__tests__/component/calculator/BatchSimulation.test.tsx` ≥ 4 用例
- [ ] 场景：空态 / 默认范围 / 手动改范围 / 档位跳变渲染

---

## 8. 非功能需求

### 8.1 性能
- 拖动滑块到曲线重绘 < 200ms（含 debounce）
- 20 点采样计算 < 5ms
- Recharts 重绘 < 50ms

### 8.2 可访问性
- 滑块 `role="slider"` + `aria-valuemin/max/now`
- 图表 `role="img" aria-label="销量与净利润关系曲线"`
- 键盘：滑块可聚焦后用方向键微调（每次 100,000 卢布）

### 8.3 视觉
- 绿/红曲线对比符合直觉（钱/税）
- 档位虚线 + 标签不抢主视觉

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-02 计算引擎
- PRD-04 Context（需扩展 `batchMin/batchMax`）
- PRD-05 DetailView（共用 `recommended` 逻辑）
- Recharts `<LineChart>` + `<ReferenceLine>`

### 9.2 技术约束
- **必须** 采样点强制包含档位边界（否则曲线在边界处会出错误插值）
- **必须** debounce 滑块事件（否则每像素一次计算）
- **禁止** 采样点 > 50（性能考虑）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 边界处 `determineTier` 逻辑（2000万001 才算 tier2）导致曲线毛刺 | Medium | 采样点额外插入 `boundary` 和 `boundary+1` 两点 |
| 大范围滑动时滑块手柄遮挡 | Low | 手柄尺寸不放大，拖动时放大 1.2x |
| 曲线在 tier4 边界跳跃太大 | Low | Tooltip 明确提示 "tier4 强制 OSNO" |
| 用户理解不了"推荐税制会变" | Medium | Tooltip 显示"当前推荐: USN-15%"；档位虚线标签补一句 |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.5 Task 3-4
- 上游 PRD：PRD-02（计算引擎）/ PRD-04（Context）/ PRD-05（KPI 公式）
- 头脑风暴决策：Q6（销量范围 + 曲线）
