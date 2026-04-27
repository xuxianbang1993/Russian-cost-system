# Checkpoint — 2026-04-27（Phase 5.5 完整闭环 + 场景 C 双审首次实战）

> **用途**：Phase 5.5（PRD-06 多品对比 + PRD-07 批量销量模拟）IMPL 完成 + Codex C1 SPEC 三轮审 PASS + Codex C2 phase 二轮终审 PASS + squash 进父分支推送 origin。
> 这是 §11.4 场景 C 双审模式的**首次完整实战**，证明该模式可作为 CLAUDE.md "代码生成必须调用 Codex" 硬规则的合法替代路径。

---

## 1. 当前状态快照

| 项 | 值 |
|----|----|
| 父分支 | `feat/step-5-4-to-5-7-tax-views` HEAD `c3fb06f`（已推 origin） |
| 父分支 commits | 4 个：`f175467`（commit-0 strategy）→ `eedf428`（5.4 squash）→ `b5f3689`（§11 场景 C strategy patch）→ `c3fb06f`（5.5 squash） |
| 5.5 child | `feat/step-5-5-compare-batch` HEAD `acf368c`（已推 origin，作历史备份） |
| 测试基线 | **225 passing / 25 files**（173 → 225，+52 用例） |
| 三件套 | tsc 0 错 / lint 0 错 0 警 / vitest 225/225 全绿 |
| 代码量 | 2212 insertions / 14 新文件 / 13 修改文件 |
| Codex 审计 | C1 三轮 PASS + C2 二轮 PASS，共拦下 23 个问题 |
| 下一步 | Phase 5.6（PRD-08 测算记录管理）—— 切 `feat/step-5-6-save-history` |

---

## 2. 本日关键产出

### 2.1 §11.4 场景 C 落档（commit b5f3689）

`DEVELOPMENT_STRATEGY.md` 新增：
- **§11.2 STEP 3** 加注释指向场景 C
- **§11.4 场景 C：单 phase 双审（"主线写 + Codex 双审"模式）** 完整流程
  - C1 SPEC 审：Plan agent 出 SPEC → ask codex 审 → 反馈纳入 v2 → 写代码
  - C2 phase 终审：三把刀通过后 → ask codex 审完整 diff → 反馈修 → 通过后 commit
- **§11.5 禁忌** 加"❌ 触发场景 C 但只做了一次审"

**动机**：5.4 翻车暴露 CLAUDE.md "代码生成必须调用 Codex" 与 §11.2 STEP 3 "主线 Claude 串行执行" 的字面冲突。场景 C 显式约定双审等价于"派 Codex 写"的纪律效果，且对长批次开发的 context 经济学更友好。

### 2.2 Phase 5.5 实施（commit acf368c → squash c3fb06f）

**新增 14 文件 / 修改 13 文件 / 2212 insertions**：

| 类型 | 文件 | 职责 |
|---|---|---|
| 纯函数 | `compare.ts` | buildCompareRows / findBestRegime / sortRows / groupSortByRecommended |
| 纯函数 | `sample.ts` | buildSamplePoints / getDefaultBatchRange，含 min_eq_max + range_too_small 错误 |
| Hook | `useDebouncedValue.ts` | 真 100ms timer debounce（不是 useDeferredValue） |
| 组件 | `CompareCell.tsx` | 双行单元格（净利润 + 利润率），高亮态/平局态 |
| 组件 | `CompareTable.tsx` | 矩阵表格 tier1-3 [usn6,usn15] / tier4 [osno] |
| 组件 | `CompareView.tsx` | 顶层容器：sortKey/direction/sortMode 状态机 + 空态加"去添加"按钮 |
| 组件 | `BatchRangeControls.tsx` | draftMin/Max 本地 state 防 snap-back + sync useEffect 基于 committed props |
| 组件 | `BatchChart.tsx` | LineChart + ReferenceLine 边界标注 + Tooltip 含利润率 |
| 组件 | `BatchSimulation.tsx` | empty / 控件 / chart + min_eq_max + range_too_small 双错误态 |
| Context | `types.ts` + `reducer.ts` | 删 batchQuantity / 加 batchMin/batchMax + SET_BATCH_RANGE；SET_TIER 不重置（B 决策） |
| EmptyState | `EmptyState.tsx` | 扩展 actionLabel + onAction props |
| ProductManager | `ProductManager.tsx` | 加 `id="product-manager"` 让"去添加" 按钮可定位 |
| SPEC | `docs/SPEC/PHASE-5.5-SPEC.md` | v4 完整 SPEC（C1 三轮审计追溯） |

**测试**（6 新文件 / 52 新用例 / 全绿）：
- compare.test.ts 14 / sample.test.ts 13 / useDebouncedValue.test.ts 3
- CompareView.test.tsx 9 / BatchRangeControls.test.tsx 4 / BatchSimulation.test.tsx 4
- reducer.test.ts +3（SET_BATCH_RANGE / 默认值 / SET_TIER 不重置）
- ResultPanel.test.tsx 同步 CompareView + BatchSimulation 断言
- 7 个 component 测试 buildContext mock 同步（删 batchQuantity 加 batchMin/batchMax）

### 2.3 Codex 双审记录

#### C1 SPEC 三轮（每轮均 PASS verdict）

| 轮次 | overall | issues | 关键内容 |
|---|---|---|---|
| v1 | 8/10 | 7（1 high + 4 med + 2 low） | useDeferredValue ≠ debounce / batchQuantity 死字段 / SET_TIER 行为未定义 / PRD-06 F-4.1 推荐列分组排序漏 / boundary+1 / 测试 mock ResizeObserver 重复 / 缺 next docs 预读 |
| v2 | 8/10 | 5（0 high + 1 med + 4 low） | snap-back 防范 / next docs 路径错 / SET_TIER 不重置标 MUST HAVE 不严谨 / 测试目标数字不一致 / group sort 顺序未定义 |
| v3 | 8/10 | 3（0 high + 1 med + 2 low） | sync useEffect 不应绑 action 来源 / fake timers + userEvent flake / Step A 措辞 |

**issues 数量递减表明边际收益耗尽，v3 后允许进 STEP 0/A 写代码。**

#### C2 phase 终审二轮

| 轮次 | overall | verdict | issues |
|---|---|---|---|
| v1 | 6.8/10 | **FAIL** | 6（1 high + 4 med + 1 low）— CompareTable OSNO 列 / range_too_small 缺 / boundary endpoint / Tooltip 缺 profitMargin / 缺"去添加"按钮 / chart min-width |
| v2 | **8.4/10** | **PASS** | 2（1 med + 1 low）— BatchRangeControls min===max 被吞 / #product-manager anchor 不存在 |

v2 PASS verdict 已允许放行，但额外吸收 v2 的 2 issues（v3 不再审）作为质量提升。

### 2.4 用户决策记录

- **A 决策**（2026-04-27）：5.5 squash 进父分支用干净的单 commit 模式（与 5.4 留痕模式不同——5.5 没有"违规直写 vs Codex 补救"的需要留痕事件）。
- **B 决策**（2026-04-27 SPEC v2）：SET_TIER 不重置 batchMin/batchMax（保留用户编辑值，PRD-07 §6.2 引申）。
- **场景 C 模式**（2026-04-27）：5.5 起改用"主线写 + Codex 双审"作为标准 SOP（落 DEV_STRATEGY §11.4）。

---

## 3. 关键技术决策与陷阱回顾

### 3.1 真 debounce vs useDeferredValue（C1 v1 抓的 high 错）
PRD-07 §5.4 要求 100ms debounce 是时间维度。SPEC v1 误用 `useDeferredValue` ——后者是优先级调度，无时间保证。v2 修正为 `setTimeout + clearTimeout` 真 timer debounce。**未来 phase 涉及"时间维度延迟"必查证 useDeferredValue ≠ debounce**。

### 3.2 snap-back 反例（C2 v1 抓的 medium 错）
BatchRangeControls 如果只把 `state.batchMin/batchMax` 直接绑定到滑块/输入框，拖动时 input value 直到 100ms 后才更新 → 视觉感觉滑块"卡住-跳跃"。**必须**用 `draftMin/draftMax` 本地 useState 即时反馈 UI，debounce 后才 dispatch。

### 3.3 sync useEffect 不绑 action 来源（C2 v1 抓的 medium 错）
v3 SPEC 写"SET_PRODUCT 触发的默认范围切换"——这种描述暗示组件应该知道哪个 action 触发了 prop 变化，是反 React 思维。v4 修正为"sync useEffect 仅在 committed props 实际变化时触发，不绑特定 action 来源"。**React useEffect 依赖应该是值而不是事件**。

### 3.4 batchQuantity 死字段考古（C1 v1 抓的 medium）
5.4 之前的 placeholder 只在 types/reducer/测试 buildContext 出现，UI 0 引用。删除时同步 7 个测试 mock 是机械字符串替换。**SPEC 加新字段时要 grep 旧字段是否真的被使用**——前期审 SPEC 就把这种风险消除了。

### 3.5 PRD-06 §3.1 列结构（C2 v1 抓的 high 错）
SPEC v4 用 [usn6, usn15, osno] 三列。但 PRD-06 §3.1 字面表格只列三列：商品 / USN-6% / USN-15% / 推荐税制（OSNO 不在主列，仅 tier4 时单列）。**SPEC 阶段易忽略 PRD 字面细节**——C2 终审是抓这种"表面 OK 但违反 PRD 字面"问题的最后机会。

### 3.6 group sort 顺序锁定（C1 v3 抓的 low）
PRD-06 §4.4 没指定推荐税制分组的顺序。v3 SPEC 锁定 USN-6% → USN-15% → OSNO 写成常量 `GROUP_ORDER`。**未来要换序只改一行**——稳定区的可读性 > 简洁性。

### 3.7 测试设计沿用 5.4 的 buildContext 模式
5 个新 component 测试各 inline 一份 buildContext mock（每份 ≈40 行）。SPEC §6 决策表写"留 5.7 重构 test-utils"——避免跨文件耦合提前抽公共。

---

## 4. 下次会话第一动作

按 §11.4 场景 C 已确立为 5.6+ 标准 SOP：

```bash
git checkout feat/step-5-4-to-5-7-tax-views
git pull --ff-only
git checkout -b feat/step-5-6-save-history
```

然后：
1. 派 `Plan` subagent 读 PRD-08 输出 SPEC.md
2. C1 SPEC 审：`ask codex` 审 SPEC（最多 3 轮）
3. SPEC 终稿后写代码（主线 Claude 写 + 内置 subagent 协助）
4. STEP 4 三把刀（code-reviewer / silent-failure-hunter / quality-checker）
5. C2 phase 终审：`ask codex` 审完整 diff（最多 3 轮）
6. 通过后 commit + squash 进父分支推送

### 5.6 启动前红线警觉
- **场景 C 触发条件评估**：PRD-08 测算记录涉及 Supabase 数据层 + 历史记录列表 UI，预计 ≥300 行。如果用户主动要求或评估 ≥500 行，启用场景 C；否则可走默认派 Codex 写。
- **Supabase Auth 陷阱（memory）**：PRD-08 涉及用户测算历史，要走 RLS。注意 admin RLS 自引用递归 / PKCE email callback 漏 token_hash 等已知坑。
- **CLAUDE.md "代码生成必须调用 Codex"**：默认路径下 >10 行必须派 Codex；场景 C 下主线写。

---

## 5. 风险与延后

### 5.5 已知未修（留 5.7 polish）
- `CostInputPanel.tsx` 和 `ui/SectionCard.tsx` 仍有 `rounded-[14px]`（5.3 历史代码）
- 测试 buildContext mock 重复（10+ 文件各 ≈40 行）→ 抽 test-utils 公共
- `format.ts` 阈值边界单测（KpiCards / CompareCell 间接覆盖足够）
- BatchSimulation 视觉细节（颜色 token / 移动端响应式）需肉眼验证

### 5.6 启动前要警觉
- **PRD-08 涉及 Supabase 数据层**：写入测算历史 / 读取列表 / RLS 双层 / Server Action userId 过滤
- **Codex 通过 `ask codex` 异步**：`[CCB_ASYNC_SUBMITTED]` 出现立即 end turn，等用户转发结果（Async Guardrail）
- **5.5 父分支已积累 4 个 commit**（含 strategy + 5.4 squash + strategy patch + 5.5 squash），5.6 进父分支后将累积到 5 个

### 待肉眼验收（5.5 视觉）
- CompareTable 矩阵在桌面/移动端的可读性（响应式 sticky-left）
- BatchChart 在不同 viewport 渲染（min-width 320px 兜底）
- "去添加" 按钮 scrollIntoView 实际行为（首次有 ProductManager id 后）

---

## 6. 文件改动总览

```
父分支 strategy patch:  b5f3689  docs(strategy): §11 加场景 C — 主线写+双审模式  (+28)
子分支 IMPL:           acf368c  feat(calc): Phase 5.5 IMPL+C1+C2 完整              (+2212 -24)
父分支 squash:          c3fb06f  feat(calc): Phase 5.5 PRD-06+07                    (+2212 -24)
                        ─────────
                        ~2240 行新代码 + 文档
```

**测试基线演进**：v0.1.0 124 baseline → 5.4 173 → **5.5 225**（净增 +52）。

**最终验收三件套**：tsc 0 错 / lint 0 错 0 警 / vitest 225/225 全绿。

---

## 7. 场景 C 双审作为方法论

**5.5 是 §11.4 场景 C 的首次实战**，其价值不止是"5.5 phase 完成"，更重要是验证了一种新的协作模式可以替代 CLAUDE.md "代码生成必须调用 Codex" 默认路径。

**关键观察**：
- C1 issues 数量趋势 v1=7 → v2=5 → v3=3，递减表明 SPEC 收敛
- C1 抓的层次：v1 架构 → v2 实现 → v3 React 哲学（每层更深）
- C2 issues 趋势 v1=6 → v2=2，更陡峭收敛
- C2 抓的是"代码看起来对但违反 PRD 字面"或"用户体验断点"——主线 Claude 自检难发现
- 双审拦截 23 个问题（含 2 个 high），其中 1 个 high 架构错误（useDeferredValue ≠ debounce）若不拦下会让 phase 后期返工

**适用判定**：
- ✅ 适合：用户主动要求 / 核心业务（计算引擎/财务/认证）/ ≥500 行 / 跨 5+ 文件
- ❌ 不适合：trivial fix / 文档改动 / 配置变更（这些走默认派 Codex 写更快）

**memory 已更新**：`feedback_codex_must_write_code.md` 加 5.5 场景 C 实战注 + 何时选哪条路径。
