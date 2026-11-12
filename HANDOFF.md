# Handoff (12 Nov 2026, ~17:05 Europe/Vienna), r6

Fixed in r6: buttons use box-shadow, so the Open hover is readable. Controls are content-sized, and the measured pill is inset 3px. The phone bar is one row from 360px. Skills pass: composed contents spread, entrance choreography, contents row micro-interactions, swipe rubber-banding/velocity, and the bar no longer shows a rectangle during transitions. Codex hit its usage limit at about 16:48, and CODEX7 got about 90% done, then I verified and committed it. Audit scripts: `.stove-logs/states.mjs` (contrast per hover/focus state, pixel-based), `.stove-logs/bars.mjs`, `.stove-logs/shoot6.mjs`.
Open: the toggle pill now jumps instead of sliding (clip-path is no longer animated). At 360px the arrows touch the bar edge.

# Handoff (12 Nov 2026, ~16:05 Europe/Vienna)

Pass r5 is done: rename to Joseph's Recipe Book / Josephs Rezeptbuch, numbers by position (1-5), copy cut, a cups | g units toggle (localStorage `recipe-book:units`), design tokens, motion (src/motion.js + motion.css, View Transitions for EN/DE and units), pagination fixes, and the grams PDF that follows the toggle for brownies. Claude Code hit its 5-hour limit at about 15:40 (resets 18:30). Codex finished the pass. Check script: `node .stove-logs/shoot5.mjs <tag> [nosweep]`.

# Handoff (12 Nov 2026, ~13:55 Europe/Vienna)

Update: polish pass merged (balanced pagination, phone bar hides on scroll down, press/focus states, spacing scale, favicon + apple-touch-icon, per-page titles, font preload + metric fallbacks). Codex branch merged and worktree removed. `npm run a11y` (axe, 390 + 1440, EN/DE): 0 violations. Desktop pages still end with some empty space at the bottom (e.g. DE brownies spread 1 at ~50-60%), not broken.


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
