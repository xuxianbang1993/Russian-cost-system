# Checkpoint — 2026-04-22（Phase 5.3 IMPL/Fix 完成，手动验证进行中）

> **用途**：本日经历了 SPEC → IMPL → Review × 2 → Fix × 2 → 环境配置 → 3 个基础设施 bug 修复，代码侧全部完成；还差**浏览器手动验证**（Step 7）+ commit 两步。下一轮会话上来按 §7 接。

---

## 1. 当前状态快照

| 项 | 值 |
|----|----|
| 分支 | `feat/step-5-3-product-manager` |
| 相对 main | 未 commit，工作树有 **17 个改动**（12 新增/修改代码 + 1 package.json + 2 LoginForm/RegisterForm + 2 auth test 文件） |
| 工作树 | dirty（等手动验证通过一次性 commit） |
| Tests 基线 | **112 passing / 12 files** 三件套全绿（从 75 起步） |
| Code Review Round 2 | **8.8 / 10 pass**（零 high/medium, 1 low 非硬伤） |
| 手动验证 | 🔄 进行中（暂停在注册流程，auth form 刚 refactor 完待重启 dev 验证） |
| 下一步 | 用户重启 dev → 浏览器完整走 Step 7 → commit |

## 2. 本日关键成就

### 2.1 代码侧（所有 feat/fix 都已落盘，三件套全绿）
1. **Phase 5.3 IMPL 交付**（Codex 一次性 TDD，75 → 100 tests）
2. **Code Review Round 1**：Codex 打 8.0/pass，3 medium + 2 low
3. **Fix Round 1**：5 条议题全修（100 → 103 tests）
4. **Code Review Round 2**：Codex 打 **8.8/pass**，零 high/medium
5. **Bug Fix：RSC 序列化**（Next.js 16 禁止 class 跨 SC/CC 边界）— 新增 LoginForm/RegisterForm client wrapper，103 → 108 tests
6. **Bug Fix：auth form 点击无反应**（RHF + zodResolver 静默失败）— AuthForm 重构为 native `<form action={formAction}>` + useActionState，108 → 112 tests

### 2.2 环境侧
1. **Supabase 项目创建**（ref: `wbwyduolialawvnpuoyn`，Free tier，亚太 region）
2. **`.env.local` 配置**（URL + legacy anon JWT，`.gitignore` 已覆盖不入仓）
3. **4 个 migrations apply 到 DB**（SQL Editor 一次性合并粘贴，profiles/products/calculations/tax_config + `on_auth_user_created` trigger 全部就位）
4. **dev server 首次跑起来**（踩并修了 Turbopack CJK path panic：`package.json` 加 `dev:webpack` script）

## 3. Phase 5.3 Review 最终分数（Round 2）

| 维度 | Round 1 | **Round 2** |
|---|---|---|
| 安全性 | 8 | **9** |
| 架构 | 7 | **8** |
| 测试 | 8 | **9** |
| Next.js 16 合规 | 8 | **8** |
| 可扩展性 | 7 | **8** |
| 完整性 | 9 | **9** |
| **Overall** | 8.0 | **8.8** |

**verdict: pass** / round1_fixes_confirmed: 5/5 ✅ / 零 high / 零 medium / 1 low 非硬伤（延后 Phase 5.7）

## 4. 未 commit 的文件清单（`git status --short`）

```
M package.json                                                 ← dev:webpack script
A src/__tests__/component/auth/LoginForm.test.tsx              ← RSC fix
A src/__tests__/component/auth/RegisterForm.test.tsx           ← RSC fix
A src/__tests__/component/calculator/ProductFormModal.test.tsx ← Phase 5.3
A src/__tests__/component/calculator/ProductManager.test.tsx   ← Phase 5.3
M src/__tests__/integration/repositories.test.ts               ← Phase 5.3
A src/__tests__/unit/actions/products.test.ts                  ← Phase 5.3
A src/__tests__/unit/schemas/product.test.ts                   ← Phase 5.3
M src/app/(auth)/login/page.tsx                                ← RSC fix
M src/app/(auth)/register/page.tsx                             ← RSC fix
A src/app/actions/products.ts                                  ← Phase 5.3
M src/components/auth/AuthForm.tsx                             ← auth refactor (RHF→native)
M src/components/calculator/CalculatorShell.tsx                ← Phase 5.3
A src/components/calculator/ProductFormModal.tsx               ← Phase 5.3
A src/components/auth/LoginForm.tsx                            ← RSC fix
A src/components/auth/RegisterForm.tsx                         ← RSC fix
M src/components/calculator/ProductManager.tsx                 ← Phase 5.3
M src/lib/repositories/productRepository.ts                    ← Phase 5.3
A src/lib/schemas/product.ts                                   ← Phase 5.3
M src/test-setup.ts                                            ← Phase 5.3
?? docs/20260422-checkpoint.md                                 ← 本文件
```

## 5. 本日踩的 3 个基础设施 bug + 解决方案

### 5.1 Turbopack CJK path panic
- **症状**：`thread 'tokio-runtime-worker' panicked ... start byte index N is not a char boundary; it is inside '圳' of Documents_深圳拓俄出海_...`
- **根因**：Next.js 16 默认 bundler 是 Turbopack（breaking change），Rust 实现在 str byte-split 时没处理 UTF-8 多字节字符
- **触发条件**：项目路径含中文 `/深圳拓俄出海/`
- **修复**：`package.json` 新增 `"dev:webpack": "next dev --webpack"` script，本地用这个启动；不改默认 `dev` 保留他人机器 Turbopack 性能

### 5.2 React 19 RSC 序列化禁止 class 跨边界
- **症状**：`Error: Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported.` 指向 `page.tsx:35`
- **根因**：`login/page.tsx`（Server Component）import `loginSchema`（Zod schema = ZodObject class 实例）并 `<AuthForm schema={loginSchema}>` 传给 Client Component；React 19 RSC 序列化只允许 plain data
- **修复**：新增 `LoginForm.tsx` / `RegisterForm.tsx` 两个薄 Client Component wrapper，内部 import schema + server action；page.tsx 只传 plain `initialFeedback`

### 5.3 RHF + zodResolver + Zod 4 + refine 运行时静默失败
- **症状**：用户填注册表点"创建账号"**完全没反应**——按钮不变 pending、浏览器 Console 无 error、dev 终端无 POST 请求、Supabase DB 无数据
- **诊断**：4 个信号排除了所有其他可能——form submit 事件触发但 RHF `handleSubmit` 的 valid callback 永远不跑
- **根因**：`@hookform/resolvers/zod 1.0.0` + `zod 4.3.6` + `.refine()` schema 在 React 19 concurrent runtime 下 resolver 返回格式不兼容 RHF；`as Resolver<T>` 强转掩盖了 TS 结构告警
- **修复**：AuthForm 彻底抛弃 RHF + zodResolver，改用 Next.js 16 / React 19 推荐的 `<form action={formAction}>` + `useActionState`；校验 100% 在 `signIn` / `signUp` Server Action 里做（已有的 `registerSchema.safeParse`）
- **预警**：`ProductFormModal.tsx:68` 同样用 `zodResolver(productFormSchema)`，但 productFormSchema 无 `refine`——可能不坏，但**尚未在浏览器验证**。进 Calculator 页点"保存商品"时若出同样症状，用同方案 refactor

## 6. Phase 5.3 技术决策落地确认

| # | 决策 | 落地验证 |
|---|------|---------|
| 1 | 双 schema 分离（form 0-100 + write 0-1，`toProductWriteInput`） | ✅ `src/lib/schemas/product.ts` |
| 2 | Server Actions 返回 `{ ok, data\|error }` discriminated union | ✅ `src/app/actions/products.ts` |
| 3 | Repository update/delete 双层所有权 + 0-row throw | ✅ `src/lib/repositories/productRepository.ts` Round 2 确认 |
| 4 | RHF 数字字段 `valueAsNumber: true` | ✅ ProductFormModal 所有数字 register |
| 5 | native `<dialog>` + useRef + jsdom mock 在 test-setup | ✅ Modal 无生产 fallback（Round 1 M1 已修） |
| 6 | Chip 选中态 `aria-pressed` | ✅ ProductManager |
| 7 | 双击 chip 进 edit + 显式 edit 按钮 + a11y labels | ✅ ProductManager |

5 条残留议题（M1/M2/M3/L4/L5）Round 2 `round1_fixes_confirmed` 全部 true。

## 7. 下一轮恢复流程（最小步骤）

```bash
# Step 0: 确认链路
cping codex

# Step 1: 读 memory（新会话必做）
# - project_current_phase.md（本轮已更新为"IMPL 完成待手动验证"）
# - project_phase53_impl_done.md（交付清单 + 残留议题）
# - project_env_setup_2026_04_22.md（Supabase + .env.local + dev:webpack）
# - feedback_nextjs16_breaking.md（4 类运行时陷阱，含 auth 修完的经验）

# Step 2: 确认状态不变
cd "/Users/xuxianbang/Documents/深圳拓俄出海/Russian-cost-system"
git branch --show-current            # feat/step-5-3-product-manager
git status --short                    # 17 files（本文件列了）
npx pnpm@10 test:run                  # 期望 112 passing

# Step 3: 启 dev（必须 webpack，macOS 中文路径）
rm -rf .next                          # 改完 'use client' 边界建议清缓存
npx pnpm@10 dev:webpack

# Step 4: 浏览器手动验证（Step 7）
#   1. localhost:3000/register → 填邮箱+密码 → 点"创建账号"
#      期望: 按钮变"注册中..." → redirect /login?success=registered → Supabase auth.users + profiles 有数据
#   2. /login 用同邮箱登录 → redirect /calculator
#   3. Calculator 左侧 aside 走 7 项 golden path:
#      a. 看到 ProductManager 空态
#      b. 点 + → Modal 打开 → 数字字段空白（非默认 1）→ 填商品 → 保存 → chip 出现
#         ⚠️ 若点"保存商品"没反应 → ProductFormModal 也踩 RHF+zodResolver 坑 → 派 Codex 同方案 refactor
#      c. 加第 2 个 → 点切换选中 → aria-pressed 切换
#      d. 双击 chip 进 edit → 修改 → 保存
#      e. 点"编辑"按钮（双通道 a11y）
#      f. 点"删除" → confirm → 消失
#      g. 浏览器硬刷 → 商品列表仍在（持久化）

# Step 5: 全通过后 commit
git add -A
git commit -m "feat(calc): Phase 5.3 ProductManager + Server Actions + auth form refactor"
# 或分两个 commit:
#   1) fix(auth): native form actions for Next.js 16 compatibility
#   2) feat(calc): Phase 5.3 ProductManager + Server Actions

# Step 6: 若 Step 4b 触发 ProductFormModal 同坑，先修再 commit
# - 参考 AuthForm refactor 的做法（native form action）
# - Modal 的 ~140 行结构要调整，Phase 5.3 的 6 个 Modal 测试要重写
# - 修完再 commit
```

## 8. 本日 memory 变动（用于回顾）

| 文件 | 动作 |
|------|------|
| `MEMORY.md` | 更新索引，加入 2 条新记忆 |
| `project_current_phase.md` | 重写：SPEC → IMPL 完成 |
| `project_baseline_verified_2026_04_22.md` | 重写：75 → 112 演进 |
| `feedback_nextjs16_breaking.md` | 追加 4 类运行时陷阱 |
| `project_env_setup_2026_04_22.md` | **新增**：Supabase + .env.local 重建指南 |
| `project_phase53_impl_done.md` | **新增**：完成清单 + 残留议题 |
| `project_phase53_spec_decisions.md` | 保留（"进行时"快照存档） |
| `project_phase53_impl_residuals.md` | 保留（已被 Round 2 全部 confirmed，存档参考） |

---

## 9. 第二幕追记（2026-04-22 晚 13:00-13:50，手动验证现场踩坑 + 全修 + 验证通过）

> 第一幕（§1-§8）停在"等浏览器手动验证"。第二幕是手动验证中现场修的 3 个 bug + 1 个遗漏 feature，全部落盘，**手动验证全通过**。

### 9.1 第二幕发现 & 修复

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| 1 | 注册时 `infinite recursion detected in policy for relation "profiles"` | migration 001-004 admin policy 用 `EXISTS (SELECT FROM profiles)` 自引用 → Postgres RLS 递归 | `supabase/migrations/005_fix_rls_policies.sql`：`is_admin()` SECURITY DEFINER 函数 + REVOKE PUBLIC + GRANT authenticated + 4 policy 用 `TO authenticated` + `public.is_admin()` |
| 2 | 点确认邮件跳 `/login?error=callback` | `/auth/callback/route.ts` 只处理 OAuth `code`，漏 Supabase PKCE/OTP 的 `token_hash` 分支 | route.ts 加 `verifyOtp({ token_hash, type })` 分支；type 白名单 6 种含 `'email'`（常被漏）；新增 `callback.test.ts` 12 测试 |
| 3 | 点邮件后登录页依旧显示假错误（但实际能登录） | Gmail 安全扫描 bot 预 fetch 链接消费一次性 token_hash | Supabase Dashboard → Auth → Providers → Email → 关 `Confirm email`（开发期方案；生产级 Phase 5.7 改 client-side verifyOtp） |
| 4 | Calculator 页没有退出按钮（功能遗漏，非 bug） | Phase 5.2 signOut action 早有但 UI 没接 | `CalculatorShell.tsx` header 加 `<form action={signOut}>`；`auth.ts` signOut 改 `Promise<void>` + redirect error（对齐 form action 契约）；`login/page.tsx` 加 `error=signout` 分支 |

### 9.2 Peer Review 流程（两轮全通过）
- **PLAN REVIEW**（Codex 独立评审）= **7.8 / pass** — 3 条 issue 吸收（M1=OTP 漏 `'email'` / L1=tax_config policy 名 / L2=函数 EXECUTE 权限收紧）
- **CODE REVIEW**（Codex 独立评审）= **8.0 / pass** — 2 条 issue 吸收（M1=admin policy 需 `TO authenticated` / L1=空字符串边界测试）

### 9.3 Tests 演进
- 第一幕结束：112 passing / 12 files
- 第二幕 Codex IMPL（callback + migration）：**122** passing / 13 files（+10 测试）
- 第二幕 L1 吸收（空字符串边界）：**124** passing / 13 files（+2 测试）
- lint / tsc / test 三件套全绿

### 9.4 未 commit 文件变动（vs §4）
**新增**（5）：
- `supabase/migrations/005_fix_rls_policies.sql`
- `src/__tests__/unit/auth/callback.test.ts`

**修改**（3 + 本轮追加）：
- `src/app/auth/callback/route.ts`（加 PKCE/OTP 分支）
- `src/app/actions/auth.ts`（signOut 签名 + error 处理）
- `src/app/(auth)/login/page.tsx`（加 error=signout 分支）
- `src/components/calculator/CalculatorShell.tsx`（header 退出按钮）

### 9.5 手动浏览器验证（全部 ✅）

1. ✅ 注册新用户 → redirect `/login?success=registered`
2. ✅ 登录 → redirect `/calculator`（Dashboard 关了 `Confirm email`，无需点邮件）
3. ✅ ProductManager 7 项 golden path：空态 → 新增 → 切换 → 双击编辑 → 编辑按钮 → 删除 → 硬刷持久化
4. ✅ 右上角"退出登录"按钮可见可点 → redirect `/login?success=signed-out`
5. ✅ 退出后重登 → 商品列表完整保留（Supabase 持久化）

### 9.6 下一步（唯一剩余）

```bash
# Commit 分 2 个（语义清晰）
git add supabase/migrations/005_fix_rls_policies.sql \
        src/__tests__/unit/auth/callback.test.ts \
        src/__tests__/component/auth/ \
        src/app/auth/callback/route.ts \
        src/app/actions/auth.ts \
        src/app/\(auth\)/ \
        src/components/auth/ \
        src/components/calculator/CalculatorShell.tsx \
        package.json
git commit -m "fix(auth): RLS recursion + PKCE callback + native form actions + logout button"

git add -A  # 剩余 Phase 5.3 核心文件
git commit -m "feat(calc): Phase 5.3 ProductManager + Server Actions"
```

---

**给下一轮会话**：直接说"继续 Phase 5.3"或"按 checkpoint §9 commit"即可，第一幕/第二幕代码全部就位，浏览器实测通过，差一步 commit。
