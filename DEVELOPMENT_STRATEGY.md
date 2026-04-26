# ELSCBSSXT 开发策略（强制执行）

> **约束对象**：Claude Code / Codex / 任何 AI 代理
> **生效日期**：2026-03-28
> **优先级**：本文件的规则高于一切默认行为，与 CLAUDE.md 同级强制
> **违反后果**：回退到违反点重做，不允许跳过

---

## 一、执行纪律：Step 门控协议

### 1.1 铁律：每个 Step 必须走完 4 道关卡

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  SPEC    │ →  │  TEST    │ →  │  IMPL    │ →  │  VERIFY  │
│ 规格定义 │    │ 先写测试 │    │ 编写实现 │    │ 运行验证 │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↑                                               │
     └───── 不通过则回退到 SPEC 重新定义 ←────────────┘
```

**禁止行为**：
- 跳过 TEST 直接写 IMPL
- VERIFY 不通过就标记 Step 完成
- 在 VERIFY 失败后不分析原因就重试
- 同时开始多个 Step（必须串行，上一个 VERIFY 通过才能开始下一个）

### 1.2 每个 Step 的准入条件

| Step | 准入条件 |
|------|---------|
| Step 2 计算引擎 | Step 1 `pnpm dev` 启动成功 + `tsc --noEmit` 零错误 |
| Step 3 数据层 | Step 2 `pnpm test:run` 全部通过 |
| Step 4 认证 | Step 3 SQL 迁移语法验证通过 + Supabase 客户端类型正确 |
| Step 5 前端 | Step 4 登录/注册流程手动验证通过 |
| Step 6 后台 | Step 5 成本测算页面可正常计算 + 数据可保存 |
| Step 7 部署 | Step 6 后台管理三个页面全部可用 |

### 1.3 每个 Step 的准出条件

| Step | 准出条件（全部满足才能标记完成） |
|------|-------------------------------|
| Step 1 | `pnpm dev` 启动 + `tsc --noEmit` 零错误 + 目录结构完整 |
| Step 2 | `pnpm test:run` 全部通过 + 6 个税务文档测试用例全部绿色 + 覆盖率 > 90% |
| Step 3 | SQL 语法正确 + TypeScript 类型生成成功 + RLS 策略代码审查通过 |
| Step 4 | 注册→登录→保护路由→登出 全链路通过 + 非登录用户被重定向 |
| Step 5 | 3 个视图 tab 全部渲染正常 + 计算结果与 Step 2 测试数据一致 + 响应式正常 |
| Step 6 | 普通用户 403 + 管理员可 CRUD + 税率修改后前端实时生效 |
| Step 7 | `docker build` 成功 + `docker run` 后 3000 端口可访问 |

---

## 二、统一视觉设计系统（Design System）

### 2.1 Design Tokens（从 Demo 提取，不允许偏离）

所有 UI 开发必须使用以下 Token，禁止硬编码颜色值。

#### 颜色体系（Tailwind v4 @theme + shadcn/ui 两层结构）

Tailwind v4 不再使用 `tailwind.config.ts`，改用 CSS 内 `@theme` 指令。
shadcn/ui v2 采用两层结构：`:root` 存原始 token，`@theme inline` 映射到 Tailwind 工具类。

```css
/* globals.css */
@import "tailwindcss";

/* ── 第一层：原始 Design Token（从 Demo 提取）── */
:root {
  --bg: #FAFAFA;
  --surface: #FFFFFF;
  --border: #E8E8E8;
  --border-light: #F0F0F0;
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-tertiary: #999999;
  --text-muted: #BFBFBF;
  --accent: #2563EB;
  --accent-light: #EFF6FF;
  --accent-muted: rgba(37, 99, 235, 0.08);
  --success: #16A34A;
  --success-light: #F0FDF4;
  --error: #DC2626;
  --error-light: #FEF2F2;
  --warning: #D97706;
  --info: #7C3AED;
  --info-light: #F5F3FF;
  --radius: 10px;
}

/* ── 第二层：映射到 Tailwind 工具类 ── */
@theme inline {
  /* 颜色 → 可用 bg-background, text-foreground 等 */
  --color-background: var(--bg);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-border-light: var(--border-light);
  --color-foreground: var(--text-primary);
  --color-muted-foreground: var(--text-secondary);
  --color-tertiary: var(--text-tertiary);
  --color-placeholder: var(--text-muted);
  --color-primary: var(--accent);
  --color-primary-light: var(--accent-light);
  --color-primary-muted: var(--accent-muted);
  --color-destructive: var(--error);
  --color-destructive-light: var(--error-light);
  --color-success: var(--success);
  --color-success-light: var(--success-light);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-info-light: var(--info-light);

  /* 圆角 */
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-full: 20px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.06);

  /* 字体 */
  --font-sans: 'DM Sans', 'Noto Sans SC', -apple-system, sans-serif;
  --font-cn: 'Noto Sans SC', 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

**使用方式**：`className="bg-background text-foreground"` 自动引用 Design Token。
**禁止**：直接写 `bg-[#FAFAFA]` 硬编码，必须通过 Token。

#### 字体体系

| 用途 | 字体栈 | 使用场景 |
|------|--------|---------|
| 英文/通用 | `'DM Sans', -apple-system, sans-serif` | 英文标题、按钮文字 |
| 中文 | `'Noto Sans SC', 'DM Sans', sans-serif` | 所有中文内容（默认 body） |
| 等宽/数字 | `'JetBrains Mono', 'SF Mono', monospace` | 金额、税率、数据数字、输入框 |

**强制规则**：
- body 默认使用中文字体栈
- 所有金额/百分比数字必须使用 `font-mono`
- 基础字号 14px（`html { font-size: 14px }`）

#### 间距系统

| Token | 值 | 使用场景 |
|-------|-----|---------|
| spacing-xs | 4px | 图标与文字间距 |
| spacing-sm | 8px | 行内元素间距 |
| spacing-md | 16px | 卡片内边距、表单项间距 |
| spacing-lg | 24px | 区块间距、面板内边距 |
| spacing-xl | 32px | 主区域 padding、页面间距 |

### 2.2 组件视觉规范

#### 卡片（Card）
- 背景：`--color-surface`
- 边框：`1px solid --color-border`
- 圆角：`--radius-lg`（14px）
- 内边距：20px
- 悬浮效果：`box-shadow: --shadow-lg`

#### 输入框（Input）
- 风格：**下划线式**（非框式），与 Demo 一致
- 底部边框：`1px solid --color-border`
- Focus 状态：底部边框变为 `--color-accent`
- 数字输入：右对齐 + `font-mono` + `font-weight: 600`
- 后缀单位：`font-size: 12px` + `--color-text-tertiary`

#### 按钮（Button）
- Primary：`bg: --color-accent` + 白色文字 + `radius: 8px`
- Secondary：`bg: --color-surface` + `border: --color-border`
- Hover 过渡：`--transition-default`

#### 标签页（Tabs）
- 外框：`1px solid --color-border` + `radius: 8px`
- 活跃 tab：`bg: --color-accent` + 白色文字 + `font-weight: 600`
- 非活跃 tab：`bg: --color-surface` + `--color-text-tertiary`

#### 表格（Table）
- 表头：`font-size: 10px` + 大写字母 + `--color-text-muted`
- 行分隔：`1px solid --color-border-light`
- 数据列：`font-mono` + 右对齐
- 总计行：`font-weight: 700` + 上边框加粗

#### KPI 卡片
- 标签：`font-size: 13px` + `--color-text-tertiary`
- 数值：`font-size: 32px` + `font-mono` + `font-weight: 700` + `letter-spacing: -1.5px`
- 右侧分隔线：`1px solid --color-border-light`

### 2.3 页面布局规范

#### 主布局（Calculator 页面）
```
┌─────────────────────────────────────────────────┐
│  Header（56px 高，sticky top:0）               │
│  左: Logo + 标题    右: 汇率输入               │
├──────────┬──────────────────────────────────────┤
│  Left    │  Right Panel                        │
│  Panel   │  - View Tabs                        │
│  320px   │  - KPI Cards (3列)                  │
│  sticky  │  - Chart Section                    │
│          │  - Detail Tables (2列)              │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Footer（警告文字）                              │
└─────────────────────────────────────────────────┘
```

- 左面板：固定 320px 宽，`position: sticky; top: 56px`
- 右面板：`flex: 1`，可滚动
- 移动端（≤1024px）：单列布局，左面板在上

#### 后台布局（Admin 页面）
```
┌─────────────────────────────────────────────────┐
│  Admin Header（含用户信息 + 退出按钮）          │
├──────────┬──────────────────────────────────────┤
│  Sidebar │  Main Content                       │
│  240px   │  - Page Title                       │
│          │  - Content Area                     │
└──────────┴──────────────────────────────────────┘
```

#### 登录/注册页
- 居中卡片布局，最大宽度 400px
- Logo 居中置顶
- 表单 + 提交按钮 + 切换链接

### 2.4 动画规范

| 动画 | CSS | 使用场景 |
|------|-----|---------|
| fadeUp | `from { opacity:0; translateY(12px) } to { opacity:1; translateY(0) }` | 卡片/区块初始加载 |
| fadeIn | `from { opacity:0 } to { opacity:1 }` | 弹窗、Toast |
| transition | `0.2s cubic-bezier(0.4, 0, 0.2, 1)` | 所有交互状态变化 |

**禁止**：使用 CSS `transition: all`（性能问题），必须指定具体属性。

---

## 三、代码工程原则（核心纪律）

### 3.0 五大原则（每行代码都必须满足）

#### 原则 1：积木化（Modular Blocks）
```
每个函数/组件 = 一块积木
- 单一职责：一个函数只做一件事
- 独立可测：每块积木可以单独拿出来测试
- 可替换：换掉一块积木不影响其他积木
- 标准接口：通过 TypeScript interface 定义输入输出

反例（禁止）：
  function handleSubmit() {
    validate(); calculate(); save(); redirect(); // 做了4件事
  }

正例（要求）：
  function validateInput(input: CalcInput): ValidationResult { ... }
  function calculateTax(input: CalcInput): CalcOutput { ... }
  function saveCalculation(output: CalcOutput): Promise<string> { ... }
  // 每个函数一件事，在页面层组装
```

#### 原则 2：组装化（Composition Assembly）
```
页面 = 积木的组装
- 页面不包含业务逻辑，只组装组件
- 组件不直接调用数据库，通过 hooks/actions 间接访问
- 数据自上而下流动（Props），事件自下而上冒泡（Callbacks）

正例：
  // page.tsx — 只负责组装
  export default function CalculatorPage() {
    return (
      <DashboardLayout>
        <LeftPanel>
          <TierSelector />
          <ProductManager />
          <CostInputPanel />
        </LeftPanel>
        <RightPanel>
          <ViewTabs />
          <ResultPanel />
        </RightPanel>
      </DashboardLayout>
    );
  }
```

#### 原则 3：结构化（Layered Structure）
```
严格分层，禁止跨层调用：
  展示层（Components）
    ↕ 只通过 Props/Hooks 通信
  业务逻辑层（Hooks/Engine）
    ↕ 只通过 Repository 访问数据
  数据访问层（Repositories）
    ↕ 只通过 Supabase Client
  基础设施层（Supabase/Next.js）

禁止：组件直接 import supabase client
禁止：Repository 直接操作 DOM
禁止：Engine 函数依赖 React 状态
```

#### 原则 4：易读易维护（Readable & Maintainable）
```
- 命名即文档：变量名/函数名必须自解释，不需要注释就能看懂
- 函数不超过 30 行（超过就拆分）
- 组件不超过 150 行（超过就拆分子组件）
- 嵌套不超过 3 层（if 里面 if 里面 if → 提取为函数）
- 复杂逻辑必须有 JSDoc 注释（说明 WHY，不说 WHAT）
```

#### 原则 5：易扩展可复用（Extensible & Reusable）
```
- 策略模式：新增税制只需添加一个 Strategy，不改现有代码
- 工厂模式：新增产品类型只需注册到 Factory
- 配置驱动：税率、档位等参数从数据库读取，不硬编码
- Hook 复用：useCalculation、useProducts 可在多个页面复用
- 组件复用：TierSelector 可在 Calculator 和 Admin 页面共用
```

### 3.0.1 设计模式调用规则

| 场景 | 必须使用的模式 | 如何判断 |
|------|--------------|---------|
| 多种计算逻辑可切换 | **Strategy 策略模式** | 有 if/switch 判断走哪种算法 → 改为策略 |
| 需要根据条件创建不同对象 | **Factory 工厂模式** | 有 new XXX() 散落在各处 → 集中到工厂 |
| 数据 CRUD 操作 | **Repository 仓储模式** | 直接写 supabase.from() → 封装到 Repository |
| 数据库行 ↔ 业务对象转换 | **Adapter 适配器模式** | snake_case ↔ camelCase 转换 → 用 Adapter |
| UI 由小部件拼装 | **Composition 组合模式** | 页面有多个区块 → 拆分为独立组件组合 |
| 参数变化触发联动 | **Observer 观察者模式** | 输入变 → 结果变 → 用 useEffect + 自定义 Hook |

### 3.0.2 代码复用检查清单

每次写新代码前，必须检查：
1. 是否已有类似函数/组件可复用？（搜索项目）
2. 新写的函数是否足够通用，可被其他地方复用？
3. 如果同一逻辑出现 2 次，是否应该提取为共享函数？
4. 共享函数放在哪一层？（utils → 全局通用，hooks → React 专用，lib → 业务逻辑）

---

## 三点一、代码规约（零容忍）

### 3.1 TypeScript 强制规则

```json
// tsconfig.json 必须包含
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

- **禁止** `any` 类型（唯一例外：第三方库缺类型时用 `unknown` 替代）
- **禁止** `@ts-ignore`（用 `@ts-expect-error` + 注释原因替代）
- **禁止** 非空断言 `!`（用 optional chaining `?.` 或 nullish coalescing `??`）

### 3.2 文件结构强制规则

```
每个组件文件的结构必须遵循以下顺序：
1. 'use client' 指令（如需要）
2. import 语句（按: React → 第三方 → 内部模块 → 类型 排序）
3. 类型定义（Props interface）
4. 组件主体
5. 辅助函数（如有）
```

### 3.3 Server / Client Component 边界规则（已验证）

| 场景 | 组件类型 | 理由 |
|------|----------|------|
| 数据获取（DB查询、fetch） | **Server Component** | 无需 JS bundle，直接访问后端 |
| 静态布局（无交互） | **Server Component** | 默认，性能最佳 |
| useState / useEffect | **Client Component** | React 状态必须在客户端 |
| onClick / onChange | **Client Component** | 浏览器事件 |
| shadcn/ui Dialog/Form/Select | **Client Component** | Radix UI 内部有状态 |
| shadcn/ui Badge/Separator | **Server Component 可用** | 纯展示 |

**黄金原则**：将 `'use client'` 边界尽量**下推到叶节点**。父级保持 Server Component 做数据获取，传序列化数据给 Client 子组件。

```tsx
// 正确：页面是 Server Component，子组件是 Client
// app/(dashboard)/calculator/page.tsx
import { CostInputPanel } from '@/components/calculator/CostInputPanel'

export default async function CalculatorPage() {
  const taxConfig = await getTaxConfig() // 服务端获取
  return <CostInputPanel config={taxConfig} /> // 传给 Client
}
```

### 3.4 表单处理规范（react-hook-form + zod + Server Actions）

所有表单必须采用以下三件套：
1. **zod schema**：放 `src/lib/schemas/`，前后端共用
2. **react-hook-form + zodResolver**：Client Component 前端验证
3. **Server Actions**：`src/app/actions/`，后端二次验证 + 数据操作

```
用户输入 → react-hook-form（前端验证）→ Server Action（后端验证）→ Supabase
```

### 3.5 组件编写规则

| 规则 | 说明 |
|------|------|
| Server Component 优先 | 默认 Server Component，只有需要 useState/useEffect/onClick 时才加 'use client' |
| Props 必须定义 interface | `interface TierSelectorProps { ... }`，不用 inline type |
| 纯展示 vs 逻辑分离 | 计算逻辑放 hooks/lib，组件只负责渲染 |
| 禁止组件内直接调用 Supabase | 必须通过 Repository 层或 Server Actions |
| 单一职责 | 一个组件文件不超过 150 行，超过则拆分 |

### 3.4 命名强制规则

| 对象 | 规则 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.tsx | `TierSelector.tsx` |
| Hook 文件 | camelCase 以 use 开头 | `useCalculation.ts` |
| 工具函数 | camelCase.ts | `engine.ts` |
| 类型文件 | camelCase.ts | `types.ts` |
| 测试文件 | 同名.test.ts(x) | `engine.test.ts` |
| CSS 类名 | Tailwind utility only | 不写自定义 class |
| 常量 | UPPER_SNAKE_CASE | `REVENUE_TIERS` |
| 数据库列 | snake_case | `platform_price` |
| API/DTO 字段 | camelCase | `platformPrice` |

### 3.5 Import 路径规则

- 始终使用 `@/` 别名，不用相对路径 `../`
- 例外：同目录文件可用 `./`

```typescript
// 正确
import { calculateTax } from '@/lib/calc/engine';
import type { Product } from '@/lib/calc/types';

// 错误
import { calculateTax } from '../../lib/calc/engine';
```

---

## 四、测试策略（红线）

### 4.1 测试分层

| 层级 | 工具 | 覆盖范围 | 覆盖率要求 |
|------|------|---------|-----------|
| 单元测试 | Vitest | 计算引擎、工具函数 | > 95% |
| 组件测试 | Vitest + React Testing Library | UI 组件渲染和交互 | > 80% |
| 集成测试 | Vitest | Repository + Supabase mock | > 70% |

### 4.2 计算引擎测试（必须包含）

以下 6 个测试用例来源于内部税务文档，是**验收标准**，不允许跳过：

```typescript
// 必须通过的 6 个黄金测试用例
test('USN-6% tier1: 营业额2000万, 申报成本600万 → 总税252万')
test('USN-6% tier2: 营业额1亿, 申报成本3000万 → 总税1736万')
test('USN-6% tier3: 营业额3亿, 申报成本1亿 → 总税5962万')
test('USN-15% tier1: 收入2000万, 支出800万 → 总税312万')
test('USN-15% tier2: 收入1亿, 支出7000万 → 总税1586万')
test('OSNO: 收入1亿, 支出8000万 → 总税1885万')
```

### 4.3 测试命名规则

```
describe('[模块名]', () => {
  describe('[功能组]', () => {
    it('[输入条件] → [预期结果]')
  })
})
```

### 4.4 测试 Server Component vs Client Component

| 类型 | 测试方式 |
|------|---------|
| **纯函数**（engine.ts 等） | 直接 import + 断言，最简单 |
| **Client Component** | `render()` + `userEvent` + 断言 |
| **Server Component** | `const jsx = await Component({ props }); render(jsx)` + mock 数据层 |
| **Server Actions** | 单独测试函数，mock Supabase |

**Server Component 测试示例**：
```typescript
vi.mock('@/lib/supabase/server', () => ({ ... }))
it('显示税制结果', async () => {
  const jsx = await ResultPage({ params: { id: '123' } })
  render(jsx)
  expect(screen.getByText('简易税制 6%')).toBeInTheDocument()
})
```

**Client Component 测试必须 mock**：
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}))
```

### 4.5 Vitest 配置（强制使用）

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test-setup.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 五、联网验证规则

### 5.1 必须联网验证的场景

| 场景 | 验证方式 | 不验证的后果 |
|------|---------|------------|
| 税率/税制变更 | WebSearch 搜索俄罗斯联邦税务局最新公告 | 计算引擎可能过时 |
| Supabase API 用法 | WebFetch 官方文档 supabase.com/docs | 用法可能已废弃 |
| Next.js 15 API 变更 | WebFetch nextjs.org/docs | Server/Client 边界可能搞错 |
| shadcn/ui 组件安装命令 | WebSearch 最新版本 | 命令可能已变化 |
| 第三方库版本兼容性 | npm/pnpm 查询最新版本 | 安装可能失败 |

### 5.2 禁止猜测的领域

- **税率数字**：必须来源于内部税务文档或联网查证，禁止凭记忆填写
- **API 签名**：Supabase/Next.js 的函数参数，必须查文档或类型定义
- **CSS Token 值**：必须引用上方 Design Tokens 表，禁止凭印象写颜色代码
- **SQL 语法**：PostgreSQL 特有语法（如 gen_random_uuid()）必须确认支持

### 5.3 降级策略

```
WebSearch/WebFetch 成功 → 使用搜索结果
         ↓ 失败
Agent Reach (Jina/Exa) → 使用替代搜索
         ↓ 失败
查阅本地 node_modules 中的类型定义文件 → 使用类型签名
         ↓ 也没有
标记为 [待验证]，在代码中加 TODO 注释，不默默跳过
```

---

## 六、Git 与版本控制

### 6.1 分支策略

```
main ← 只有通过所有验证的代码才能合并
  └── dev ← 日常开发分支
       ├── feat/step-2-calc-engine
       ├── feat/step-3-supabase
       └── feat/step-4-auth
```

### 6.2 Commit 规范

```
<type>(<scope>): <subject>

type: feat | fix | refactor | test | docs | chore
scope: calc | auth | ui | admin | db | deploy
```

示例：
- `feat(calc): implement USN-6% tax calculation for all tiers`
- `test(calc): add 6 golden test cases from tax document`
- `feat(ui): implement TierSelector with 4-tier support`

### 6.3 提交前检查（每次 commit 前必须执行）

```bash
pnpm tsc --noEmit      # TypeScript 类型检查
pnpm lint               # ESLint 检查
pnpm test:run           # 所有测试通过
```

三项全部通过才允许 commit。

### 6.4 长批次开发模式（5.4-5.7 等多 phase 一次性交付）

当多个相邻 phase 的功能强耦合、需要一次性交付时，采用**父-子分支模式**：

```
main
└── dev
    └── feat/step-5-4-to-5-7-tax-views (父分支，长寿)
        ├── feat/step-5-4-tax-compare    → 子 PR 进父分支
        ├── feat/step-5-5-compare-batch  → 子 PR 进父分支
        ├── feat/step-5-6-save-history   → 子 PR 进父分支
        └── feat/step-5-7-ux-polish      → 子 PR 进父分支
```

规则：
- 父分支只接受子分支的 squash merge，**不**直接接受 commit（除 commit-0 策略文档）
- 每个子分支独立通过 §6.3 的提交前检查 + Subagent 团队 review（见 §11）
- 子分支合入父分支后立即推送父分支同步进度
- 全部子 phase 完成后，父分支整体 PR 进 dev → main，发版 v0.X.0
- 任一子 phase 设计需要回炉，**只回退该子分支**，父分支保持稳定
- 长批次完成 PR 之前，必须经过 §11.4 场景 B 的 Codex 终审

---

## 七、财务数字处理红线

### 7.1 绝对规则

- 税务文档中的数字：**照搬原文**，不判断对错
- 发现文档内数字不一致：列出问题 + 提供修改建议 + **等用户确认才修改**
- 计算引擎中的税率常量：必须能追溯到税务文档的具体页码
- 禁止四舍五入改变业务含义（如 12.6% 不能写成 13%）

### 7.2 数字精度

- 金额：保留 2 位小数（`round(n, 2)`）
- 税率：保留 4 位小数（`round(rate, 4)`）
- 百分比显示：保留 2 位小数（`XX.XX%`）

---

## 八、每个 Step 的详细执行检查清单

### Step 2：计算引擎

```
□ 读取 types.ts 确认类型定义完整
□ 编写 6 个黄金测试用例（先于实现代码）
□ 编写边界值测试（至少 6 个）
□ 实现 USN-6% 策略
□ 运行测试，验证 USN-6% 三个档位全部通过
□ 实现 USN-15% 策略
□ 运行测试，验证 USN-15% 三个档位全部通过
□ 实现 OSNO 策略
□ 运行测试，验证 OSNO 通过
□ 实现 determineTier() 和 recommendRegime()
□ 运行全部测试 → 全绿
□ 检查覆盖率 > 90%
□ 代码审查：是否符合策略模式、纯函数、无副作用
```

### Step 3：Supabase 数据层

```
□ 验证 4 个 SQL 迁移文件语法正确
□ 创建 Supabase 项目（或本地 Docker）
□ 执行迁移
□ 配置 server.ts（使用 @supabase/ssr，cookies() 必须 await）
□ 配置 client.ts（浏览器端）
□ 生成 TypeScript 类型
□ 验证 RLS 策略（普通用户只能访问自己的数据）
□ 编写 handle_new_user trigger
□ TypeScript 零错误
```

### Step 4：认证系统

```
□ 实现 /login 页面（邮箱+密码表单）
□ 实现 /register 页面
□ 实现 Server Actions（signIn, signUp, signOut）
□ 实现 middleware.ts 路由保护
□ 验证：未登录 → 重定向到 /login
□ 验证：已登录 → 可访问 /calculator
□ 验证：非管理员 → 不能访问 /admin
□ UI 符合设计系统（居中卡片、下划线输入框）
```

### Step 5：成本测算前端

```
✓ 实现 TierSelector（4 档切换，chip 样式）
□ 实现 ProductManager（商品列表 + 添加/删除）
✓ 实现 CostInputPanel（核心参数 + 5 项支出）
□ 实现 ResultPanel（KPI 卡片 + 柱状图 + 详细表格）
□ 实现 CompareView（多品多税制矩阵表）
□ 实现 BatchSimulation（批量利润模拟）
□ 接入计算引擎，验证数字与测试数据一致
□ 响应式测试（桌面 + 移动端）
□ 所有金额使用 font-mono
□ 所有颜色使用 Design Token
□ 保存测算记录到 Supabase
```

当前检查点（2026-03-30）：`Phase 5.2` 已完成并通过 `pnpm lint`、`pnpm test:run`（75 tests）、`.\\node_modules\\.bin\\tsc.cmd --noEmit`。下一步进入 `ProductManager + ProductFormModal + Server Actions`。

### Step 6：后台管理

```
□ 实现 Admin layout（侧栏 + 头部）
□ 实现权限守卫（role !== 'admin' → 403）
□ 实现 /admin/users（用户列表 + 搜索 + 启禁用）
□ 实现 /admin/tax-config（各档位税率 CRUD）
□ 实现 /admin/stats（注册数、测算次数、活跃用户统计卡片）
□ 验证：税率修改后前端计算结果实时更新
□ UI 符合设计系统
```

### Step 7：部署

```
□ 更新 Dockerfile（multi-stage, standalone output）
□ 更新 next.config.ts（output: 'standalone'）
□ docker build 成功
□ docker run → localhost:3000 可访问
□ 环境变量全部通过 .env 注入，无硬编码
```

---

## 九、Codex 专用指令

> **范围**：本节适用于通过 `/ask codex`（ccb 外部 provider）派工的场景。
> Claude Code **内置 subagent** 团队协作请参考 §11，主流程优先内置 subagent。

当使用 Codex 执行时，必须在 prompt 中包含以下约束：

```
你正在开发 ELSCBSSXT 跨境电商成本测算系统。
必须遵守项目根目录 DEVELOPMENT_STRATEGY.md 中的所有规则。
关键约束：
1. 所有颜色必须使用 Design Token（--color-*），禁止硬编码
2. 所有金额数字必须使用 font-mono 字体
3. 计算引擎是纯函数，禁止副作用
4. 组件默认 Server Component，只在需要交互时才加 'use client'
5. 税率数字来源于内部税务文档，不允许凭记忆修改
6. 每次修改后必须运行 tsc --noEmit + pnpm test:run
```

---

## 十、文档维护

- 本文件由 Claude Code 负责维护
- 每完成一个 Step，更新对应的检查清单（□ → ✓）
- 发现需要调整的规则，必须先征求用户同意，不擅自修改
- 每次新会话开始时，必须先读取本文件和 checkpoint

---

## 十一、Subagent 团队协作 SOP（Claude Code 内置 Agent 工具）

### 11.1 团队架构（核心 3 + 按需 5）

主线 Claude（designer + executor）派工以下 subagent 形成"虚拟团队"：

| 角色 | subagent_type | 模型 | 何时调用 |
|---|---|---|---|
| **Planner** 计划员 | `Plan` | Sonnet | Phase 启动：把 PRD 翻译为可执行 SPEC |
| **Reviewer** 审查员 | `superpowers:code-reviewer` | 全能 | Phase 收尾：综合 code review |
| **QA** 质检员 | `quality-checker` | Haiku | Phase 验收：跑 tsc/lint/test，给 pass/fail |
| **Architect** 架构师 | `architect` | Opus | 引入新依赖、状态管理、关键设计抉择 |
| **Explorer** 探索员 | `Explore` | Sonnet | 不熟悉现有代码时的快速摸底 |
| **Failure Hunter** | `pr-review-toolkit:silent-failure-hunter` | 全能 | 写完错误处理逻辑后 |
| **Test Analyzer** | `pr-review-toolkit:pr-test-analyzer` | 全能 | 写完测试后审查覆盖度 |
| **Doc Validator** | `doc-validator` | Haiku | PRD 与代码一致性检查 |

> **核心 3 人**（Planner / Reviewer / QA）是每 phase 必跑的最小团队。
> **按需 5 人** 根据 phase 内容由主线 Claude 动态调用。

### 11.2 每个 phase 的 5 步 SOP

```
STEP 1  主线 Claude 读 PRD-0X，切子分支 feat/step-5-X-xxx

STEP 2  Agent: Plan
        输入：PRD-0X + 现有代码上下文
        输出：SPEC（实施步骤 / 文件清单 / 测试计划）
        ↓ 用户确认 SPEC

STEP 3  主线 Claude 串行执行 SPEC（写代码 / 跑 vitest / 调试）
        不熟悉时随时派 Explore / Architect 子 agent

STEP 4  三把刀并行审查（同一消息内多 Agent 调用）
        ① superpowers:code-reviewer
        ② pr-review-toolkit:silent-failure-hunter（如涉及错误处理）
        ③ quality-checker
        ↓ 整合反馈

STEP 5  主线 Claude 修 bug → 二审 → commit
        二审失败 ≥3 轮则上报用户
```

### 11.3 联网搜索降级链（遇到不懂时）

按以下顺序尝试，前者失败才用后者：
1. **WebSearch**（首选）
2. **WebFetch**（已知具体 URL 时）
3. **Agent Reach**（mcporter `exa.web_search_exa` / `curl r.jina.ai`）
4. **`/ask gemini`**（最后兜底，需要外部独立视角时）

### 11.4 ccb 外部 provider（备用，但有两个固定场景）

主流程不依赖 ccb，但以下两种情况**必须**调用：

**场景 A：重大架构决策需要独立判断**
- 引入新依赖、改变状态管理、修改 engine 等关键决策
- 派工：`/ask codex`（按 §9 携带项目约束）→ 拿独立判断
- 与内置 `architect` subagent 形成"双盲审"

**场景 B：长批次（多 phase 一次性交付）的整体集成审查 + bug 测试**
- 触发时机：所有 phase 子分支已合入父分支后、父分支 PR 进 dev 之前
- 派工方式：`/ask codex` 提交完整 `git diff main...feat/step-5-X-to-5-Y-...` + 涉及的 PRD 清单
- Codex 必须执行的全套清单：
  - ① **整体架构 review**：组件耦合 / 数据流 / 命名一致性
  - ② **Bug 测试**：手工跑场景 + 找 race condition / null 溢出 / 边界值漏洞
  - ③ **PRD 一致性核对**：每个 PRD 的 MUST HAVE 清单逐项对照
  - ④ **性能审查**：渲染帧数 / 计算引擎调用频次 / 不必要的 re-render
  - ⑤ **安全审查**：RLS 双层 / Server Action userId 过滤 / IDOR
- Codex 输出：JSON 评分（按 AGENTS.md Rubrics）+ 问题清单
- 用户把 Codex 反馈转发给主线 Claude → Claude 修 → 再审（最多 3 轮）→ 通过后才允许 PR

### 11.5 团队禁忌

- ❌ 跳过 Plan 直接写 IMPL（除非是 ≤10 行的 fix）
- ❌ 同一 phase 三审都不过却不上报用户
- ❌ 在主线 Claude 上下文 review 自己的代码（必须派 subagent）
- ❌ subagent 写代码——subagent 角色是 read + recommend；写入落地由主线 Claude 完成
- ❌ Plan/Architect 给的方案与 PRD 冲突时硬上——必须先回 PRD 找答案或上报用户
- ❌ 长批次完成跳过 §11.4 场景 B 的 Codex 终审直接 PR
