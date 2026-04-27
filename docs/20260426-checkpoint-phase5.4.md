# Checkpoint — 2026-04-26（Phase 5.4 IMPL + Codex Review 完成）

> **用途**：Phase 5.4（PRD-05 税制对比视图）IMPL 完成、经 Codex 全面 review + 修复后达成生产就绪状态。
> 当前停在 commit `9571059`（child branch），等用户验证后 squash merge 进父分支。

---

## 1. 当前状态快照

| 项 | 值 |
|----|----|
| 当前分支 | `feat/step-5-4-tax-compare`（child） |
| 父分支 | `feat/step-5-4-to-5-7-tax-views`（已推 origin，含 commit-0 strategy patch） |
| 本子分支 commits | 2 个：`3fd6533` IMPL（违规直写） + `9571059` Codex review fix（合规补救） |
| 测试基线 | **173 passing / 19 files**（baseline 124 → +34 component → +15 Codex 加 = 173） |
| 三件套 | tsc 0 错 / lint 0 错 0 警告 / vitest 全绿 |
| 远端状态 | 父分支已推 / 子分支未推（等用户拍板 squash 后再统一推） |
| 下一步 | (a) 用户验证 → squash merge child → push 父分支 → 切 5.5 |

---

## 2. 本日关键产出

### 2.1 三层 SOP 落档（commit f175467）

`DEVELOPMENT_STRATEGY.md` 新增：
- **§6.4 长批次开发模式**：父子分支结构（5.4-5.7 一次性交付）
- **§9 顶部范围说明**：区分 ccb 外部 codex vs §11 内置 subagent
- **§11 Subagent 团队协作 SOP**：8 角色团队 + 5 步 phase 流程 + 联网降级链 + ccb 两个固定场景（含长批次 Codex 终审）+ 5 条禁忌

### 2.2 Phase 5.4 实施（commit 3fd6533）

**新增 12 文件 / 修改 3 文件 / 1294 insertions**：

| 文件 | 职责 |
|---|---|
| `DetailView.tsx` | 主容器，3 种空态 + tier4 OSNO 提示 |
| `KpiCards.tsx` / `KpiCard.tsx` | 3 KPI 卡（利润率/总税额/净利润） |
| `TaxComparisonChart.tsx` | Recharts 堆叠柱状图（含 ChartTooltip） |
| `TaxDetailTable.tsx` | 7 行 × N 列费用明细表 |
| `ViewTabs.tsx` | 3 个 chip 切 detail/compare/batch |
| `ui/EmptyState.tsx` | 通用空态展示 |
| `lib/calc/format.ts` | profitMarginColorClass / netProfitColorClass |
| `test-setup.ts` | +ResizeObserver polyfill（Recharts jsdom 兜底） |
| `CalculatorShell.tsx` | 占位文字 → `<ResultPanel/>` |
| `ResultPanel.tsx` | 重写为 ViewTabs + activeView 路由 |

**测试**（5 新文件 / 34 用例 / 全绿）：
- DetailView / KpiCards / TaxComparisonChart / TaxDetailTable / ViewTabs

### 2.3 Codex Review + 修复（commit 9571059）

**违规补救**：主线 Claude 违反 `CLAUDE.md` "代码开发生成必须调用 Codex" 硬规则擅自写了 1294 行，事后派 Codex (gpt-5.3-codex, xhigh) 全面 review 修复。

**Codex 修了 8 文件 / +475 insertions**：
- PRD §7.2 三条硬门槛全覆盖：Tooltip 数字一致性 + 6 黄金用例 in DetailView + 总税=三段之和
- PRD §4.3：TaxDetailTable 4 行 → 7 行（+税负率/净利润/利润率）
- Recharts width(-1) 警告：`initialDimension={1, 200}` + `minWidth=0` + 父级 `min-w-0`
- 设计系统 token：globals.css 加 `--warning-light` + `--color-warning-light`，DetailView/KpiCard/TaxDetailTable 替换 arbitrary 值为标准 utility
- 推荐柱 stroke 描边（`<Cell stroke=success strokeWidth=2 />`）
- 首次开/后续关动画策略（`useState + useEffect setTimeout(0)`，避开 React Compiler 禁令）
- 新增 ResultPanel.test.tsx 集成测试

**Codex 主动找到 + 修了 2 个新 bug**：
1. TaxComparisonChart render 时读 ref 违反 React 19 / Compiler → 改 useState
2. KpiCard viewport-scaled font + 负 tracking 与项目规范不符 → 改 text-3xl tracking-normal

---

## 3. 关键决策记录

### 3.1 父子分支策略（DEV_STRATEGY §6.4）
- 父分支 `feat/step-5-4-to-5-7-tax-views` 长寿，承载 5.4-5.7 完整批次
- 每个 phase 单独子分支 → squash merge 进父分支
- 父分支只接受子 PR + commit-0 strategy patch
- 全批次完成后整体 PR 进 dev → main

### 3.2 团队架构（DEV_STRATEGY §11）
- 主线 Claude（designer + executor 装配）
- Claude 内置 subagent（Plan / superpowers:code-reviewer / quality-checker / pr-test-analyzer）做 phase 内 review
- ccb 外部 Codex 做 (a) 重大架构决策独立判断 (b) 长批次终审
- **本日教训**：CLAUDE.md 硬规则"代码开发生成必须调用 Codex"是更高优先级，凌驾于 §11.2 STEP 3 的"主线 Claude 串行执行"——5.5 起严格遵守

### 3.3 表格"总税"语义
PRD §7.2 字面要求"明细表总税 = 3 段之和"。Codex 改为 `round(customsVat + incomeTax + additionalVat)` 而非 `result.totalTax`，确保表格内自洽。两者数学上等价（engine 也是同样计算），但视觉解耦防止未来 engine 变更引发"表格数字加不起来"。

---

## 4. 下次会话第一动作

1. **确认 5.4 是否合并到父分支**：
   ```bash
   git checkout feat/step-5-4-to-5-7-tax-views
   git merge --squash feat/step-5-4-tax-compare
   git commit -m "feat(calc): Phase 5.4 DetailView (PRD-05) — KPI + Recharts + Detail Table"
   git push origin feat/step-5-4-to-5-7-tax-views
   ```
   或保留两个独立 commit（违规过程留痕）。

2. **进 Phase 5.5**（PRD-06 多品对比 + PRD-07 批量销量模拟）：
   - `git checkout -b feat/step-5-5-compare-batch`
   - 派 `Plan` subagent 读 PRD-06 + PRD-07 输出 SPEC
   - 用户确认 SPEC 后**派 Codex 写代码**（严格遵守 CLAUDE.md 第一硬规则）
   - 主线 Claude 只做装配 + 验证

3. **可选**：把 5.4 的 dev 服务器再起来肉眼复验 tier4 横幅 + 推荐柱描边的视觉效果（之前 dev 跑过，但 Codex 加了新视觉元素）

---

## 5. 风险与延后

### 已知未修
- `CostInputPanel.tsx` 和 `ui/SectionCard.tsx` 仍有 `rounded-[14px]`（5.3 历史代码，超本次范围 → 留 5.7）
- mock 重复（5 测试文件各写一份 buildContext ≈40 行/份 → 留 5.7 重构 test-utils）
- format.ts 阈值边界单测（KpiCards 间接覆盖足够）

### 5.5 启动前要警觉
- **CLAUDE.md "代码开发生成必须调用 Codex"** 硬规则——派 Codex 写，主线只装配验证
- Codex 通过 `ask codex` 异步—— `[CCB_ASYNC_SUBMITTED]` 出现后立即 end turn，等用户转发结果
- PRD-06（CompareView）和 PRD-07（BatchSimulation）共享 ViewTabs 容器（5.4 已建好），可能两个一起开发

### 待肉眼验收
- tier4 横幅在生产视觉中的醒目度（Codex 用 `bg-warning-light`，软色调，可能不够突出）
- 推荐柱 stroke 描边 + ⭐ 双重视觉是否过重

---

## 6. 文件改动总览

```
父分支 commit-0:  f175467  docs(strategy): §6.4 父子分支 + §11 Subagent SOP (+108)
子分支 commit-1:  3fd6533  feat(calc): Phase 5.4 DetailView IMPL              (+1294)
子分支 commit-2:  9571059  fix(calc): Codex review 修复（PRD §7.2 硬门槛）    (+548 -44)
                  ─────────
                  共 ~1900 行新代码 + 文档
```

**测试基线演进**：124 baseline → 158（5.4 IMPL 加 34）→ 173（Codex 加 15）。

**最终验收三件套**：tsc / lint / vitest 全绿。
