# Daily Demo Shelf

Daily Demo Shelf 是一个纯静态展示平台，用来收录每天生成的创业 Demo。每个 Demo 都包含产品截图、价值主张、目标用户、痛点、盈利路径、验证记录、技术栈和演示/代码链接。

当前 Demo 包括 `AGENTS.md Coverage Radar`、`AgentGate`、`Agent Trace Console`、`AnswerRank`、`CopilotBurn`、`MergePulse`、`MCP Gateway Readiness Scanner`、`ModelShift`、`Prompt Drift Lab`、`Release Note Impact Radar` 和 `Workspace Agent Route Planner`，都已内置在 `demos/<demo-id>/`，部署到 Pages 后可以直接从展示站打开演示。

## 本地运行

```bash
cd /Users/yunhao/src/demo-showcase
npm run dev
```

打开：

```text
http://127.0.0.1:4174/
```

## 数据入口

核心数据在：

```text
data/demos.json
```

追加每日 Demo：

```bash
npm run add-demo -- \
  --name "Demo Name" \
  --tagline "一句话价值主张" \
  --audience "目标用户" \
  --problem "核心痛点" \
  --demo "https://example.com" \
  --repo "https://github.com/user/repo" \
  --cover "./assets/demo-cover.png" \
  --tags "AI,SaaS,Automation" \
  --monetization "订阅收费,按使用量收费" \
  --validation "可运行原型已创建,已完成 QA" \
  --stack "Vite,React,TypeScript" \
  --score 82 \
  --status validated
```

校验数据：

```bash
npm run validate
```

## 免费部署建议

优先级建议：

1. Cloudflare Pages：主站托管，连接 GitHub 后自动部署；也支持 Wrangler 直接上传 `dist`。
2. GitHub Pages：保留为备份镜像和代码展示页，当前已经上线。
3. Vercel / Netlify：仅作额外免费备选，不作为当前主线。

推荐部署方式：同一份静态代码、同一个 `data/demos.json`，每天新增 Demo 后 push 到 GitHub，Cloudflare Pages 自动部署主站。若后续绑定自定义域名并面向中国大陆正式运营，需要按域名和访问链路要求处理实名认证、备案和内容合规。

## 每日流程

1. 选一个创业点子。
2. 做出可运行 Demo。
3. 截图保存到 `assets/`。
4. 如果 Demo 是纯前端静态产物，把构建结果放到 `demos/<demo-id>/`。
5. 用 `npm run add-demo` 追加到 `data/demos.json`。
6. `npm run validate`。
7. 推送到 GitHub，由 Cloudflare Pages 自动部署。

## Cloudflare Pages 设置

推荐在 Cloudflare 控制台连接 GitHub 仓库：

- Repository：`liyunhaocn/demo-showcase`
- Production branch：`main`
- Build command：`npm run build`
- Build output directory：`dist`
- Root directory：留空
- 不要把 Build output directory 填成 `/`、`.` 或仓库根目录；否则 Cloudflare 会把 `node_modules` 一起上传，触发 `workerd` 文件过大的错误。

本地验证与发布辅助命令：

```bash
npm run validate
npm run build
npm run publish
```

当前预期公开地址：

- Cloudflare Pages：创建项目后由 Cloudflare 生成，例如 `https://demo-showcase.pages.dev/`
- GitHub Pages：`https://liyunhaocn.github.io/demo-showcase/`

详细部署步骤见 `docs/deploy.md`。
