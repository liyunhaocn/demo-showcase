# Deployment Notes

This site is static. Any platform that serves `index.html`, `styles.css`, `app.js`, `data/demos.json`, and `assets/` can host it.

For the free production path, use Cloudflare Pages as the primary public site and GitHub Pages as a fallback mirror. Gitee Pages is no longer used for static hosting.

## Target Topology

- One source repository: `https://github.com/liyunhaocn/demo-showcase`.
- One data source: `data/demos.json`.
- One build command: `npm run build`.
- One Cloudflare output directory: `dist`.
- One fallback GitHub Pages URL: `https://liyunhaocn.github.io/demo-showcase/`.

## Cloudflare Pages Git Integration

Recommended for daily automation.

- Cloudflare dashboard: Workers & Pages -> Create application -> Pages.
- Select: Import an existing Git repository.
- Repository: `liyunhaocn/demo-showcase`.
- Production branch: `main`.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Root directory: leave empty.
- Environment variables: none required.
- Expected URL: Cloudflare will create a `*.pages.dev` URL, for example `https://demo-showcase.pages.dev/`.
- Official docs: https://developers.cloudflare.com/pages/configuration/git-integration/

Cloudflare's docs say Git integration can automatically deploy when a connected GitHub or GitLab branch changes.

## Cloudflare Pages Direct Upload

Use this only if you prefer local/manual deployments.

```bash
npm run build
npx wrangler pages deploy dist --project-name demo-showcase
```

This requires Cloudflare authentication through Wrangler or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Official docs: https://developers.cloudflare.com/pages/get-started/direct-upload/

## GitHub Pages

- Use as fallback mirror and open-source portfolio.
- Repository source: `main` branch `/` or `gh-pages` branch `/`.
- Build command: none.
- Output directory: `/` or repository root.
- Current helper also pushes `main` to `github/gh-pages` so either source can be selected in GitHub settings.
- Expected URL after Pages is enabled: `https://liyunhaocn.github.io/demo-showcase/`.
- Official docs: https://docs.github.com/en/pages

## Remote Setup

```bash
git remote add github git@github.com:<user>/demo-showcase.git

git push github main
git push github main:gh-pages
```

After the remote exists, the helper command validates, builds, pushes GitHub, updates the GitHub Pages fallback, and deploys to Cloudflare if Cloudflare credentials are available:

```bash
npm run publish
```

## Daily Publish

```bash
npm run validate
npm run build
git add data/demos.json assets/ demos/
git commit -m "Add daily demo: <name>"
git push github main
```

## Compliance Notes

- Keep demo content legal and non-sensitive before publishing.
- If binding a custom domain for mainland visitors, check whether the platform requires ICP filing and domain real-name verification.
- Cloudflare Pages static asset requests are documented as free on both free and paid plans; avoid Pages Functions unless you intentionally need backend behavior.
