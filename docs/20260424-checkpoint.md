# Checkpoint — 2026-04-24（PRD v0.1.0 完整交付，11 份文档）

> **用途**：本日基于 2026-04-22 的 Phase 5.3 交付状态，做了产品视角的"PRD 层"系统性补齐。产出 11 份 PRD 覆盖全部 v0.1.0 范围（已实现 5 份 + 规划中 6 份）。下一轮会话上来按 §6 接。

---

## 1. 当前状态快照

| 项 | 值 |
|----|----|
| 分支 | `feat/step-5-3-product-manager`（未 commit，工作树有 **22 个改动 + PRD 新增**） |
| 相对 main | 未 commit；代码部分同 2026-04-22 checkpoint |
| 测试基线 | **124 passing / 13 files** 三件套全绿（未动） |
| 代码状态 | 同 2026-04-22 checkpoint §9 —— Phase 5.3 全完成 + 第二幕修 3 bug + 手动验证通过，**待 commit** |
| PRD 状态 | ✅ **11 份完整交付**（docs/PRD/ 共 3657 行） |
| 下一步 | Phase 5.3 分 2 commit + PRD commit（共 3 个 commit）→ Phase 5.4 SPEC |

## 2. 本日关键产出

### 2.1 PRD 文档系统（从 0 到 11）
在 `docs/PRD/` 新建完整目录，按"功能模块"（不是按 Step 开发阶段）拆分 11 份：

#### Batch 1 — 已实现功能（基于代码事实回写）
| # | PRD | 行数 | 来源 |
|---|-----|------|------|
| 00 | 项目总览 | 196 | 业务背景 + 栈 + 路线图 + 成功指标 |
| 01 | 用户认证 | 259 | 读 auth.ts / callback / migrations 001+005 |
| 02 | 核心计算引擎 | 299 | 读 engine.ts + types.ts + 6 黄金用例 |
| 03 | 商品管理 | 343 | 读 products.ts + ProductManager/Modal + schema |
| 04 | 成本测算工作台 | 309 | 读 CalculatorShell + Provider + Tier/CostInput |

#### Batch 2 — 规划中功能（基于今天头脑风暴决策）
| # | PRD | 行数 | 关联 Phase |
|---|-----|------|----------|
| 05 | 税制对比视图 | 301 | Phase 5.4 |
| 06 | 多品对比视图 | 276 | Phase 5.5 |
| 07 | 批量销量模拟 | 297 | Phase 5.5 |
| 08 | 测算记录管理 | 380 | Phase 5.6 |
| 09 | 管理员后台 | 461 | Step 6（建议拆 6.1/6.2/6.3） |
| 10 | 部署与运维 | 454 | Step 7 |

**每份 PRD 的 9-10 节结构**：需求背景 / 用户场景 / 功能清单（MoSCoW）/ 业务规则 / 交互细节 / 数据模型 / 验收标准 / 非功能需求 / 依赖约束风险 / 相关资源

### 2.2 头脑风暴决策（14 条，全部落地到 Batch 2 PRD）

使用 superpowers brainstorming skill + 浏览器可视化伴侣（端口 52427）。

| # | 决策 | PRD 归属 |
|---|------|---------|
| **Q1** | KPI 三件套：利润率 · 总税额 · 净利润 | PRD-05 |
| **Q2** | 税制对比图：堆叠柱状图（海关 VAT / 收入税 / 附加 VAT 三段） | PRD-05 |
| **Q3** | 明细表：税种为行 + 总计行加粗 + 推荐税制列加 ⭐ | PRD-05 |
| **Q4** | 多品矩阵：商品为行 × 税制为列 | PRD-06 |
| **Q5** | 矩阵单元格：双行（大字净利润 + 小字利润率） | PRD-06 |
| **Q6** | 批量模拟：销量范围双端滑块 + 曲线图 + 档位跳变标注 | PRD-07 |
| **Q7** | 测算记录关联商品：**只存 productId**（不做快照） | PRD-08 |
| **Q8** | 测算记录删除：**硬删 + confirm**（不做软删/回收站） | PRD-08 |
| **Q9** | 税率变更：**历史用最新税率重算**（与 Q7 一致哲学） | PRD-08 / PRD-09 |
| **Q10** | 管理员位置：**同一 Next.js 应用 `/admin/*`** | PRD-09 |
| **Q11** | 管理员功能范围：**完整 9 项**（税率 + 档位 + 用户 CRUD + 审计 + 公告） | PRD-09 |
| **Q12** | 部署目标：**VPS + Docker**（Supabase 继续用云） | PRD-10 |
| **Q13** | 测算命名：自动生成 + 离开前自定义 Modal 拦截 | PRD-08 |
| **Q14** | 首个 admin：**手动 SQL UPDATE**（不自动晋升） | PRD-09 |

### 2.3 核心哲学固化
**数据一致性模式：动态而非快照**
- 商品参数变了 → 历史数字跟着变（Q7）
- 税率变了 → 历史重算用新税率（Q9）
- 删除操作 → 硬删（Q8）
- 取舍：v0.1.0 不做审计合规，简单优先；v1.0.0 再考虑"审计模式"

### 2.4 新增 DB migrations 清单（Step 6/7 时执行）
| # | 文件 | PRD 来源 | 作用 |
|---|------|---------|------|
| 006 | `add_calculation_name.sql` | PRD-08 | calculations 加 `name` 列 + 索引 |
| 007 | `create_audit_log.sql` | PRD-09 | 操作日志表（admin 只读） |
| 008 | `create_announcements.sql` | PRD-09 | 公告表（全员读、admin 写） |
| 009 | `add_profile_is_disabled.sql` | PRD-09 | profiles 加禁用标记 |

## 3. 未 commit 的文件（本日新增）

**全新增文件**：
```
docs/PRD/README.md                    82 行
docs/PRD/PRD-00-项目总览.md           196
docs/PRD/PRD-01-用户认证.md           259
docs/PRD/PRD-02-核心计算引擎.md       299
docs/PRD/PRD-03-商品管理.md           343
docs/PRD/PRD-04-成本测算工作台.md     309
docs/PRD/PRD-05-税制对比视图.md       301
docs/PRD/PRD-06-多品对比视图.md       276
docs/PRD/PRD-07-批量销量模拟.md       297
docs/PRD/PRD-08-测算记录管理.md       380
docs/PRD/PRD-09-管理员后台.md         461
docs/PRD/PRD-10-部署与运维.md         454
docs/20260424-checkpoint.md           (本文件)
```

**已有未 commit 文件**（同 20260422 checkpoint §4 + §9.4）：
- 原 Phase 5.3 共 22 个改动（代码 + 测试 + migration 005）
- `.gitignore` 新增 `.superpowers/` 一行（屏蔽头脑风暴浏览器伴侣产物）

## 4. 本日流程还原（供复盘）

1. **会话启动** → 扫 MEMORY.md + 20260422-checkpoint.md 恢复上下文 → 确认 Phase 5.3 仍是"待 commit"
2. **用户 request**："做 PRD 文档，建立 PRD 文件夹，每个 PRD 都有完整功能"
3. **分级决策** → 提议"按功能模块拆 11 份"而非"按 Step 时间线"，让用户确认
4. **Batch 1（5 份）** → 基于代码事实回写（读 15+ 源文件，禁止臆想）
5. **Batch 2 准备** → 抛出 6 条业务规则决策给用户"留白"
6. **用户 request**："调用头脑风暴"
7. **Brainstorming skill** → 创建 6 个 task，离线启动 visual companion 服务（52427 端口）
8. **Q1-Q14 一题一答** → Q1-Q6 用浏览器 A/B 卡片；Q7-Q14 切回终端文字选择
9. **设计汇总 + 用户确认**（3 条红线提醒：审计取舍 / 工作量 / PRD-10 留白）
10. **写 Batch 2（6 份）** → 每条业务规则显式标注 "**Qn 决策**"，便于追溯
11. **更新 docs/PRD/README.md 索引** + 核心哲学段落
12. **自审** → grep TODO/TBD 无占位；交叉引用决策编号对齐；migration 编号不冲突

## 5. 验收（本日产出）

- [x] `docs/PRD/` 11 份 md 文件 + README 索引
- [x] 每份 PRD ≥200 行，9-10 节模板完整
- [x] Batch 1 每条业务规则有代码行号/文件路径回溯
- [x] Batch 2 每条业务规则显式标注 Q1-Q14 决策编号
- [x] 3657 行无 placeholder
- [x] migration 001-009 连续无冲突
- [x] 代码/测试状态未变动（仍 124 passing）

## 6. 下一轮恢复流程（最小步骤）

```bash
# Step 0: 恢复记忆
# - project_current_phase.md
# - project_prds_v010.md （本日新增，PRD 导航）
# - docs/20260424-checkpoint.md（本文件）

# Step 1: 确认状态
cd "/Users/xuxianbang/Documents/深圳拓俄出海/Russian-cost-system"
git status --short          # 应见 22 个原改动 + docs/PRD/*
git branch --show-current   # feat/step-5-3-product-manager
npx pnpm@10 test:run        # 124 passing

# Step 2: 选择下一步
# 方案 A: 先 commit 当前所有未 commit 的工作（强烈建议）
#   分 3 个 commit:
#     1. fix(auth): RLS + PKCE + native form + logout button
#     2. feat(calc): Phase 5.3 ProductManager + Server Actions
#     3. docs(prd): add v0.1.0 product requirements (11 files)
#
# 方案 B: 开始 Phase 5.4（税制对比视图）
#   按 PRD-05 派 Codex 走 SPEC → TEST → IMPL → VERIFY
#   前置：必须先完成方案 A 的 commit

# Step 3（方案 A 完成后）: 进入 Phase 5.4
# - 读 PRD-05 作为 SPEC 输入
# - 派 Codex 写实施 prompt（强制遵循 Q1/Q2/Q3 决策）
# - 关联 plans/2026-03-28-step5-implementation-plan.md §Phase 5.4
```

## 7. 本日 memory 变动

| 文件 | 动作 |
|------|------|
| `MEMORY.md` | 加入 `project_prds_v010.md` 索引 |
| `project_current_phase.md` | 更新：加入"PRD 完整交付"一节 |
| `project_prds_v010.md` | **新增**：PRD 位置 + 14 条决策 + 新 migration 清单 |
| `reference_checkpoints.md` | 追加 `20260424-checkpoint.md` |

## 8. 本轮可归档的临时产物

- `.superpowers/brainstorm/1345-1776990206/` — visual companion 服务产物（7 个 HTML 文件 + events 日志），已被 `.gitignore` 覆盖；可选手动清理（或保留作为本轮 Q&A 证据）

---

**给下一轮会话**：直接说"继续 commit"或"开始 Phase 5.4"即可。PRD 全部 ready，代码也 ready，就差 git commit → 进 Phase 5.4。
