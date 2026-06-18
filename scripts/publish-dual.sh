#!/usr/bin/env bash
set -euo pipefail

npm run validate

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository. Run git init and configure github/gitee remotes first."
  exit 1
fi

if ! git remote get-url github >/dev/null 2>&1; then
  echo "Missing remote: github"
  echo "Example: git remote add github git@github.com:<user>/demo-showcase.git"
  exit 1
fi

if ! git remote get-url gitee >/dev/null 2>&1; then
  echo "Missing remote: gitee"
  echo "Example: git remote add gitee git@gitee.com:<user>/demo-showcase.git"
  exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Cannot detect current branch."
  exit 1
fi

git push github "$branch"
git push gitee "$branch"

if [[ "$branch" == "main" ]]; then
  git push github main:gh-pages
fi
