# PRD-02: 核心计算引擎（三税制对比引擎）

| 字段 | 值 |
|------|-----|
| 模块 | 税制计算引擎、档位判定、策略调度 |
| 版本 | v0.1.0 |
| 状态 | ✅ 已实现（Step 2 完成，6 个黄金用例全绿） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 代码入口 | `src/lib/calc/engine.ts`、`src/lib/calc/types.ts` |
| 测试 | `src/__tests__/unit/calc/engine.test.ts`（含 6 个黄金用例） |
| 业务依据 | 《税制解说（内部版）》PDF 第 2-7 页 |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
跨境电商卖家在俄罗斯**不是自由选税制**，而是受营业额限制 + 可在规则内选择最优：
- **营业额 ≤4.5 亿卢布**：可在 USN-6%（按收入交） vs USN-15%（按利润交）之间选
- **营业额 >4.5 亿卢布**：**强制 OSNO** 一般税制

不同税制的核心差异：
| 税制 | 核心税种 | 税基 | 适用场景 |
|------|--------|------|---------|
| **USN-6%** | 海关 VAT 22% + 收入税 6% | 按营业额 | 成本低、利润高（如数码产品） |
| **USN-15%** | 海关 VAT 22% + 利润税 15% | 按(收入-支出) | 成本高、利润低（如大件家居） |
| **OSNO** | 海关 VAT 22% + 税务局 VAT + 利润税 25% | 按利润 | 强制适用（大卖家） |

### 1.2 产品价值
**给定营收、支出、商品申报成本，秒算 3 种税制对比，推荐税负最低方案**。引擎是整个产品的心脏，UI 层（PRD-04~07）都只是它的外壳。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：新卖家选税制
> 创业者在申请"俄罗斯法人"之前，用工具测算：年营收 2000 万、成本 600 万，USN-6% 税 252 万 vs USN-15% 税 222 万，决定选 USN-15% 注册。

### 场景 2：成熟卖家年度复盘
> 卖家年底复盘，输入实际营收 1 亿、支出 7000 万、申报成本 6000 万，发现 USN-6% 实际税负比当初预期高，下一年考虑切换税制。

### 场景 3：销量增长规划
> 卖家现在营收 3 亿（tier3，可选 USN），明年计划冲 5 亿（tier4 强制 OSNO），引擎能算出税负会从 X 跳到 Y，为规划提供依据。

---

## 3. 功能清单（WHAT）

### 3.1 核心计算能力（✅ 已实现）

| # | 功能 | 输入 | 输出 |
|---|------|------|------|
| F-1 | **档位判定** `determineTier(revenue)` | 营业额（卢布） | `RevenueTier` 对象 |
| F-2 | **USN-6% 计算**（策略对象） | `CalcInput + tier` | `TaxCalcResult`（customsVat, incomeTax, additionalVat, totalTax, taxRate, netProfit, profitMargin） |
| F-3 | **USN-15% 计算**（策略对象） | 同上 | 同上 |
| F-4 | **OSNO 计算**（策略对象） | 同上 | 同上 |
| F-5 | **主函数** `calculateTax(input)` | `CalcInput` | `CalcOutput`（tier + results[] + recommended + headShipping + platformFee + totalExpenses） |
| F-6 | **头程物流费** `calculateHeadShipping(input)` | 商品重量 + 物流方式 + 汇率 | 卢布金额 |
| F-7 | **税制推荐** | 多个 `TaxCalcResult` | `recommended: TaxRegimeId`（totalTax 最低者） |

### 3.2 不做的事（Out of Scope）
- ❌ 不做 STS（另一种俄罗斯简易税制变体，业务上不涉及）
- ❌ 不做个人所得税（适用于自然人，本系统只服务法人）
- ❌ 不做外贸关税（不同商品 HS Code 的关税率由用户在商品信息里手输 `dutyRate`）
- ❌ 不做累进税率（俄罗斯 VAT/USN/OSNO 都是固定比例）

---

## 4. 业务规则（税务逻辑）

### 4.1 营收档位（`REVENUE_TIERS` 常量）

| id | 标签 | 范围（卢布） | VAT 率 | VAT 除数 |
|----|------|-----------|-------|---------|
| `tier1` | ≤2000万（初创期） | 0 – 20,000,000 | 0% | 0 |
| `tier2` | 2000万–2.5亿（成长期） | 20,000,001 – 250,000,000 | 5% | 105 |
| `tier3` | 2.5亿–4.5亿（规模期） | 250,000,001 – 450,000,000 | 7% | 107 |
| `tier4` | >4.5亿（一般税制） | 450,000,001 – ∞ | 0%（VAT 在 OSNO 里单算） | 0 |

> **关键业务规则**：档位不是从 `revenue` 自动推导进入哪种税制，而是**决定附加 VAT 是否启用**。档位 2/3 开启附加 VAT，档位 1/4 不启用。档位 4 直接强制 OSNO。

### 4.2 USN-6% 计算公式
```
customsVat    = declaredCost × 22%                           # 海关增值税
incomeTax     = revenue × 6%                                  # 收入税
additionalVat = tier 2/3 启用: revenue / vatDivisor × (vatDivisor - 100)
              = tier 1/4: 0
totalTax      = customsVat + incomeTax + additionalVat
taxRate       = totalTax / revenue
netProfit     = revenue - totalExpenses - totalTax
profitMargin  = netProfit / revenue
```
**代码**：`src/lib/calc/engine.ts:57-92`

### 4.3 USN-15% 计算公式
```
customsVat    = declaredCost × 22%
profit        = revenue - totalExpenses
incomeTax     = max(profit, 0) × 15%                          # 利润为负时税为 0
additionalVat = 同 USN-6%
totalTax      = customsVat + incomeTax + additionalVat
```
**代码**：`src/lib/calc/engine.ts:94-131`

### 4.4 OSNO 计算公式（最复杂）
```
customsVat          = declaredCost × 22%
taxFreeRevenue      = revenue - revenue / 122 × 22            # 不含 VAT 的收入
taxFreeExpense      = totalExpenses - totalExpenses / 122 × 22
taxableProfit       = taxFreeRevenue - taxFreeExpense
incomeTax           = max(taxableProfit, 0) × 25%             # 企业所得税 25%
revenueVat          = revenue / 122 × 22                      # 销项 VAT
expenseVat          = totalExpenses / 122 × 22                # 进项 VAT
additionalVat       = revenueVat - expenseVat                 # 税务局应缴 VAT
totalTax            = customsVat + incomeTax + additionalVat
```
**代码**：`src/lib/calc/engine.ts:133-171`

### 4.5 头程物流费
```
if shippingMethod == 'east':
  headShipping = weight × 2 × usdPerCny
else (standard):
  headShipping = weight × usdPerCny × 0.6326
```

### 4.6 税制选择规则（`calculateTax` 主函数）
```
if tier == 'tier4':
  只算 OSNO
else:
  算 USN-6% 和 USN-15%，对比

推荐 = results.reduce((best, curr) => curr.totalTax < best.totalTax ? curr : best)
```

### 4.7 精度规则
| 数据 | 精度 | 实现 |
|------|------|------|
| 金额 | 2 位小数 | `round(n, 2)` |
| 税率 / 利润率 | 4 位小数（存储） | `round(rate, 4)` |
| 百分比（展示） | 2 位小数 | UI 层 `toFixed(2)` |
| 四舍五入方式 | 标准 `Math.round` | **禁止** `Math.floor` / `Math.ceil`（会改变业务含义） |

### 4.8 边界与异常规则
| 情形 | 处理 |
|------|------|
| `revenue = 0` | `taxRate = 0`, `profitMargin = 0`（避免除 0） |
| `profit < 0`（USN-15% 亏损） | `incomeTax = 0`（不返税） |
| `taxableProfit < 0`（OSNO 亏损） | `incomeTax = 0` |
| `revenue` 超出 tier4 上限 | `determineTier` 返回最后一个 tier（防止 undefined） |
| `declaredCost = 0` | 海关 VAT = 0（虽然业务上几乎不可能，但引擎允许） |

---

## 5. 数据契约

### 5.1 输入 `CalcInput`
```ts
interface CalcInput {
  product: Product;            // 商品（含 declaredCost / platformPrice / weight / rates）
  tier: TierId;                // 'tier1' | 'tier2' | 'tier3' | 'tier4'
  revenue: number;              // 年度营业额（卢布）
  expenses: Expenses;           // 五项支出
  rates: ExchangeRates;         // 汇率
}

interface Expenses {
  procurement: number;          // 进货成本
  logistics: number;            // 物流费
  commission: number;           // 平台佣金
  advertising: number;          // 广告费
  labor: number;                // 人工成本
}
```

### 5.2 输出 `CalcOutput`
```ts
interface CalcOutput {
  tier: RevenueTier;            // 当前档位详情
  results: TaxCalcResult[];     // 1~2 个税制结果
  recommended: TaxRegimeId;     // 税负最低的税制
  headShipping: number;         // 头程物流费（卢布）
  platformFee: number;          // 平台佣金（卢布）
  totalExpenses: number;        // 五项支出合计
}

interface TaxCalcResult {
  regime: TaxRegimeId;
  customsVat: number;
  incomeTax: number;
  additionalVat: number;
  totalTax: number;
  taxRate: number;              // 0-1，如 0.126 = 12.6%
  netProfit: number;
  profitMargin: number;         // 0-1
}
```

---

## 6. 验收标准（Definition of Done）

### 6.1 黄金测试用例（6 个，来自《税制解说》PDF，**不允许跳过**）

| # | 税制 | 档位 | 输入（营业额 / 申报成本 / 支出） | 预期总税 |
|---|------|------|----------------------------|---------|
| G-1 | USN-6% | tier1 | 2000万 / 600万 / — | 252 万 |
| G-2 | USN-6% | tier2 | 1亿 / 3000万 / — | 1736 万 |
| G-3 | USN-6% | tier3 | 3亿 / 1亿 / — | 5962 万 |
| G-4 | USN-15% | tier1 | 2000万 / 600万 / 800万（600+100+100） | 312 万 |
| G-5 | USN-15% | tier2 | 1亿 / 3000万 / 7000万 | 1586 万 |
| G-6 | OSNO | — | 1亿 / 5000万 / 8000万 | 约 1885 万 |

### 6.2 边界验收
- [ ] `revenue = 0` → `taxRate = 0`, `profitMargin = 0`
- [ ] USN-15% 支出 > 收入 → `incomeTax = 0`
- [ ] OSNO 支出 > 收入 → `incomeTax = 0`
- [ ] tier4 强制走 OSNO（`calculateTax` 结果 `results.length === 1`）
- [ ] `revenue > 4.5亿` 自动定档 tier4

### 6.3 测试覆盖验收
- [ ] 单元测试覆盖率 **> 90%**
- [ ] `src/__tests__/unit/calc/engine.test.ts` 所有测试通过（当前基线中约 20+ 个）

### 6.4 架构验收
- [ ] 三税制必须用**策略模式**实现（可扩展：新增税制只新增一个 Strategy 对象，不改主函数）
- [ ] 策略对象必须**纯函数**（无副作用、无 React 状态依赖、无数据库调用）
- [ ] 引擎层**禁止** import `supabase` / `react` / `react-dom`
- [ ] 所有常量（税率、档位）集中在 `engine.ts` 顶部，禁止散落

---

## 7. 非功能需求

### 7.1 性能
- 单次 `calculateTax` 调用 < 1ms（纯数学运算）
- `Context` 中 `useMemo(calculateTax)` 保证输入不变时不重算
- 多品对比场景（N 个商品）：`allProductsCalc` 在 O(N) 时间构建

### 7.2 正确性
- 6 个黄金用例是**验收硬门槛**，不通过则整个模块不允许合并
- 任何税率常量修改必须：
  1. 能追溯到《税制解说》页码
  2. 用户明确确认
  3. 关联测试用例同步更新

### 7.3 可扩展性
- **新增税制**（如未来出现 USN-20%）→ 只需新增一个 `xxxStrategy: TaxStrategy` 对象 + 注册到 `strategies` map
- **新增档位**（如俄罗斯调整营业额阈值）→ 修改 `REVENUE_TIERS` 常量即可
- **支持其他国家**（如哈萨克斯坦）→ 当前引擎**不为多国设计**，若需要要大改（重构为 `strategies[country][regime]` 两层 map）

---

## 8. 依赖、约束与风险

### 8.1 依赖
- **零外部依赖**（只 import 同目录 `types.ts`）
- 这是刻意设计：计算引擎必须可独立测试、可脱离前端/数据库跑

### 8.2 技术约束
- **禁止**引擎内部使用 `Promise` / `async`（必须同步）
- **禁止**引擎内部读 `process.env`（所有配置从 `CalcInput` 传入）
- **禁止**在引擎里打 `console.log`（测试断言干扰）

### 8.3 风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 俄罗斯税率变更（如 USN-6% 调整） | **High** | 税率必须从 `tax_config` 表读取（Step 6 管理员后台支持），当前硬编码是 v0.1.0 临时方案 |
| 黄金用例与最新税务文档不一致 | High | 每次文档更新必须同步更新测试，Review 流程兜底 |
| 浮点精度累积误差 | Low | 每步 `round()`，与 PDF 手算结果比对，误差 < 1 卢布可接受 |
| 新税制加入时主函数 if/else 膨胀 | Medium | 已用策略模式，主函数不会膨胀；档位与税制的映射也在常量里控制 |

---

## 9. 演进路线

### v0.1.0（当前）
- ✅ 税率硬编码在 `engine.ts`
- ✅ 3 个税制 + 4 个档位 + 6 个黄金用例

### v0.2.0（候选）
- 税率从 `tax_config` 表动态读取（PRD-09 管理员后台）
- 支持历史税率快照（测算时锁定税率版本）
- 多币种汇率实时拉取

### v1.0.0（候选）
- 多国税制支持（俄罗斯 / 哈萨克斯坦 / 白俄罗斯）
- 税务局 API 对接（自动拉最新税率）
- 纳税申报表自动生成

---

## 10. 相关资源
- 业务依据：《税制解说（内部版）》PDF（不在仓库，靠黄金测试用例固化）
- 实施计划：Step 2（已归档）
- 代码：`src/lib/calc/engine.ts` (233 行) + `types.ts` (134 行)
- 测试：`src/__tests__/unit/calc/engine.test.ts`
