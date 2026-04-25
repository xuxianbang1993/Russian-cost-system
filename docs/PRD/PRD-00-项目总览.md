# PRD-00: 项目总览（ELSCBSSXT）

| 字段 | 值 |
|------|-----|
| 产品代号 | ELSCBSSXT（俄罗斯出海成本税费计算系统） |
| 版本 | v0.1.0（开发中） |
| 状态 | Phase 5.3 已完成代码，整体进度约 60% |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联文档 | `DEVELOPMENT_STRATEGY.md` / `docs/plans/*.md` |

---

## 1. 需求背景（WHY）

### 1.1 业务痛点
中国跨境电商卖家出海俄罗斯市场时，普遍面临三个信息不对称问题：
1. **税制选择盲区**：俄罗斯有 USN-6%、USN-15%、OSNO 三种税制，选错会多缴数倍税款；大多数卖家凭经验或听销售建议盲选。
2. **成本结构黑箱**：海关增值税、收入税、平台佣金、头程物流、附加增值税等多项费用叠加，卖家对"1 亿卢布营收到底能留下多少净利"缺乏可量化认知。
3. **销量规划无依据**：同一商品在不同销量档位下，最优税制会切换（营收 >4.5 亿强制 OSNO），缺乏工具支持"销量增长规划"。

### 1.2 产品价值主张
> **输入商品参数 + 营收档位 + 支出结构，30 秒内给出三种税制的总税额、净利润、利润率对比，并推荐税负最低方案。**

### 1.3 不做什么（Out of Scope）
- ❌ 不做真实的纳税申报（只是测算工具，不对接俄罗斯税务局 API）
- ❌ 不做多币种自动汇率（汇率由用户手输，当前版本不对接实时汇率 API）
- ❌ 不做物流询价（`shippingMethod` 只支持两档枚举：`standard` / `east`）
- ❌ 不做商品图片上传（仅支持 emoji 作为视觉标识）

---

## 2. 用户画像（WHO）

| 角色 | 典型画像 | 核心诉求 |
|------|---------|---------|
| **普通用户**（Role: `user`） | 跨境电商卖家 / 财务 / 运营 | 快速测算单个 SKU 在不同税制下的成本与利润；保存多个商品、多份测算 |
| **管理员**（Role: `admin`） | 平台运营 / 财税顾问 | 维护税率参数（`tax_config` 表）；查看全用户数据审计 |

### 用户故事
- **US-1**（普通用户）：作为一名家居用品跨境卖家，我想**录入一个新商品的售价/成本/重量**，这样我能**一键看到在 USN-6% 和 USN-15% 下分别的税额和净利**。
- **US-2**（普通用户）：作为已经营两年的成熟卖家，我想**把去年的 5 个爆品录入系统**，这样我能**一次性对比每个 SKU 在不同税制下的利润率矩阵**。
- **US-3**（普通用户）：作为正在筹备融资的创始人，我想**模拟销量从 2000 万到 5 亿的利润曲线**，这样我能**给投资人展示规模效应**。
- **US-4**（管理员）：作为平台运营，我想**修改 USN-6% 的税率参数**（如果俄罗斯联邦税务局调整），这样**所有用户的新测算会自动用新税率**。

---

## 3. 功能模块总览（WHAT）

### 3.1 已实现功能（✅）
| 模块 | PRD | 对应代码 |
|------|-----|---------|
| 用户认证系统 | [PRD-01](./PRD-01-用户认证.md) | `src/app/actions/auth.ts`、`src/app/(auth)/*`、`supabase/migrations/001+005` |
| 核心计算引擎 | [PRD-02](./PRD-02-核心计算引擎.md) | `src/lib/calc/engine.ts`、`src/lib/calc/types.ts` |
| 商品管理 | [PRD-03](./PRD-03-商品管理.md) | `src/app/actions/products.ts`、`src/components/calculator/ProductManager.tsx`、`supabase/migrations/002` |
| 成本测算工作台 | [PRD-04](./PRD-04-成本测算工作台.md) | `src/components/calculator/CalculatorShell.tsx`、`src/contexts/calculator/*` |

### 3.2 规划中功能（⏳）
| 模块 | PRD | 关联 Phase |
|------|-----|----------|
| 税制对比视图 | PRD-05（待编写） | Phase 5.4 |
| 多品对比视图 | PRD-06（待编写） | Phase 5.5 |
| 批量销量模拟 | PRD-07（待编写） | Phase 5.5 |
| 测算记录管理 | PRD-08（待编写） | Phase 5.6 |
| 管理员后台 | PRD-09（待编写） | Step 6 |
| 部署与运维 | PRD-10（待编写） | Step 7 |

---

## 4. 全局业务规则

### 4.1 财务数字红线（零容忍）
1. **税务文档数字照搬**：所有税率常量必须能追溯到《税制解说（内部版）》的具体页码，禁止凭记忆填写。
2. **发现不一致先提问**：如果发现用户输入的数字与规则冲突（如 dutyRate > 1.0），**只提示，不擅自修改**。
3. **精度规则**：
   - 金额：保留 2 位小数（卢布）
   - 税率存储：保留 4 位小数（`0.0600` 表示 6%）
   - 百分比显示：保留 2 位小数（`6.00%`）

### 4.2 税制适用规则
| 档位 | 营业额范围（卢布） | 可选税制 |
|------|---------------|---------|
| tier1 | 0 – 2000 万 | USN-6% / USN-15% |
| tier2 | 2000 万 – 2.5 亿 | USN-6% / USN-15% |
| tier3 | 2.5 亿 – 4.5 亿 | USN-6% / USN-15% |
| tier4 | > 4.5 亿 | **强制 OSNO** |

### 4.3 数据隔离红线
- **RLS 双层防御**：每张用户数据表都必须有 `users_manage_own_*`（`auth.uid() = user_id`）+ Server Action 层再做一次 `userId` 过滤，**不允许只依赖 RLS 单层**（防御纵深）。
- **管理员检查**：通过 `is_admin()` SECURITY DEFINER 函数，**绝不允许**在 policy 里直接 `SELECT FROM profiles`（会触发无限递归）。

---

## 5. 技术栈（What stack）

| 层 | 选型 | 约束 |
|----|------|------|
| 框架 | **Next.js 16.2.1**（App Router） | 必须读 `node_modules/next/dist/docs/` 再写 API，不能凭记忆 |
| React | **React 19.2.4** + React Compiler | 禁止 `class` 跨 SC/CC 边界（RSC 序列化限制） |
| 数据库 | **Supabase**（@supabase/ssr 0.9.0） | `cookies()` 必须 `await` |
| UI | **Tailwind v4**（`@theme inline` 两层 token） + shadcn/ui | 禁止硬编码颜色值 |
| 表单 | **native `<form action>` + useActionState** for auth；**RHF + zodResolver** for non-refined schemas | 有 `.refine()` 的 Zod schema 不用 RHF（踩坑已验证） |
| 图表 | **Recharts**（Phase 5.4 引入） | — |
| 测试 | **Vitest** + jsdom + RTL | 6 个黄金用例 + 覆盖率 >90% |
| 部署 | **Docker** standalone output | Step 7 |

---

## 6. 全局非功能需求

### 6.1 性能
- **首屏 TTI < 3s**（Calculator 页）
- **计算响应 < 50ms**（所有参数变化到结果刷新）
- **商品列表 < 500ms**（Supabase 查询 + 渲染）

### 6.2 安全
- 所有 Server Action 必须先检查 `auth.getUser()`，未登录返回 `{ ok: false, error: '请先登录' }`
- Repository 层 update/delete 必须同时过滤 `id` + `user_id`（防止 IDOR）
- 邮箱验证回调必须用 PKCE `verifyOtp`，不能只处理 OAuth `code`

### 6.3 可访问性（a11y）
- 所有交互元素有 `aria-label`
- Chip 选中态用 `aria-pressed`，不用 class 作为测试断言依据
- 编辑入口双通道（双击 + 显式按钮）

### 6.4 兼容性
- 桌面优先（>1024px 双栏）
- ≤1024px 单列布局（左面板在上）
- 浏览器：Chrome/Safari/Edge 最新两个版本

---

## 7. 成功指标（Success Metrics）

| 维度 | 指标 | 目标值 |
|------|------|-------|
| 正确性 | 6 个黄金税务测试用例通过率 | **100%**（硬性验收） |
| 测试覆盖 | 单元测试覆盖率 | > 90%（计算引擎必须达标） |
| 代码质量 | Peer Review 综合分 | ≥ 7.0/10 且无单维度 ≤3 |
| 响应性 | 参数变化到结果刷新 | < 50ms |
| 可用性 | 注册 → 首次完成测算 | < 5 分钟 |

---

## 8. 关联外部资源

| 资源 | 位置 | 用途 |
|------|------|------|
| 开发纪律文档 | `DEVELOPMENT_STRATEGY.md` | 强制红线（Step 门控、Design Tokens、测试策略） |
| Step 5 实施计划 | `docs/plans/2026-03-28-step5-implementation-plan.md` | 前端 Phase 5.1-5.6 的 Task 级细分 |
| Step 5 架构设计 | `docs/plans/2026-03-28-step5-calculator-frontend-design.md` | Calculator 组件树、数据流、Context 结构 |
| 本轮 Checkpoint | `docs/20260422-checkpoint.md` | 截止 2026-04-22 的代码/环境现状 |
| Supabase 项目 | ref `wbwyduolialawvnpuoyn`（Free tier，亚太 region） | 已部署 4 张表 + 5 个 migrations |

---

## 9. 发展路线图（Roadmap）

```
v0.1.0（当前）
├── Step 1-4: 脚手架 + 计算引擎 + 数据层 + 认证       ✅
├── Step 5: 前端                                   🔄 (5.1/5.2/5.3 已完成；5.4-5.6 进行中)
│   ├── Phase 5.4: 税制对比视图（KPI + 图表 + 表格）
│   ├── Phase 5.5: 多品对比 + 批量模拟
│   ├── Phase 5.6: 保存测算 + 集成测试
│   └── Phase 5.7: UX 打磨（Zod 本土化 / Gmail 预取 token 生产方案）
├── Step 6: 管理员后台                              ⏳
└── Step 7: Docker 部署                             ⏳

v0.2.0（候选规划）
├── 实时汇率 API 集成
├── 多币种支持（USD/EUR/CNY/RUB）
├── 测算历史可视化（趋势图）
└── 团队协作（多用户共享商品库）

v1.0.0（候选规划）
├── 俄罗斯税务局 API 对接（如有开放接口）
├── 自动纳税申报表生成
└── SaaS 化（多租户 + 订阅计费）
```

---

## 10. 术语表（Glossary）

| 术语 | 含义 |
|------|------|
| **USN** | Упрощённая система налогообложения（简易税制） |
| **OSNO** | Общая система налогообложения（一般税制） |
| **VAT** | 增值税（海关 VAT 22% + 档位附加 VAT） |
| **tier** | 营收档位（tier1-tier4） |
| **declaredCost** | 海关申报成本（决定 VAT 基数） |
| **purchaseCost** | 采购成本（决定利润） |
| **PKCE** | Proof Key for Code Exchange（Supabase 邮件登录用的 OAuth 变种） |
| **RLS** | Row Level Security（Postgres 行级安全策略） |
| **SC / CC** | Server Component / Client Component |
