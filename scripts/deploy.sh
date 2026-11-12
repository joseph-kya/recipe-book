#!/bin/sh
# Build and publish dist/ to the gh-pages branch (GitHub Pages serves it).
set -e
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
tmp="$(mktemp -d)"
git worktree add -f --detach "$tmp" >/dev/null
(
  cd "$tmp"
  git checkout -q --orphan gh-pages-tmp
  git rm -rq --cached . >/dev/null 2>&1 || true
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -r {} +
  cp -R "$OLDPWD/dist/." .
  git add -A
  git commit -qm "Deploy $(git -C "$OLDPWD" rev-parse --short HEAD)"
  git push -qf origin HEAD:gh-pages
)
git worktree remove --force "$tmp"
git branch -D gh-pages-tmp >/dev/null 2>&1 || true
echo "Deployed. Pages updates in about a minute."
