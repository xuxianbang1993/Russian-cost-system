# PRD-10: 部署与运维

| 字段 | 值 |
|------|-----|
| 模块 | Docker 镜像构建 / VPS 部署 / HTTPS / 备份 / 监控 / CI-CD |
| 版本 | v0.1.0 |
| 状态 | ⏳ 规划中（对应 Step 7） |
| Owner | xuxianbang |
| 最后更新 | 2026-04-24 |
| 关联决策 | 头脑风暴 Q12（2026-04-24）—— VPS + Docker |
| 已有资产 | `Dockerfile`、`docker-compose.yml`、Next.js standalone output |

---

## 1. 需求背景（WHY）

### 1.1 业务问题
v0.1.0 的代码跑在本地 `dev:webpack` 上。要真正被卖家使用，必须：
- 有一个对外域名（如 `elscbssxt.com`）
- 能 24/7 访问
- 有 HTTPS
- 数据不丢
- 出问题能追溯

### 1.2 产品价值
- **可用性**：从"我本地能跑"到"任何人都能用"
- **稳定性**：数据安全 + 备份 + 监控告警
- **自动化**：CI/CD 把"改代码→上线"从小时级压到分钟级

### 1.3 业务地位
Step 7 是 v0.1.0 的**交付里程碑**。PRD-00 到 PRD-09 都在讲"做什么"，本 PRD 讲"做出来之后怎么让用户真的用上"。

---

## 2. 用户场景（WHO & WHEN）

### 场景 1：首次上线
> 全部开发完成 → 买一台 VPS → `git clone` + 配 `.env` → `docker-compose up -d` → 配域名 + HTTPS → 用户可以访问。

### 场景 2：日常更新
> 修了个 bug → push 到 `main` 分支 → GitHub Actions 自动 build 镜像 + SSH 到 VPS + `docker-compose up -d --no-deps --build web` → 2 分钟后线上已是新版本。

### 场景 3：紧急回滚
> 某次发版后用户反馈"测算按钮失效" → 在 VPS 上 `docker-compose down && git checkout <prev-tag> && docker-compose up -d` → 3 分钟内回滚。

### 场景 4：数据灾备
> Supabase Free tier 被暂停（7 天无活动）→ 从本地 pg_dump 备份恢复 → 业务无损。

### 场景 5：监控告警
> 凌晨容器 OOM 自动重启 → 监控推送告警到微信 → 管理员早上看到 + 追查原因。

---

## 3. 功能清单（WHAT）

### 3.1 Batch 7.1（核心上线，必做）

| # | 项目 | 要求 |
|---|------|------|
| F-1 | Dockerfile 完善 | 多阶段构建 / standalone output / 镜像 <400MB |
| F-2 | docker-compose.yml 生产配置 | web 服务 + Nginx reverse proxy |
| F-3 | Nginx 配置 | 反代 Next.js / HTTPS / 压缩 / 缓存 |
| F-4 | HTTPS 证书 | Let's Encrypt + certbot 自动续签 |
| F-5 | 域名 DNS | A 记录 + www 别名（用户自备） |
| F-6 | 环境变量管理 | `.env.production` 模板 + 不入仓 |
| F-7 | 上线 smoke test | 登录/商品 CRUD/测算 全链路通 |

### 3.2 Batch 7.2（自动化与灾备）

| # | 项目 | 要求 |
|---|------|------|
| F-8 | GitHub Actions CI/CD | push 到 main → build + deploy |
| F-9 | Supabase 备份策略 | daily auto-backup + 每周 pg_dump 到 S3 |
| F-10 | Docker 容器日志 | `docker logs` + 按大小轮转 |
| F-11 | 健康检查端点 | `/api/health` + compose healthcheck |

### 3.3 Batch 7.3（监控，候选）

| # | 项目 | 要求 |
|---|------|------|
| F-12 | Uptime 监控 | 第三方 ping 服务（UptimeRobot 免费） |
| F-13 | 错误追踪 | Sentry 前端 + 服务端 SDK |
| F-14 | 性能监控 | Vercel Web Analytics 替代或 Grafana |

### 3.4 不做（Out of Scope）
- ❌ Kubernetes（v0.1.0 过度设计）
- ❌ 多实例 + 负载均衡（用户量 <1000 单实例够）
- ❌ CDN（Next.js 静态资源 gzip 就够）
- ❌ 多环境隔离（staging/prod 分离）—— v0.2.0 候选
- ❌ 蓝绿部署 / 金丝雀（单实例无意义）

---

## 4. 架构方案（**Q12 决策：VPS + Docker**）

### 4.1 运行时拓扑
```
                ┌────────────────┐
   用户浏览器  │  https://xxx.com│
                └───────┬────────┘
                        │ 443
                        ▼
           ┌─────────────────────────┐
           │   VPS（阿里云 2核4G）   │
           │                         │
           │  ┌──────────┐           │
           │  │ Nginx    │ :443→3000 │
           │  │ (HTTPS)  │           │
           │  └────┬─────┘           │
           │       │                 │
           │  ┌────▼──────────┐      │
           │  │ Next.js 容器  │:3000 │
           │  │ (standalone)  │      │
           │  └────┬──────────┘      │
           │       │                 │
           └───────┼─────────────────┘
                   │ HTTPS
                   ▼
            ┌──────────────┐
            │ Supabase 云   │
            │ wbwyduolial… │
            └──────────────┘
```

### 4.2 Dockerfile 推荐（已有，需审查）
```dockerfile
# 多阶段：builder + runner
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**要求**：
- 镜像尺寸 < 400MB（alpine + standalone）
- 启动 < 5s
- 暴露 port 3000

### 4.3 docker-compose.yml 生产版
```yaml
version: '3.8'
services:
  web:
    build: .
    restart: always
    env_file: .env.production
    expose: ['3000']
    healthcheck:
      test: ['CMD', 'wget', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: always
    ports: ['80:80', '443:443']
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on: [web]

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    command: renew --quiet
```

### 4.4 Nginx 关键配置
```nginx
server {
    listen 443 ssl http2;
    server_name elscbssxt.com;

    ssl_certificate     /etc/letsencrypt/live/elscbssxt.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elscbssxt.com/privkey.pem;

    # HTTPS best practices
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Reverse proxy to Next.js
    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip + 静态资源缓存
    gzip on;
    location /_next/static/ {
        proxy_pass http://web:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name elscbssxt.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
```

---

## 5. 环境变量清单

**`.env.production`**（**不入仓**，部署时 SSH 上传）：
```bash
# Supabase（从 Dashboard 复制）
NEXT_PUBLIC_SUPABASE_URL=https://wbwyduolialawvnpuoyn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  # 公开可暴露
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...       # 机密！只服务端

# Next.js
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://elscbssxt.com

# 未来扩展
SENTRY_DSN=...              # 若启用 Sentry
GOOGLE_ANALYTICS_ID=...     # 若启用 GA
```

**`.env.production.example`**（入仓，空值模板）：
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
...
```

---

## 6. 备份与灾备

### 6.1 Supabase 云侧（**Q12 决策：继续用云**）
- **Free tier**：daily auto-backup，保留 7 天
- **升级 Pro（$25/月）**：daily backup + 14 天保留 + Point-in-Time Recovery
- v0.1.0 先用 Free，用户量上来后升级

### 6.2 本地冷备（建议）
```bash
# cron: 每周日 02:00 执行
0 2 * * 0 /usr/local/bin/pg_dump \
  "postgresql://...@db.wbwyduolialawvnpuoyn.supabase.co/postgres" \
  --no-owner --no-privileges \
  | gzip > /backups/elscbssxt_$(date +%Y%m%d).sql.gz
```

备份归档到 S3 / 阿里云 OSS（脚本手写，v0.1.0 不做自动化上传，先本地 cron）。

### 6.3 恢复演练
- 部署后**第 1 个月内必须做一次**恢复测试：从备份 SQL 在本地 Docker Postgres 还原 → 跑通应用 → 证明备份可用
- 后续每季度一次

---

## 7. CI/CD 流程（Batch 7.2）

### 7.1 GitHub Actions workflow
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm exec tsc --noEmit
      # 以上三件套必须全绿（DEVELOPMENT_STRATEGY §6.3 红线）
      
      - name: Build & push image
        run: |
          docker build -t elscbssxt:${{ github.sha }} .
          docker tag elscbssxt:${{ github.sha }} elscbssxt:latest
          # push 到 Docker Hub 或 GHCR
      
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/elscbssxt
            git pull
            docker-compose up -d --no-deps --build web
```

### 7.2 必要的 GitHub Secrets
- `VPS_HOST` - VPS IP 或 hostname
- `SSH_KEY` - 部署专用 SSH 私钥（最好限制命令）
- `DOCKER_HUB_TOKEN` - 推镜像用（或 GHCR）

---

## 8. 健康检查与监控

### 8.1 `/api/health` 端点（F-11）
```ts
// src/app/api/health/route.ts
export async function GET() {
  // 简单的存活检查 + 可选的 DB 连接检查
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('tax_config').select('id').limit(1);
    if (error) throw error;
    return Response.json({ status: 'ok', timestamp: Date.now() });
  } catch (err) {
    return Response.json({ status: 'degraded', error: err.message }, { status: 503 });
  }
}
```

### 8.2 Uptime 监控（F-12）
- 用 **UptimeRobot** 免费版：每 5 分钟 ping `/api/health`
- 告警方式：邮件 + 微信（通过 webhook）

### 8.3 错误追踪（F-13 候选）
- **Sentry**：前端 + 服务端 SDK，捕获未处理异常
- **预算**：免费 5K events/月够 v0.1.0 用
- **何时做**：v0.1.0 上线第 2 周，观察 docker logs 足够的话再加

---

## 9. 验收标准（Definition of Done）

### 9.1 上线验收（F-1 到 F-7）
- [ ] Dockerfile 构建成功，镜像 < 400MB
- [ ] `docker-compose up -d` 启动 web + nginx
- [ ] HTTPS 证书有效，浏览器绿锁
- [ ] 访问 `https://elscbssxt.com` 进入登录页
- [ ] smoke test：注册 → 登录 → 加商品 → 跑测算 → 退出 全通
- [ ] 环境变量安全：`.env.production` 不在 git log

### 9.2 自动化验收（F-8 到 F-11）
- [ ] Push main → Actions 自动跑三件套 → 失败则不部署
- [ ] Actions 成功 → 自动 SSH 到 VPS 更新
- [ ] `/api/health` 返回 200 OK + JSON
- [ ] docker-compose healthcheck 判定 web 健康
- [ ] 日志文件按大小轮转（docker 自带 `log-opts`）

### 9.3 灾备验收
- [ ] Supabase 自动备份已启用（Dashboard 可见）
- [ ] cron 每周执行 pg_dump 脚本
- [ ] 手动恢复演练成功（拿一份备份在本地还原）

### 9.4 监控验收（候选）
- [ ] UptimeRobot 配置生效（可在 dashboard 看心跳）
- [ ] 故意制造错误 → Sentry 收到事件（若启用）

---

## 10. 非功能需求

### 10.1 可用性
- 目标：99% uptime（允许每月 7 小时 downtime）
- 故障窗口 < 30 分钟（检测 + 回滚）

### 10.2 安全
- HTTPS 强制（HSTS 头）
- `service_role_key` 只在服务端
- SSH 只允许密钥登录（禁用密码）
- firewall 只开 80/443/22

### 10.3 成本（参考）
- VPS：阿里云 ECS 2C4G ≈ ¥80/月
- 域名：¥55/年
- Supabase Free 或 Pro：$0 或 $25/月
- UptimeRobot Free：$0
- Sentry Free：$0（5K events/月）
- **合计**：¥100-300/月（看 Supabase 档位）

---

## 11. 依赖、约束与风险

### 11.1 依赖
- PRD-00 ~ PRD-09 所有代码完成（Step 7 前置）
- 三件套（lint / test / tsc）必须全绿
- VPS 账号（阿里云/腾讯云/Linode/...）
- 域名

### 11.2 技术约束
- **必须** 用 Docker 部署（已选 Q12: A）
- **必须** 不在 git 存 secret
- **禁止** 跳过 CI 三件套（DEVELOPMENT_STRATEGY §6.3）
- **禁止** 通过 SSH 直接改生产文件（必须走 CI）

### 11.3 已知风险
| 风险 | 严重度 | 缓解 |
|------|-------|------|
| VPS 宕机 | **High** | 监控 + 手动重启；长期建议冷备机 |
| Supabase Free 被 pause | Medium | 每周至少一次业务访问 keep alive；或升 Pro |
| 域名 DNS 解析慢 | Low | 用 Cloudflare DNS |
| 证书续签失败 | Medium | certbot 自动续签 + UptimeRobot 监控证书过期 |
| 首次部署忘记某个 env | Low | `.env.production.example` 清单 + 启动时检查 |
| 镜像尺寸膨胀 | Low | CI 里加 `du -sh` 检查，>500MB 报警 |

---

## 12. 演进路线

### v0.1.0（当前）
- ✅ 单 VPS + Docker + Nginx + Supabase 云
- ✅ GitHub Actions 自动化
- ✅ 基础监控（UptimeRobot）

### v0.2.0
- staging / prod 双环境
- Sentry 错误追踪
- 镜像推 GHCR
- Grafana 性能监控

### v1.0.0
- Kubernetes（业务量 >10K 用户后考虑）
- 多地部署 + CDN
- 蓝绿部署
- 专用运维团队

---

## 13. 相关资源
- 已有 `Dockerfile` + `docker-compose.yml`（已入仓）
- DEVELOPMENT_STRATEGY §Step 7（粗略）+ §6.3 提交前检查（CI 红线）
- Supabase 云项目：`wbwyduolialawvnpuoyn`（Northeast Asia / Tokyo）
- 头脑风暴决策：Q12（VPS + Docker + Supabase 云）
