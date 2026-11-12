# Handoff (12 Nov 2026, ~12:25 Europe/Vienna)

## State
- Engine: Claude Code 2.1.314, model `claude-opus-5-5`, `--effort medium`, one session (de4a0da2-bdc5-489e-a935-c3fa7d08660f). Two runs: the initial build and fix pass 1 (prompt in .stove-logs/FIX1.md, gitignored).
- Fix pass 1, independently re-verified with Playwright at 390x844 (DPR 2, mobile, touch) and 1440x900:
  - Wide recipe spreads are paginated, with no inner scroll. Brownies take 2 spreads; cinnamon rolls take 4 at 1440.
  - Recipe stickers are removed. The cover sticker is quieter.
  - Long cup amounts drop to their own line on phones.
  - The phone bottom bar clears the end of the page.
  - The swipe axis is locked, so sideways swipes don't also scroll.
- `npm run build` passes. No horizontal overflow at 390. No touch targets under 44px. Fonts load.

## Run
    cd ~/code/recipe-book && npm install && npm run build && npm run preview -- --port 4173 --strictPort
    # http://localhost:4173/

Screenshot check script: `node .stove-logs/shoot.mjs <tag>` (needs the preview running; writes to .stove-logs/shots/).

## Open
- Joseph hasn't reviewed the cover and contents copy yet ("5 recipes from Joseph's oven", "Cups and spoons first. The kitchen scale is broken.", "Cups first!", "How this book works").
- Pagination leaves some half-empty pages. For example, the DE brownies right page holds only the ingredient continuation, and the method starts on the next spread.
- Phone recipe pages scroll vertically inside the page. This is intentional.

## Resume the engine
    cd ~/code/recipe-book && claude -p --resume de4a0da2-bdc5-489e-a935-c3fa7d08660f \
      --model claude-opus-5-5 --effort medium \
      --permission-mode acceptEdits --permission-prompts none \
      --allowedTools "Read Edit Write Glob Grep Skill TodoWrite Read(~/.claude/skills/**) Bash(npm *) Bash(npx *) Bash(node *) Bash(git add *) Bash(git commit *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git mv *) Bash(ls *) Bash(mkdir *) Bash(cat *) Bash(wc *) Bash(head *)" \
      --disallowedTools "Bash(git push*) Bash(git remote*) Bash(rm -rf *) Bash(npm run dev*) Bash(npm run preview*) Bash(npx vite*)" \
      --output-format stream-json --verbose "<instructions>" > .stove-logs/run3.jsonl 2>&1
