# Daily Demo Shelf

Daily Demo Shelf 是一个纯静态展示平台，用来收录每天生成的创业 Demo。每个 Demo 都包含产品截图、价值主张、目标用户、痛点、盈利路径、验证记录、技术栈和演示/代码链接。

当前首个 Demo `AgentGate` 已内置在 `demos/agentgate/`，部署到 Pages 后可以直接从展示站打开演示。

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

## 免费双端部署建议

优先级建议：

1. Gitee Pages：国内访问入口，前提是当前账号能开通 Pages，且内容通过平台审核。
2. GitHub Pages：海外镜像和开源展示入口，免费、稳定、自动化成熟。
3. Cloudflare Pages / Vercel / Netlify：仅作免费备选镜像，不作为中国大陆主站保障。

双端部署方式：同一份静态代码、同一个 `data/demos.json`，配置两个 Git remote，每天新增 Demo 后同步推到 GitHub 和 Gitee。若绑定自定义域名并面向中国大陆正式运营，需要按域名和托管平台要求处理实名认证、备案和内容合规；默认平台二级域名更适合先做免费展示验证。

## 每日流程

1. 选一个创业点子。
2. 做出可运行 Demo。
3. 截图保存到 `assets/`。
4. 如果 Demo 是纯前端静态产物，把构建结果放到 `demos/<demo-id>/`。
5. 用 `npm run add-demo` 追加到 `data/demos.json`。
6. `npm run validate`。
7. 同步推送到 GitHub Pages 和 Gitee Pages。

## 双端 remote 示例

```bash
git remote add github git@github.com:<user>/demo-showcase.git
git remote add gitee git@gitee.com:<user>/demo-showcase.git

git push github main
git push gitee main
```

也可以在配置好两个 remote 后使用：

```bash
npm run publish:dual
```

当前预期公开地址：

- GitHub Pages：`https://liyunhaocn.github.io/demo-showcase/`
- Gitee Pages：`https://liyunhaocn.gitee.io/demo-showcase/`

详细部署步骤见 `docs/deploy.md`。
