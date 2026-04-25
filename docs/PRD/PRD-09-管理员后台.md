# PRD-09: 管理员后台（Admin Console）

| 字段 | 值 |
|------|-----|
| 模块 | `/admin/*` 路由，9 项管理员功能 |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Step 6，建议拆 6.1/6.2/6.3 三个子阶段） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q9 / Q10 / Q11 / Q14（2026-04-24） |
| 预期代码位置 | `src/app/admin/*`、`src/app/actions/admin/*`、`src/lib/repositories/{taxConfigRepository,auditLogRepository,announcementRepository}.ts` |
| DB 入口 | 新增 migration 007（audit_log）+ 008（announcement）+ 009（profile.is_disabled） |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
v0.1.0 的税率是**硬编码**在 `engine.ts` 里的常量，意味着：
- 俄罗斯税务局调整税率时要改代码 + 重部署
- 档位阈值调整一样要发版
- 无法在生产上审计"是谁改了哪个税率"
- 无法给个别用户发停机通知

没有管理员后台，产品就没法长期运维。

### 1.2 产品价值
- **配置型**：税率 / 档位 / 阈值从 DB 读取，运营可自助维护
- **授权型**：可晋升信任用户为 admin，自身不必永远唯一掌控
- **审计型**：所有敏感操作留痕，合规基础
- **沟通型**：公告系统触达所有用户

### 1.3 业务地位
Step 6 是 v0.1.0 的**最后一块版图**，之后进入 Step 7 部署上线。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：税率调整
> 俄罗斯联邦税务局 2026 年 6 月把 USN-6% 调成 USN-7% → 管理员登录 → 进 `/admin/tax-config` → 修改 USN-6% 参数 → 保存 → 所有用户的新测算立即用 7%；历史测算打开时也用 7%（Q9 决策）。

### 场景 2：用户投诉
> 某用户报告"无法登录" → 管理员进 `/admin/users` → 查该邮箱 → 看到 `is_disabled = true`（某天不小心禁用了）→ 切回启用。

### 场景 3：发版维护
> 管理员准备周末升级 Supabase → 进 `/admin/announcements` → 发公告"本周六 22:00-23:00 维护升级" → 所有用户 Calculator 页顶部显示 banner。

### 场景 4：审计追溯
> 用户反馈"我的测算数字对不上" → 管理员查 `/admin/audit-log` → 发现 3 天前另一管理员调整了 tier2 的 vatDivisor → 解释原因。

### 场景 5：晋升团队成员
> 公司新增一位财税顾问 → 他注册账号后，管理员进 `/admin/users` → 找到他的邮箱 → 点"升为管理员" → 下次登录即有 admin 权限。

---

## 3. 功能清单（WHAT）

**Q11 决策：完整 9 项功能全做**。建议在实施时拆成 3 批：

### 3.1 Batch 6.1（核心配置，最优先）

| # | 功能 | 路由 | 操作 |
|---|------|------|------|
| F-1 | **税率配置** | `/admin/tax-config` | CRUD：USN-6% / USN-15% / OSNO 各项参数 |
| F-2 | **档位阈值** | `/admin/tier-thresholds` | 修改 2000万 / 2.5亿 / 4.5亿 三档边界 |

### 3.2 Batch 6.2（用户管理）

| # | 功能 | 路由 | 操作 |
|---|------|------|------|
| F-3 | **用户列表** | `/admin/users` | 查看：邮箱 / 注册时间 / 商品数 / 测算数 / 角色 / 状态 |
| F-4 | **角色晋升** | `/admin/users` | 切换 `profiles.role` 为 admin/user |
| F-5 | **账号禁用** | `/admin/users` | 切换 `profiles.is_disabled` |
| F-6 | **账号删除** | `/admin/users` | 级联删用户所有数据（危险操作：三次确认） |

### 3.3 Batch 6.3（审计 + 内容）

| # | 功能 | 路由 | 操作 |
|---|------|------|------|
| F-7 | **测算审计** | `/admin/calculations` | 汇总报表：用户 × 日 的测算次数/金额 |
| F-8 | **操作日志** | `/admin/audit-log` | 所有 admin 操作的只读流水 |
| F-9 | **公告管理** | `/admin/announcements` | CRUD 公告（生效时间、显示范围） |

### 3.4 不做（Out of Scope）
- ❌ 报表导出 PDF/Excel（v0.2.0）
- ❌ 多 admin 协作（审批流）（v1.0.0）
- ❌ Admin 自己的通知中心（v0.2.0）
- ❌ 多语言（俄语管理界面）（v1.0.0）

---

## 4. 业务规则

### 4.1 角色与权限（**Q10 决策**）

**权限检查链**：
```
1. Next.js middleware: 路径以 /admin 开头 → 检查是否登录 → 否则 /login
2. layout /admin/layout.tsx (SC): SSR 读 profile → role !== 'admin' → /403
3. Server Action: 再查一次 role（防 session 过期）
4. RLS policy admin_manage_*: 数据库兜底
```

**首个 admin 创建**（**Q14 决策：手动 SQL**）：
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'xu@example.com';
```
只部署后在 Supabase Dashboard SQL Editor 执行一次。**绝不**自动晋升首个用户。

### 4.2 税率配置（F-1）

**表结构**（复用 `tax_config`）：
```sql
-- migration 004 已创建
CREATE TABLE public.tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL,         -- 'tier1' | ... | 'tier4'
  regime TEXT NOT NULL,       -- 'usn6' | 'usn15' | 'osno'
  params JSONB NOT NULL,      -- 可配置税率 / 阈值 / 除数等
  effective_date DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**params JSONB 结构**（按税制不同）：
```json
// USN-6%
{ "incomeTaxRate": 0.06, "customsVatRate": 0.22 }

// USN-15%
{ "incomeTaxRate": 0.15, "customsVatRate": 0.22 }

// OSNO
{ "corporateTaxRate": 0.25, "vatRate": 0.22 }

// tier2/3 vatDivisor
{ "vatDivisor": 105, "vatRate": 0.05 }  // tier2 5%
{ "vatDivisor": 107, "vatRate": 0.07 }  // tier3 7%
```

**变更规则**（**Q9 决策：历史用最新税率**）：
- 每次编辑 **覆盖** `params`（不插新行）
- 但要在 `audit_log` 记录 before/after（审计目的）
- `effective_date` 仅做展示，不影响计算（因为所有历史都用最新）
- UI 上明确提示"修改后所有历史测算将用新税率"

**校验**：
- 税率 0 ≤ rate ≤ 1（同商品 `dutyRate` 规则）
- `vatDivisor` > 100
- 所有字段必填

### 4.3 档位阈值（F-2）

**数据源**：目前是 `src/lib/calc/engine.ts` 的 `REVENUE_TIERS` 常量硬编码。

**迁移策略**：
- 新增 migration 在 `tax_config` 加一行 `{ tier: 'global', regime: 'thresholds', params: {...} }`
- 引擎层加兜底：读 DB 失败 → fallback 到代码常量
- 改阈值 = 改这行 JSON

**UI**：3 个 number 输入框（2000万 / 2.5亿 / 4.5亿）+ 保存按钮。

### 4.4 用户列表（F-3）

**字段**：
- 头像（若无就是 emoji 初始字母）
- 邮箱
- 显示名
- 注册时间
- **商品数**（SQL COUNT `products`）
- **测算数**（SQL COUNT `calculations`）
- 角色（`user` / `admin`）
- 状态（正常 / 禁用）
- 最后登录时间（从 `auth.users.last_sign_in_at` 读）

**查询**：
```sql
SELECT p.*, 
  (SELECT COUNT(*) FROM products WHERE user_id = p.id) AS product_count,
  (SELECT COUNT(*) FROM calculations WHERE user_id = p.id) AS calc_count,
  u.last_sign_in_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 50;
```

**分页**：每页 50 条。

### 4.5 角色晋升（F-4）
- UI：下拉菜单 "user / admin"
- 规则：不能把自己降级为 user（防"最后一个管理员消失"）
- Server Action 前置检查：`if (targetId === currentAdminId && newRole === 'user') return error("不能降级自己")`
- 写 audit_log

### 4.6 账号禁用（F-5）

**需要 DB schema 扩展**（migration 009）：
```sql
ALTER TABLE public.profiles ADD COLUMN is_disabled BOOLEAN DEFAULT false;
```

**行为**：
- 禁用状态下用户能登录但会被 middleware 检查 `is_disabled` → 重定向 `/login?error=disabled`
- 或更激进：禁用后立即 `supabase.auth.admin.signOut()` 踢下线（需 service_role key）
- 写 audit_log

### 4.7 账号删除（F-6，危险）

**三次确认**：
1. 列表上点"删除" → 打开 Modal "确认删除用户 X？"
2. Modal 内要输入用户邮箱才能点"继续"
3. 继续后再显示 "这将永久删除 N 个商品和 M 个测算记录，此操作不可逆"

**DB 效果**：
- `DELETE FROM auth.users WHERE id = ?`（需要 service_role）
- `profiles` 自动 CASCADE 删除
- `products / calculations` 自动 CASCADE 删除
- `audit_log` 记录删除事件（保留 trace）

### 4.8 测算审计（F-7）

**默认视图**：
- 按日 × 用户 的矩阵（最近 30 天）
- 单元格 = 当天该用户的测算数
- 可切换到"按金额"（总营业额）
- 可筛选：时间范围 / 用户 / 税制

**数据源**：
```sql
SELECT DATE(created_at) AS day, user_id, COUNT(*) AS cnt, SUM(revenue) AS sum_revenue
FROM calculations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), user_id
ORDER BY day DESC;
```

### 4.9 操作日志（F-8）

**需要 migration 007**：
```sql
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,         -- 'update_tax_config' | 'disable_user' | ...
  target_type TEXT,              -- 'tax_config' | 'user' | 'announcement'
  target_id TEXT,                -- 目标实体的 id（UUID 或复合键）
  before JSONB,
  after JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id);

-- RLS: 只有 admin 能读，所有人都不能写（只通过 Server Action）
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
```

**写日志的场景**：F-1/2/4/5/6/9 所有写操作都 append 一行。

**UI**：按时间倒序列表，可筛选 `actor_id / action / target_type / 时间范围`。

### 4.10 公告系统（F-9）

**需要 migration 008**：
```sql
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 所有登录用户可读
CREATE POLICY "users_read_announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

-- 只有 admin 可写
CREATE POLICY "admin_manage_announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```

**Calculator 页展示**：
- 加载时查询 `starts_at <= now() <= ends_at` 的公告
- 顶部 banner（info 蓝 / warning 橙 / critical 红）
- 多条时取最新一条显示，其他折叠

---

## 5. 交互细节

### 5.1 路由与布局
```
/admin                              Dashboard（概览：总用户/总商品/总测算）
/admin/tax-config                   F-1
/admin/tier-thresholds              F-2
/admin/users                        F-3/4/5/6
/admin/calculations                 F-7
/admin/audit-log                    F-8
/admin/announcements                F-9
```

**共用布局**（`/admin/layout.tsx`）：
```
┌────────────────────────────────────────┐
│ AdminHeader                            │
│ 跨境电商系统 · 后台  [xu@...] [退出登录] │
├─────────┬──────────────────────────────┤
│ Sidebar │ Main Content                 │
│ 概览    │                              │
│ 税率   │                              │
│ 档位   │                              │
│ 用户   │                              │
│ 审计   │                              │
│ 日志   │                              │
│ 公告   │                              │
└─────────┴──────────────────────────────┘
```

### 5.2 风格约束
- 严格遵循 DEVELOPMENT_STRATEGY §2.3 后台布局规范（sidebar 240px）
- 颜色 / 字体 / 圆角同主应用 Design Tokens
- 表格 / 按钮 / 输入框规范一致

### 5.3 高危操作 UX
- 角色变更：确认 Modal
- 禁用账号：确认 Modal + 写理由（可选字段存入 audit_log）
- 删除用户：三次确认（如 F-6 所述）
- 税率修改：保存前显示 before/after diff

---

## 6. 数据模型汇总

### 6.1 复用现有表
- `profiles`（migration 001 + 005）
- `products`（002）
- `calculations`（003 + 006 若 PRD-08 已落地）
- `tax_config`（004）

### 6.2 新增 migrations
| # | 文件 | 内容 |
|---|------|------|
| 007 | `007_create_audit_log.sql` | audit_log 表 + RLS |
| 008 | `008_create_announcements.sql` | announcements 表 + RLS |
| 009 | `009_add_profile_is_disabled.sql` | profiles 加 is_disabled 列 |

### 6.3 Server Actions
```
src/app/actions/admin/
├── taxConfig.ts       update / list
├── tierThresholds.ts  update / list
├── users.ts           list / updateRole / toggleDisabled / delete
├── calculations.ts    listAggregate
├── auditLog.ts        list
└── announcements.ts   create / update / delete / list
```

---

## 7. 验收标准（Definition of Done）

### 7.1 权限验收
- [ ] 未登录访问 `/admin` → `/login`
- [ ] 登录 + 非 admin 访问 `/admin` → `/403` 或 `/calculator?error=forbidden`
- [ ] Admin 用户访问 `/admin` 全路由正常
- [ ] 管理员不能降级自己

### 7.2 功能验收（每个 F-*）
- [ ] F-1: 修改税率 → 普通用户立即用新税率
- [ ] F-2: 修改档位阈值 → 计算引擎读到新值
- [ ] F-3: 列表分页，数据正确（商品数/测算数 ≥ 真实值）
- [ ] F-4: 晋升成功 → 目标用户下次登录可进 `/admin`
- [ ] F-5: 禁用成功 → 目标用户下次登录被拦
- [ ] F-6: 删除用户 → 所有关联数据级联删
- [ ] F-7: 审计矩阵正确显示最近 30 天
- [ ] F-8: 每个敏感操作都写了 audit_log
- [ ] F-9: 公告在 Calculator 顶部显示正确

### 7.3 数据完整性
- [ ] 税率修改：audit_log 有 before/after JSONB
- [ ] 角色变更：audit_log 记录 actor + target + before/after
- [ ] 删除用户：audit_log 记录（即使 profiles 被删，audit_log 保留）

### 7.4 安全验收
- [ ] 非 admin 调 admin Server Action → 返回错误
- [ ] 绕过 UI 直接 INSERT audit_log → RLS 拦截
- [ ] 敏感操作（删用户）必须多次确认

### 7.5 测试验收
- [ ] `src/__tests__/unit/actions/admin/*.test.ts` 每个 action ≥ 3 用例
- [ ] RLS 集成测试：验证 admin vs user 查询结果差异
- [ ] 管理员登录后完整跑一遍 9 项功能的 E2E

---

## 8. 非功能需求

### 8.1 性能
- 用户列表分页 50 条 < 500ms
- 审计矩阵（30 天 × 100 用户）< 1s
- audit_log 查询 < 200ms（有索引）

### 8.2 安全
- 所有敏感 Server Action 用 `service_role key`（不是 anon key）
- `service_role key` 只放服务端 `.env.local`，不暴露给浏览器
- middleware 在 edge runtime 检查 role（高性能）

### 8.3 可用性
- 危险操作有明确视觉区分（红色按钮、警告图标）
- 所有表单有 "取消 / 保存"
- 错误提示清晰（如"你无权降级自己"）

---

## 9. 依赖、约束与风险

### 9.1 依赖
- PRD-01 用户认证（role 字段、is_admin 函数）
- PRD-02 计算引擎（消费 tax_config）
- PRD-03 商品管理（级联关系）
- PRD-08 测算记录（级联关系）
- Supabase `service_role` key（管理员操作）

### 9.2 技术约束
- **必须** 所有敏感操作写 audit_log（审计红线）
- **必须** middleware + layout + Server Action 三层 role 检查（防御纵深）
- **禁止** 在客户端使用 service_role key
- **禁止** 普通用户 role 字段自服务修改（只能 admin 改）

### 9.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| 管理员误降级自己导致系统无 admin | **High** | 代码级校验 + DB trigger 兜底 |
| 税率修改后历史"数据静默变化"引发投诉 | **High** | Calculator UI 加变更提示（PRD-08 F-10 已设计） |
| service_role key 泄露 | **Critical** | .env 不入仓 + 只在 Server Action 内使用 + 必要时轮换 |
| audit_log 无限增长 | Medium | v0.2.0 加归档策略（>1 年数据转冷库） |
| 删除用户后相关 audit_log 失去"谁是 target" | Low | target_id 用 TEXT（保留 UUID 字符串，即使 profile 已删 audit_log 仍有证据） |
| 完整 9 项功能工作量大 | Medium | 分 6.1/6.2/6.3 三个子阶段，不一次上线 |

---

## 10. 相关资源
- 实施计划：`DEVELOPMENT_STRATEGY.md` §Step 6（粗略） + 本 PRD 细化
- 上游 PRD：PRD-01 / PRD-02 / PRD-03 / PRD-04 / PRD-08
- 头脑风暴决策：Q9（税率重算哲学）/ Q10（同一应用）/ Q11（完整 9 项）/ Q14（手动 SQL 首个 admin）
- Supabase 云项目：`wbwyduolialawvnpuoyn`
- 新增 migrations：007 / 008 / 009
