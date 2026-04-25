# PRD-08: 测算记录管理（Save / History）

| 字段 | 值 |
|------|-----|
| 模块 | 保存测算 / 历史列表 / 记录详情 / 路由拦截提示 |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Phase 5.6） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q7 / Q8 / Q9 / Q13（2026-04-24） |
| 预期代码位置 | `src/app/actions/calculations.ts`、`src/app/(dashboard)/calculator/history/page.tsx`、`src/components/calculator/SaveButton.tsx`、`src/components/calculator/UnsavedGuard.tsx`、`src/lib/repositories/calculationRepository.ts` |
| DB 入口 | `supabase/migrations/003_create_calculations.sql`（需扩列） |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
用户每次打开 Calculator 都**从 0 开始**：
- 上次填的营业额 / 支出 / 汇率全丢
- 没法"今天算了 5 个场景，明天继续对比"
- 没法把"3 月的测算"留档回顾

### 1.2 产品价值
- **档案化**：每次测算可存档，长期可追溯
- **多方案对比**：一个商品可以保存多份测算（不同销量假设 / 不同成本假设）
- **防误丢**：意外关页、切账号前有保存提醒

### 1.3 业务地位
产品从"临时计算器"升级为"经营档案库"的关键。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：年度复盘存档
> 用户年底复盘，把去年实际数据录入 → 点"保存测算" → 自动生成记录名 "2026-04-24 · 智能音箱 · tier2" → 进历史列表可见。

### 场景 2：多方案对比
> 用户想比较两种定价策略：方案 A 售价 ₽1000 → 保存；方案 B 售价 ₽1200 → 保存。历史列表看到两条记录，逐个打开对比。

### 场景 3：未保存保护
> 用户算了一半 → 不小心点了 "退出登录" 或切到"多品对比" tab → 弹出 Modal "当前测算有未保存的变更，是否保存？[保存] [放弃] [取消]"。

### 场景 4：加载历史重算
> 用户打开历史记录 → 点一条 "📱音箱 · Q3 2026" → Calculator 页用该记录的参数重新填充 → 但**数字可能和当时不完全一致**（因为 Q7 决策：商品参数已改）→ UI 提示"注意：商品参数已变更，当前数字为最新计算结果"。

### 场景 5：硬删除
> 用户右键记录 → "删除" → `window.confirm("确认删除？")` → 确定 → 记录消失（无回收站，**Q8 决策**）。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（⏳ 待实现）

| # | 功能 | 决策关联 |
|---|------|---------|
| F-1 | "保存测算"按钮（Calculator header 右侧） | — |
| F-2 | 保存时自动生成名字（`YYYY-MM-DD · 商品名 · tier标识`） | Q13 |
| F-3 | 记录名可编辑（保存后在历史列表单击重命名） | Q13 |
| F-4 | 历史列表页 `/calculator/history` | — |
| F-5 | 列表字段：名字 / 创建时间 / 商品 / 营业额 / 推荐税制 / 净利润 | — |
| F-6 | 点击记录 → 加载到 Calculator + 重新计算 | Q7/Q9 |
| F-7 | 硬删除 + `window.confirm` | Q8 |
| F-8 | 未保存状态检测（脏标记 `isDirty`） | — |
| F-9 | 路由拦截：切 tab / 导航走 / 登出 时弹 Modal | Q13 |
| F-10 | "已变更" UI 提示（当重新打开记录时） | Q7/Q9 |

### 3.2 SHOULD HAVE（延后候选）
- 记录搜索 / 筛选（v0.2.0）
- 标签 / 分组（v0.2.0）
- CSV 导出（v0.2.0）

### 3.3 不做（Out of Scope）
- ❌ 软删 / 回收站（**Q8 决策**）
- ❌ 商品快照（**Q7 决策**：只存 productId）
- ❌ 税率快照（**Q9 决策**：历史用最新税率）
- ❌ 版本号 / diff（太复杂，v0.2.0 候选）

---

## 4. 业务规则

### 4.1 保存规则（**Q7 + Q13 决策**）

**什么时候能保存**：
- 必须有选中商品（`currentProduct !== null`）
- 必须有营业额（`revenue > 0`）
- 其他字段允许为 0

**保存内容**：
```ts
{
  user_id: userId,
  product_id: currentProduct.id,  // ← Q7: 只存 productId
  name: generateDefaultName(),    // ← Q13: 自动生成
  tier: state.tierId,
  revenue: state.revenue,
  expenses: state.expenses,
  rates: state.rates,
  results: calcOutput.results,    // 快照当时的计算结果（便于列表显示，不用再算）
  created_at: now,
}
```

**自动生成名规则**：
```
"{YYYY-MM-DD} · {product.emoji} {product.name} · {tierLabel}"
例: "2026-04-24 · 📱 智能音箱 · tier2"
```
- 同一天同一商品同一档位多次保存 → 附加序号：`... (2)` `... (3)`

**保存反馈**：
- 成功：Toast "已保存 · 2026-04-24 17:30" + 按钮短暂变"已保存 ✓"
- 失败：Toast 红色错误 + 保留脏状态

### 4.2 加载规则（**Q7 + Q9 决策**）

打开历史记录时的流程：
1. 从 DB 读记录 → 得到 `product_id + tier + revenue + expenses + rates`
2. 从 DB 读该 product 最新数据（**不是存的快照**）
3. 若商品已被删除：提示 "该商品已删除，无法加载"（因为 Q7 + CASCADE 其实已经级联删了这条记录，这种情况理论上不会发生；但为了防 race condition 加兜底）
4. 用最新参数 + 记录的 revenue/expenses/rates 重新调用 `calculateTax`
5. 与记录保存时的 `results` 对比：
   - 如果差异 < 1 卢布：静默加载
   - 如果有差异：UI 顶部显示 banner "⚠️ 商品参数或税率已变更，当前数字是最新计算结果（保存时：₽XXX → 现在：₽YYY）"

### 4.3 删除规则（**Q8 决策**）

- 点击删除 → `window.confirm(\`确认删除「\${record.name}」？\`)`
- 确认 → 调 `deleteCalculationAction(id)` → Server Action + Repository 双层 `user_id` 校验
- 删除成功 → 列表 rerender 不含该行

### 4.4 脏状态检测（**Q13 决策**）

**"脏"定义**：
- Context 中的 state（`tier / revenue / expenses / rates` 以及当前商品数据）
- 与"最后一次保存时的快照"不同时，视为脏

**实现方案**：
```ts
// CalculatorProvider 内
const [lastSaved, setLastSaved] = useState<SnapshotState | null>(null);
const isDirty = useMemo(() => !shallowEqual(currentSnapshot, lastSaved), 
                          [currentSnapshot, lastSaved]);
```

**"未保存"的边界**：
- 空白状态（刚进页面 + 什么都没变）: 不算脏
- 选过商品但没填数据：不算脏
- 填了任何一个数字：算脏
- 保存一次后：不脏
- 再次改数据：又变脏

### 4.5 路由拦截（**Q13 决策：自定义 Modal**）

**触发场景**：
1. 点击"退出登录"
2. 切换 ViewTabs（detail / compare / batch）
3. 浏览器导航到其他 URL（如 `/calculator/history`）
4. 关闭浏览器 tab（只能用 `beforeunload`，显示浏览器默认提示；无法显示自定义 Modal）

**Modal 行为**：
```
标题: 未保存的测算
内容: "当前测算还没有保存，是否保存？"
按钮:
  [保存] → 调用 saveAction → 成功后继续原操作
  [放弃] → 直接继续原操作
  [取消] → 关闭 Modal，停留在当前页
```

**实现**：
- Next.js App Router 的导航：监听 `router.push` 事件（需用 `unstable_useNavigationInterception`，如果 Next.js 16 不稳定则用全局 state + 手动拦截）
- 浏览器 beforeunload：只能显示原生 prompt，不做自定义 Modal

### 4.6 历史列表规则

- 按 `created_at DESC` 排序（最新的在前）
- 默认 20 条/页，翻页
- 字段（5 列）：
  1. 名字（可单击编辑）
  2. 商品（emoji + 名称，可能因 CASCADE 为 null）
  3. 创建时间（相对时间，如"3 小时前"）
  4. 推荐税制
  5. 操作（打开 / 删除）

---

## 5. 交互细节

### 5.1 保存按钮（Calculator Header）
```
[跨境电商成本计算器]  ... [保存测算 💾] [退出登录]
```
- 脏状态：主色背景（primary）+ 白字
- 干净状态：灰色 + 禁用（但文字提示 "当前无改动可保存"）
- Loading 状态：按钮变 "保存中..." + spinner

### 5.2 未保存 Modal
- 居中小弹窗（max-width 400px）
- 遮罩半透明 `--foreground/30`
- 按钮排列：`[取消]    [放弃] [保存]`（保存主色，放弃灰色，取消边框）
- ESC 触发"取消"
- 点击遮罩不关闭（避免误触）

### 5.3 历史列表页 `/calculator/history`
```
┌──────────────────────────────────────────────────┐
│ 历史测算  [+ 回到 Calculator]               [搜索]│
├──────────────────────────────────────────────────┤
│ 名称                  商品    时间      推荐  操作│
│ 2026-04-24 · 📱音箱… 📱 音箱 3h前      USN-6% ⋮ │
│ 2026-04-23 · 🎧耳机… 🎧 耳机 昨天      USN-15% ⋮ │
│ ...                                              │
├──────────────────────────────────────────────────┤
│                                    [上一页 1/3 下一页]│
└──────────────────────────────────────────────────┘
```

### 5.4 加载记录时的"变更提示"
```
┌────────────────────────────────────────────────────┐
│ ⚠️ 商品参数已变更，此记录的当前计算结果可能与保存时│
│    不同。查看保存时快照 ▼                        │
└────────────────────────────────────────────────────┘
```
- 放在 Calculator 顶部
- 可折叠：点击 ▼ 展开显示保存时的 KPI 数字

---

## 6. 数据模型

### 6.1 `public.calculations` 表（需扩列）

原 migration 003（参考 `src/lib/calc/types.ts CalculationEntity`）：
```sql
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE, -- ← Q7 CASCADE
  tier TEXT NOT NULL,
  revenue DECIMAL NOT NULL,
  expenses JSONB NOT NULL,
  results JSONB NOT NULL,     -- 保存时的 TaxCalcResult[] 快照（用于"变更提示"对比）
  rates JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**本 PRD 需新增 migration 006**：
```sql
-- 006_add_calculation_name.sql
ALTER TABLE public.calculations ADD COLUMN name TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_calculations_user_created ON public.calculations(user_id, created_at DESC);
```

### 6.2 RLS Policy（继承 003 + 005）
```sql
-- 用户自身
CREATE POLICY "users_manage_own_calculations" ON public.calculations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin（已在 005 就位）
CREATE POLICY "admin_manage_all_calculations" ON public.calculations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```

### 6.3 Server Actions 契约
```ts
type CalcActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

saveCalculationAction(input): CalcActionResult<Calculation>
renameCalculationAction(id, newName): CalcActionResult<Calculation>
deleteCalculationAction(id): CalcActionResult<{ id: string }>
loadCalculationAction(id): CalcActionResult<CalculationDetail>  // 含商品最新状态
```

### 6.4 名字生成函数
```ts
// src/lib/utils/generateCalculationName.ts
export function generateCalculationName(product: Product, tierId: TierId, date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${dateStr} · ${product.emoji} ${product.name} · ${tierId}`;
}
```

---

## 7. 验收标准（Definition of Done）

### 7.1 保存功能
- [ ] Calculator header 有"保存测算"按钮
- [ ] 脏状态时按钮可点，干净时禁用
- [ ] 点击后 DB 新增一行 `calculations`，name 自动生成
- [ ] 成功显示 Toast "已保存"，按钮状态复位

### 7.2 历史列表
- [ ] `/calculator/history` 显示当前用户所有记录
- [ ] 按时间倒序，分页
- [ ] 点击行加载记录 → 跳 Calculator 填充参数
- [ ] 记录的商品已删除时，不出现在列表（CASCADE）
- [ ] 删除按钮 → confirm → 成功后列表刷新

### 7.3 加载与变更提示
- [ ] 打开记录时用最新商品参数重算
- [ ] 与保存时 `results` 快照比对
- [ ] 有差异 → 顶部显示变更提示 banner
- [ ] 可折叠查看原快照

### 7.4 未保存保护
- [ ] 脏状态下点退出登录 → 弹 Modal
- [ ] 脏状态下切 tab → 弹 Modal
- [ ] Modal [保存] / [放弃] / [取消] 三按钮都按预期工作
- [ ] 干净状态下所有导航不弹 Modal

### 7.5 数据隔离
- [ ] A 用户看不到 B 用户记录
- [ ] A 用户删 B 用户记录 → Server Action 返回错误

### 7.6 测试验收
- [ ] `src/__tests__/unit/actions/calculations.test.ts` ≥ 5 用例
- [ ] `src/__tests__/component/calculator/SaveButton.test.tsx`
- [ ] `src/__tests__/component/calculator/UnsavedGuard.test.tsx`
- [ ] 集成测试：保存 → 重新加载 → 参数正确

---

## 8. 非功能需求

### 8.1 性能
- 保存 < 500ms
- 列表加载 < 500ms（分页 20 条）
- 加载记录重算 < 100ms

### 8.2 安全
- 所有 Server Action 双层 userId 校验（延续 PRD-03 模式）
- `name` 字段做 trim + max 100 字符校验

### 8.3 可用性
- 脏状态检测不要过于敏感（不然用户稍改一下就红色警告很烦）
- Toast 消息不挡关键操作区
- Modal 支持 ESC 关闭 = "取消"

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-01 用户认证（userId）
- PRD-02 计算引擎
- PRD-03 商品管理（productId）
- PRD-04 Context（state + calcOutput）
- PRD-05 DetailView（共用数据结构）

### 9.2 技术约束
- **必须** 用 `ON DELETE CASCADE`（Q7 决策导致商品删→记录也删）
- **必须** 保存时写 `results` 快照（仅用于"变更对比"，**不是**权威数据源）
- **必须** 加载时用最新 products + tax_config 重算（Q7 + Q9）
- **禁止** 用 `beforeunload` 弹自定义 Modal（浏览器不支持，降级到原生 prompt）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| CASCADE 删商品意外删除所有历史 | **High** | UI 删商品前警告"将同时删除 N 条历史测算"，确认两次 |
| 脏状态检测误报（如浮点精度） | Medium | 用 `deepEqual` + 数字字段精度归一 |
| 路由拦截在 Next.js 16 不稳定 | Medium | 用自定义 Link 包装器 + 手动拦截 router.push |
| 大量历史记录导致列表慢 | Low | 分页 + 索引（已加 `idx_calculations_user_created`） |
| 自动生成名重复感（同一天多次） | Low | 已有 `(2) (3)` 序号方案 |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.6
- 上游 PRD：PRD-02 / PRD-03 / PRD-04 / PRD-05
- 头脑风暴决策：Q7（只存 productId）/ Q8（硬删）/ Q9（税率重算）/ Q13（自动命名 + Modal 拦截）
- 关联 migration：003（已有）+ 006（本 PRD 新增，加 `name` 列）
