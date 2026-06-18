#!/usr/bin/env bash
set -euo pipefail

npm run validate
npm run build

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository. Run git init and configure the github remote first."
  exit 1
fi

if ! git remote get-url github >/dev/null 2>&1; then
  echo "Missing remote: github"
  echo "Example: git remote add github git@github.com:<user>/demo-showcase.git"
  exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Cannot detect current branch."
  exit 1
fi

git push github "$branch"

if [[ "$branch" == "main" ]]; then
  git push github main:gh-pages
fi

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  npx wrangler pages deploy dist --project-name demo-showcase
else
  echo "Skipped Cloudflare deploy: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or connect the GitHub repo in the Cloudflare dashboard."
fi
