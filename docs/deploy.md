# Deployment Notes

This site is static. Any platform that serves `index.html`, `styles.css`, `app.js`, `data/demos.json`, and `assets/` can host it.

For a free first version, use GitHub Pages + Gitee Pages as two mirrors. Gitee is the mainland-facing entry if the account can enable Pages; GitHub is the overseas/open-source mirror.

## Target Topology

- One static source tree: this repository root.
- One data source: `data/demos.json`.
- Two remotes: `github` and `gitee`.
- Two public URLs: `<user>.github.io/<repo>` and `<user>.gitee.io/<repo>`.

## GitHub Pages

- Use as overseas mirror and open-source portfolio.
- Repository source: `main` branch `/` or `gh-pages` branch `/`.
- Build command: none.
- Output directory: `/` or repository root.
- Current helper also pushes `main` to `github/gh-pages` so either source can be selected in GitHub settings.
- Expected URL after Pages is enabled: `https://liyunhaocn.github.io/demo-showcase/`.
- Official docs: https://docs.github.com/en/pages

## Gitee Pages

- Use as the mainland-facing free entry if the current account can enable Pages.
- Repository source: `main` branch `/`.
- Build command: none.
- Output directory: repository root.
- Expected URL after Pages is enabled: `https://liyunhaocn.gitee.io/demo-showcase/`.
- Current availability and review rules must be checked in the logged-in Gitee account.
- Gitee Pages landing page: https://gitee.com/pages?skip_mobile=true

## Remote Setup

```bash
git init
git add .
git commit -m "Initial daily demo showcase"

git remote add github git@github.com:<user>/demo-showcase.git
git remote add gitee git@gitee.com:<user>/demo-showcase.git

git push github main
git push gitee main
git push github main:gh-pages
```

After both remotes exist, the helper command can publish the current branch to both sides:

```bash
npm run publish:dual
```

## Daily Publish

```bash
npm run validate
git add data/demos.json assets/
git commit -m "Add daily demo: <name>"
git push github main
git push gitee main
```

## Compliance Notes

- Keep demo content legal and non-sensitive before publishing.
- If binding a custom domain for mainland visitors, check whether the platform requires ICP filing and domain real-name verification.
- If Gitee Pages is unavailable for the account, keep GitHub Pages as the public mirror and choose another free mirror only after testing mainland accessibility.
