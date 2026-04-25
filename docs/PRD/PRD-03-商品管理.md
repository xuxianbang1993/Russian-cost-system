# PRD-03: 商品管理（Products CRUD）

| 字段 | 值 |
|------|-----|
| 模块 | 商品增删改查、表单校验、数据持久化 |
| 版本 | v0.1.0 |
| 状态 | ✅ 代码完成（Phase 5.3 交付，Codex Review Round 2 = 8.8/pass），待 commit |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 代码入口 | `src/app/actions/products.ts`、`src/components/calculator/ProductManager.tsx`、`src/components/calculator/ProductFormModal.tsx`、`src/lib/repositories/productRepository.ts`、`src/lib/schemas/product.ts` |
| DB 入口 | `supabase/migrations/002_create_products.sql` |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
卖家不会只卖一个商品。每个 SKU 的**售价、申报成本、关税率、平台佣金率**都不同，如果每次测算都重新输入会严重影响效率。商品信息应该**持久化**，用户下次登录能看到完整商品库。

### 1.2 产品价值
- **商品库**：用户一次录入，永久保存
- **多品对比**：为 PRD-06（多品对比视图）和 PRD-07（批量模拟）提供数据基础
- **快速切换**：Calculator 页左侧 chip 列表，单击切换当前测算 SKU

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：首次添加商品
> 新注册用户进入 Calculator 页，左侧"商品"区显示空态（"暂无商品，添加商品后即可开始成本测算"）→ 点 "+" 按钮 → Modal 弹出 → 填写商品信息（名称/emoji/售价/成本/关税率/...）→ 点"保存商品" → Modal 关闭 → chip 出现在列表中。

### 场景 2：日常切换测算对象
> 用户已经录入 5 个商品 → 打开 Calculator 页 → 左侧显示 5 个 chip → 点第 3 个 chip → `aria-pressed` 切换 → 右侧的计算结果立即用这个商品的参数重算。

### 场景 3：修正商品参数
> 用户发现某商品售价录错了 → 双击 chip（或点 chip 右侧"编辑"按钮）→ Modal 以当前商品数据预填 → 修改售价 → 保存 → 列表显示更新。

### 场景 4：删除下架商品
> 用户某款商品已下架 → 点 chip 右侧"删除" → 浏览器原生 `confirm("确认删除 X？")` → 点确定 → Server Action 执行 → chip 消失。

### 场景 5：跨设备持久化
> 用户在电脑录入 5 个商品 → 切换到手机浏览器登录 → 5 个商品完整恢复（数据存在 Supabase，受 RLS 保护）。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（✅ 已实现）

| # | 功能 | UI 入口 | 对应代码 |
|---|------|---------|---------|
| F-1 | 列出当前用户所有商品 | 左侧"商品"区的 chip 列表 | `productRepository.getProducts(userId)` |
| F-2 | 空态提示 | chip 列表为空时显示 | `ProductManager.tsx:148-152` |
| F-3 | 添加商品（Modal） | 右上角 "+" 按钮 | `createProductAction` |
| F-4 | 编辑商品（双通道） | 双击 chip / chip 右侧"编辑"按钮 | `updateProductAction` |
| F-5 | 删除商品（二次确认） | chip 右侧"删除"按钮 + `window.confirm` | `deleteProductAction` |
| F-6 | 选中商品（切换当前测算对象） | 单击 chip | `dispatch({ type: 'SET_PRODUCT' })` |
| F-7 | 表单校验（10 个字段） | Modal 内 react-hook-form + zod | `productFormSchema` |
| F-8 | 错误提示 | Modal 字段下方 + Server Action 失败时 `alert()` | `errors.xxx.message` |
| F-9 | 百分比字段自动转换（0-100 → 0-1） | 保存时 `toProductWriteInput()` | `src/lib/schemas/product.ts:33-39` |
| F-10 | 数据隔离 | Server Action + Repository 双层 `userId` 过滤 | 防御纵深 |

### 3.2 不做的事（Out of Scope）
- ❌ 商品分组 / 分类 / 标签
- ❌ 批量导入（Excel/CSV）
- ❌ 商品图片上传（只支持 emoji）
- ❌ 商品历史版本（修改后覆盖，无版本号）
- ❌ 软删除（删除即物理删除，RLS `ON DELETE CASCADE`）

### 3.3 未来可选
| # | 功能 | 计划版本 |
|---|------|---------|
| F-11 | 批量 CSV 导入 | v0.2.0 |
| F-12 | 商品分类标签 | v0.2.0 |
| F-13 | 商品搜索（列表 >20 条时） | v0.2.0 |
| F-14 | 软删除 + 回收站 | v1.0.0 |

---

## 4. 业务规则

### 4.1 商品字段（10 个）
| 字段 | 类型 | 约束 | 校验消息 |
|------|------|------|---------|
| `name` | string | trim, 1-50 字符 | "商品名称不能为空" / "商品名称不能超过 50 个字符" |
| `emoji` | string | trim, 1-4 字符，默认 `📦` | "商品图标不能为空" / "商品图标不能超过 4 个字符" |
| `platformPrice` | number | > 0 | "商品售价必须大于 0" |
| `declaredCost` | number | ≥ 0 | "申报成本不能小于 0" |
| `purchaseCost` | number | ≥ 0 | "采购成本不能小于 0" |
| `volume` | number | ≥ 0 | "体积不能小于 0" |
| `weight` | number | ≥ 0 | "重量不能小于 0" |
| `dutyRate`（关税率） | number | 表单 0-100；存储 0-1 | "关税率不能大于 100%" |
| `platformFeeRate`（平台佣金率） | number | 表单 0-100；存储 0-1 | "平台佣金率不能大于 100%" |
| `shippingMethod` | enum | `'standard'` / `'east'` | — |

### 4.2 双 Schema 分离（关键架构决策）
```ts
// 前端表单用（0-100 更符合直觉）
productFormSchema = {
  dutyRate: z.number().min(0).max(100),
  platformFeeRate: z.number().min(0).max(100),
  ...
}

// 写库用（0-1 是业务实际比例）
productWriteSchema = {
  dutyRate: z.number().min(0).max(1),
  platformFeeRate: z.number().min(0).max(1),
  ...
}

// 转换函数（表单 → 写库）
toProductWriteInput(form) = { ...form, dutyRate: form.dutyRate / 100, platformFeeRate: form.platformFeeRate / 100 }
```

**Why**：让用户输入 "27" 而不是 "0.27"，同时存储保持业务语义。**禁止**让 RHF 用 `productWriteSchema`（否则 15% 的输入会被 reject）。

### 4.3 所有权校验（双层防御）
```ts
// 第 1 层：Server Action 取 userId
const userId = await getCurrentUserId();
if (!userId) return { ok: false, error: '请先登录' };

// 第 2 层：Repository 传 userId 到 SQL WHERE
.eq('id', id).eq('user_id', userId)

// 第 3 层：RLS policy
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
```

### 4.4 0-row 显式抛错
Supabase 的 `update/delete` 默认即使影响 0 行也不报错。为了防止"静默失败"：
```ts
// update
.select('*').single()       // 0 行时 Supabase 会报 PGRST116 错误
if (!product) throw new Error('商品更新失败');

// delete
.select('id')
if (!data || data.length === 0) throw new Error('商品不存在或无权删除');
```

### 4.5 Edit 行为
- Phase 5.3：**全量替换**（Modal 提交所有字段）
- Phase 5.7 候选：字段级 diff（只提交变更字段）
- 注释已标：`// Phase 5.3: edit 提交全量字段；Phase 5.7 若需字段级 diff 再优化`

### 4.6 删除行为
- **硬删除**（物理删除 DB 行）
- 二次确认：`window.confirm(\`确认删除 ${product.name}？\`)`
- 不支持批量删除
- 删除一个商品不影响其他商品，但**会影响引用了这个商品的测算记录**（PRD-08 决定是级联删 / 软删 / 保留引用）

---

## 5. 交互细节

### 5.1 组件结构
```
ProductManager（Client Component）
├── Header（"商品"标题 + "+"按钮）
├── 空态提示（len === 0 时）
├── Chip 列表（len > 0 时）
│   └── Chip × N
│       ├── 选中按钮（aria-pressed, onClick, onDoubleClick）
│       │   ├── emoji + 名称
│       │   └── 售价（font-mono）
│       ├── "编辑"按钮
│       └── "删除"按钮
└── ProductFormModal（受控 open / close）
```

### 5.2 Modal 交互（`ProductFormModal.tsx`）
- **技术**：原生 `<dialog>` + `useRef<HTMLDialogElement>`（不引 shadcn Dialog）
- **open 幂等 guard**：`if (dialog.open) return`，避免重复调用 `showModal()` 抛错
- **jsdom mock**：`test-setup.ts` 用 `Object.defineProperty` 模拟 `HTMLDialogElement.prototype.showModal/close`
- **按 ESC 关闭**：`<dialog onCancel={props.onClose}>`（浏览器原生行为）
- **点击遮罩**：不关闭（避免误触丢数据，用户必须点"取消"或"×"）

### 5.3 表单字段布局
- 第 1 行：图标（5rem）+ 名称（flex）
- 第 2 行：售价、申报成本、采购成本（三列）
- 第 3 行：体积、重量、关税率、平台佣金率（四列）
- 第 4 行：物流方式（下拉选择）
- 第 5 行：取消 + 保存按钮（右对齐）

### 5.4 数字字段规范
- `<input type="number" step="0.01">`（金额）或 `step="0.001"`（体积重量）
- `register('xxx', { valueAsNumber: true })`（否则是字符串）
- **默认值 `undefined`**（不是 0）—— 让用户必须主动填，不会被默认值误导
- 字段样式 `font-mono text-right`

### 5.5 Chip 视觉规范
| 状态 | 样式 |
|------|------|
| 未选中 | `border-border bg-surface` |
| 选中 | `border-primary bg-primary-light` + `aria-pressed="true"` |
| Hover | `hover:bg-primary-muted` |

### 5.6 错误反馈
| 场景 | 表现 |
|------|------|
| Zod 前端校验失败 | 字段下方红色错误文本（`text-destructive`） |
| Server Action 返回 `{ ok: false }` | `window.alert(result.error)` |
| 数字字段 NaN（空白提交） | Zod 默认消息 "Expected number, received NaN"（已知问题，Phase 5.7 本土化） |

---

## 6. 数据模型

### 6.1 `public.products` 表（migration 002）
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📦',
  platform_price DECIMAL NOT NULL,
  declared_cost DECIMAL NOT NULL,
  purchase_cost DECIMAL NOT NULL,
  volume DECIMAL,
  weight DECIMAL,
  duty_rate DECIMAL DEFAULT 0.05,         -- 存储为 0-1
  platform_fee_rate DECIMAL DEFAULT 0.27, -- 存储为 0-1
  shipping_method TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_products_user_id ON public.products(user_id);

-- RLS
CREATE POLICY "users_manage_own_products" ON public.products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_manage_all_products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```

### 6.2 DB ↔ 业务对象映射（snake_case ↔ camelCase）
由 `src/lib/supabase/adapters.ts` 的 `productRowToEntity` / `productEntityToRow` 负责转换。

### 6.3 Server Action 契约（discriminated union）
```ts
type ProductActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

createProductAction(input): Promise<ProductActionResult<Product>>
updateProductAction(id, input): Promise<ProductActionResult<Product>>
deleteProductAction(id): Promise<ProductActionResult<{ id: string }>>
```

> **命名差异**：auth actions 用 `{ error?, success? }` 形式，products 用 `{ ok, data|error }` —— **故意不统一**，后者对 TypeScript 推断更友好。

---

## 7. 验收标准（Definition of Done）

### 7.1 功能验收
- [ ] 新用户空态显示正确（"暂无商品"提示）
- [ ] 点 "+" 打开 Modal，字段全空白（非 0）
- [ ] 填完整表单 → 保存 → chip 出现，Modal 关闭
- [ ] 空字段提交 → 字段下方显示错误，Modal 不关
- [ ] dutyRate 输入 "27"（百分制），存库后是 `0.27`
- [ ] 双击 chip → Modal 打开，字段已预填（dutyRate 显示 27，不是 0.27）
- [ ] 编辑后保存 → chip 更新
- [ ] 点"删除" → confirm 弹窗 → 确认后 chip 消失
- [ ] 硬刷浏览器 → 商品列表仍在
- [ ] 切换用户 → 只能看到自己的商品

### 7.2 数据隔离验收
- [ ] 调用 `updateProductAction(otherUserProductId, ...)` → 返回错误
- [ ] 调用 `deleteProductAction(otherUserProductId)` → 返回 "商品不存在或无权删除"
- [ ] SQL 层 `.eq('user_id', userId)` 即使 RLS 失效也能兜底

### 7.3 测试验收
- [ ] `src/__tests__/unit/schemas/product.test.ts` 6 个用例通过（双 schema + 转换函数）
- [ ] `src/__tests__/unit/actions/products.test.ts` 7 个用例通过
- [ ] `src/__tests__/component/calculator/ProductFormModal.test.tsx` 6 个用例通过
- [ ] `src/__tests__/component/calculator/ProductManager.test.tsx` 6 个用例通过
- [ ] `src/__tests__/integration/repositories.test.ts` 0-row 边界用例通过

### 7.4 架构验收（Codex Round 2 = 8.8/pass 已确认）
- [ ] 双 schema 分离（form 0-100 / write 0-1）
- [ ] Server Action 返回 discriminated union
- [ ] Repository 签名 `(userId, id, ...)`
- [ ] Modal 无"生产代码 jsdom 污染"（无 dialog-open fallback）
- [ ] RHF 数字字段全部 `valueAsNumber: true`
- [ ] Chip 选中态用 `aria-pressed`，不用 class 作为测试断言

---

## 8. 非功能需求

### 8.1 性能
- 商品列表渲染：< 100ms（20 条以内）
- Modal 打开 / 关闭：< 50ms
- 保存 Server Action：< 500ms（主要受 Supabase 网络延迟影响）

### 8.2 可访问性
- `aria-label="添加商品"` / `aria-label="编辑 {name}"` / `aria-label="删除 {name}"`
- `aria-pressed` 表达 chip 选中态
- 键盘可完整操作（Tab + Enter + ESC 关 Modal）
- 双击 + 显式按钮双通道编辑（触屏/键盘友好）

### 8.3 可用性
- 删除二次确认（防止误点）
- Modal 字段默认 `undefined`（不是 0，避免用户以为是真实数据）
- 编辑时预填数据（不是每次都从空开始）

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-01 用户认证（`auth.getUser()` 提供 userId）
- PRD-04 Calculator Context（`dispatch` / `state.products`）
- Supabase `products` 表 + RLS + trigger

### 9.2 技术约束
- **禁止** 组件直接 `import supabase`（必须通过 Repository 或 Server Action）
- **必须** 双 schema 分离（百分比字段）
- **必须** Server Action + Repository 双层 userId 校验
- **必须** Modal 用原生 `<dialog>`（不引入 shadcn Dialog）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 空白数字字段的 NaN 英文错误 | Low | Phase 5.7 本土化 |
| 大量商品（>100）列表性能 | Low | v0.2.0 加分页/虚拟滚动 |
| 硬删除后测算记录悬空 | Medium | `ON DELETE CASCADE` 会级联删测算，或在 PRD-08 决定保留 `productId + snapshot` |
| 浏览器 `window.confirm` 体验朴素 | Low | v0.2.0 换 shadcn Dialog |

---

## 10. 相关资源
- 实施计划：`docs/plans/2026-03-28-step5-implementation-plan.md` §Phase 5.3
- SPEC 决策：`project_phase53_spec_decisions.md`（memory）
- Review 记录：`project_phase53_impl_done.md`（memory）Round 1 + Round 2
- 本轮 Checkpoint：`docs/20260422-checkpoint.md` §2.1 + §6
