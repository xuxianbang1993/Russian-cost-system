# PRD-01: 用户认证系统

| 字段 | 值 |
|------|-----|
| 模块 | 用户认证、会话、数据隔离 |
| 版本 | v0.1.0 |
| 状态 | ✅ 已实现（Phase 5.3 时完成重构 + 基础设施加固） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 代码入口 | `src/app/actions/auth.ts` / `src/app/(auth)/*` / `src/components/auth/*` |
| DB 入口 | `supabase/migrations/001_create_profiles.sql` / `005_fix_rls_policies.sql` |

---

## 1. 需求背景（WHY）

### 1.1 业务诉求
- 成本测算涉及商品售价、成本结构等商业敏感信息，**必须登录后才能使用**。
- 不同卖家的商品库、测算记录必须**严格隔离**，彼此不可见。
- 管理员（财税顾问）需要特权身份**维护税率参数**，普通用户只能读取。

### 1.2 产品价值
- **数据安全**：用户能放心录入敏感商业数据。
- **多端同步**：登录后在任何浏览器打开，商品库与测算记录完整恢复。
- **权限分层**：预留 `admin` 角色，为 Step 6 管理员后台铺路。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：首次注册
> 某卖家财务在老板推荐下首次打开 `/calculator`，被重定向到 `/login`，点"注册"→ 填邮箱 + 密码 + 显示名 → 收到验证邮件 → 点确认后登录 → 进入 Calculator 空态页。

### 场景 2：日常登录
> 卖家上班后打开 `/calculator`，如果 Supabase Session 还有效则直接进入；如果过期则跳 `/login?error=...`，输入邮箱密码后进入。

### 场景 3：主动退出
> 在 Calculator 页 header 右上角点"退出登录" → Session 清除 → 跳 `/login?success=signed-out`。

### 场景 4：Session 过期
> 登录状态下 Supabase token 过期 → 下一次访问受保护路由时 middleware 重定向到 `/login?error=session-expired`。

### 场景 5：跨设备登录
> 用户在电脑登录后，用手机浏览器登录同一账号 → 商品和测算记录完全同步（因为所有数据都存在 Supabase）。

---

## 3. 功能清单（WHAT）

### 3.1 MUST HAVE（已实现 ✅）
| # | 功能 | 状态 |
|---|------|------|
| F-1 | 邮箱 + 密码注册（可选显示名） | ✅ |
| F-2 | 邮箱 + 密码登录 | ✅ |
| F-3 | Session 持久化（Supabase SSR cookie） | ✅ |
| F-4 | 登出 | ✅ |
| F-5 | 邮箱验证回调（PKCE + `verifyOtp`） | ✅ |
| F-6 | 路由保护（middleware） | ✅ |
| F-7 | 注册自动在 `profiles` 表建档（DB trigger） | ✅ |
| F-8 | 数据隔离（RLS + Server Action 双层） | ✅ |
| F-9 | 管理员角色标记（`profiles.role = 'admin'`） | ✅（占位，后台在 Step 6） |

### 3.2 SHOULD HAVE（延后）
| # | 功能 | 计划 Phase |
|---|------|----------|
| F-10 | 密码重置（忘记密码） | 未排期 |
| F-11 | 邮箱变更 | 未排期 |
| F-12 | 第三方登录（微信/Google） | v0.2.0 |

### 3.3 COULD HAVE（候选）
| # | 功能 | 计划 |
|---|------|------|
| F-13 | 二次验证（2FA/TOTP） | v1.0.0 |
| F-14 | 设备管理（查看活跃 session） | v1.0.0 |
| F-15 | 企业 SSO | v1.0.0 |

---

## 4. 业务规则

### 4.1 注册规则
- **邮箱**：必须符合 RFC 5322 格式（Zod `z.string().email()`）
- **密码**：6-72 字符（Supabase bcrypt 72 字节上限）
- **确认密码**：两次输入必须一致
- **显示名**：可选，≤50 字符，空白字符自动 trim；如果为空则不写入 `profiles`
- **邮箱去重**：Supabase 原生保证（同一邮箱不可重复注册）
- **注册后行为**：立即 `signOut()` → 跳 `/login?success=registered`（避免"注册即登录"导致未验证账号进入受保护路由）

### 4.2 登录规则
- 登录失败统一返回 Supabase error message（如"Invalid login credentials"）
- 登录成功 → `redirect('/calculator')`
- Session 通过 `@supabase/ssr` 的 cookie 机制持久化（默认 1 小时 access + 1 周 refresh）

### 4.3 登出规则
- `signOut` 签名为 `(_formData?: FormData): Promise<void>`（对齐 `<form action>` 契约）
- 出错时 `redirect('/login?error=signout')`（不抛异常，避免 UI 卡死）
- 成功 `redirect('/login?success=signed-out')`

### 4.4 邮件验证回调规则
- `/auth/callback` 同时处理 **OAuth code 流** 和 **PKCE token_hash 流**
- `type` 参数必须在白名单内：`['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']`
- 防 open redirect：`next` 参数只接受 `/` 开头的相对路径
- Gmail 扫描 bot 预取一次性 token 是已知问题（开发期方案：Supabase Dashboard 关闭 `Confirm email`；生产级方案在 PRD-08 讨论）

### 4.5 权限与数据隔离规则
- **普通用户**：只能访问自己的 `products` / `calculations`（`WHERE user_id = auth.uid()`）
- **管理员**：可读写所有用户的业务数据（通过 `public.is_admin()` SECURITY DEFINER 函数判断）
- **防御纵深**：Server Action 层必须显式传 `userId` 给 repository，不依赖 RLS 单层
- **RLS 递归禁止**：admin policy **禁止** 写 `EXISTS (SELECT FROM profiles ...)`，必须用 `public.is_admin()` 函数

---

## 5. 交互细节

### 5.1 页面与路由
| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | `src/app/(auth)/login/page.tsx`（SC） | 登录页，SC 处理 searchParams feedback，传给 `LoginForm` CC |
| `/register` | `src/app/(auth)/register/page.tsx`（SC） | 注册页，同构 |
| `/auth/callback` | `src/app/auth/callback/route.ts` | 邮件确认回调 route handler |
| `/calculator` | `src/app/(dashboard)/calculator/page.tsx` | 登录后主页（受保护） |

### 5.2 表单技术选型（已踩坑并固化）
- **不用 `react-hook-form + zodResolver`**（Zod 4 + React 19 concurrent 下 refine 会静默失败，按钮无反应）
- **用 native `<form action={formAction}>` + `useActionState`**（Next.js 16 推荐）
- Schema 校验 100% 放在 Server Action 里（`loginSchema.safeParse` / `registerSchema.safeParse`）

### 5.3 错误与成功反馈
通过 URL searchParams 传递，避免 SC/CC 之间传函数：

| 参数 | 场景 | UI 表现 |
|------|------|---------|
| `?success=registered` | 注册成功 | 登录页顶部显示绿色提示 |
| `?success=signed-out` | 登出成功 | 登录页顶部显示灰色提示 |
| `?error=callback` | 邮箱回调失败 | 登录页顶部显示红色错误 |
| `?error=signout` | 登出失败 | 同上 |
| `?error=session-expired` | Session 过期 | 同上 |

---

## 6. 数据模型

### 6.1 `public.profiles` 表
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 自动建档 Trigger
```sql
-- 用户在 auth.users 表注册后，自动在 public.profiles 建对应行
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 6.3 RLS Policies（最终形态，见 migration 005）
```sql
-- 用户自身
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 管理员（通过 SECURITY DEFINER 函数避免递归）
CREATE POLICY "admin_manage_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```

### 6.4 Zod Schema（`src/lib/schemas/auth.ts`）
```ts
loginSchema    = { email, password (6-72) }
registerSchema = { email, password, confirmPassword, displayName? }
                 + .refine(password === confirmPassword)
```

---

## 7. 验收标准（Definition of Done）

### 7.1 功能性验收
- [ ] 新用户注册 → Supabase `auth.users` + `public.profiles` 均有记录
- [ ] 注册后跳转 `/login?success=registered`，显示绿色提示
- [ ] 已注册邮箱再次注册 → 返回"User already registered"错误
- [ ] 错误密码登录 → 返回"Invalid login credentials"
- [ ] 登录成功 → 跳 `/calculator`
- [ ] 未登录访问 `/calculator` → 重定向 `/login`
- [ ] 登出按钮（Calculator header）可点 → 跳 `/login?success=signed-out`
- [ ] 关闭浏览器再打开 → 仍是登录状态（Session 持久化）
- [ ] 邮件确认点击 → `/auth/callback` → `/login?success=registered`
- [ ] Gmail 预取 token 场景 → 用户实际能登录（Dashboard 方案已验证）

### 7.2 数据隔离验收
- [ ] A 用户登录 → 只能看到自己的 `products`，看不到 B 用户的
- [ ] A 用户通过 API 传 B 用户 `productId` → Server Action 返回 `{ ok: false, error: '商品不存在或无权删除' }`
- [ ] Admin 账号（手动设 `role='admin'`）→ 可通过 RLS 读所有用户数据

### 7.3 测试验收
- [ ] `src/__tests__/unit/auth/callback.test.ts` 12 个用例全部通过
- [ ] `src/__tests__/component/auth/LoginForm.test.tsx` / `RegisterForm.test.tsx` 全部通过
- [ ] 注册流程 E2E 手动验证通过（已验证 2026-04-22）

---

## 8. 非功能需求

### 8.1 安全
- 密码 bcrypt by Supabase（客户端永远不碰明文，只通过 HTTPS 传）
- 邮箱验证 token 一次性（Supabase 默认）
- CSRF 防护：Next.js Server Action 默认启用
- RLS：所有表 `ENABLE ROW LEVEL SECURITY`，policy 默认拒绝

### 8.2 性能
- 登录/注册响应 < 1s（主要受 Supabase 网络延迟影响）
- Session 检查（middleware）< 50ms

### 8.3 可访问性
- 表单字段有 `<label>` 关联
- 错误提示有 `role="alert"`
- 键盘可完整操作（Tab + Enter）

---

## 9. 依赖、约束与风险

### 9.1 依赖
- Supabase 云项目（ref: `wbwyduolialawvnpuoyn`，Free tier 7 天无活动会 pause）
- `@supabase/ssr 0.9.0`（SSR cookie 管理）
- Next.js 16.2.1 Server Actions
- `package.json` 的 `dev:webpack` script（macOS 中文路径必须）

### 9.2 技术约束
- **禁止** RHF + zodResolver + refine schema（已验证会静默失败）
- **禁止** 在 RLS policy 里 `SELECT FROM profiles`（会触发递归）
- **禁止** 把 Zod schema 从 Server Component 直接传给 Client Component（class 跨边界禁止）
- **必须** 用 `public.is_admin()` SECURITY DEFINER 函数做管理员判断

### 9.3 已知风险与缓解
| 风险 | 严重度 | 当前缓解 | 长期方案 |
|------|-------|---------|---------|
| Gmail 预取 token 消费 | Low | Dashboard 关 `Confirm email` | Phase 5.7 改 callback 为 CC + `useEffect verifyOtp` |
| Free tier pause | Low | 手动 Restore | 升级付费 plan |
| Session 过期体验差 | Low | middleware 自动跳转 | Phase 5.7 加 refresh token 自动续期 |
| 密码弱强度 | Medium | 暂无前端强度校验 | v0.2.0 加 zxcvbn 前端校验 |

---

## 10. 相关文档
- 实施计划：Step 4（已归档）
- 踩坑记录：`feedback_supabase_auth.md`（memory）、`feedback_nextjs16_breaking.md`
- 本轮修复：`docs/20260422-checkpoint.md` §9（RLS + PKCE + 退出按钮）
