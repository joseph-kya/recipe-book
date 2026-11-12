# Handoff (12 Nov 2026, ~11:16 Europe/Vienna)

## Done
- Engine: Claude Code 2.1.314, model `claude-opus-5-5`, `--effort medium`. The run finished and printed its summary (132 turns, about $5.98). I killed the process afterwards because it hung, probably on a background preview server it had started.
- Skills pack installed in ~/.claude/skills, ~/.codex/skills, ~/.agents/skills and ~/.cursor/skills (14 skills plus the design-taste-frontend alias). Older copies of 4 skills that were overwritten are backed up in ~/code/.stove/skills-backup-*.
- The engine built a Vite + React static flip book:
  - Cover, contents (01, 03, 04, 05, 06), and one page per recipe. On wide screens each recipe is a two-page spread.
  - Swipe, arrow keys and buttons turn pages. The flip is interruptible and uses only transform and opacity. With reduced motion it is a crossfade.
  - Deep links: #/brownies, #/cinnamon-rolls, #/cheesecake, #/topfenschmarren, #/quark-bake.
  - Cups come first with metric beside them, then steps, cues, tips, source credit and a PDF download.
  - EN/DE toggle. German recipe text appears only for the brownies; the other recipes carry an honest "English only" note.
  - Fonts are self-hosted and the site makes no external requests.
  - Adding a recipe means dropping a JSON in content/recipes/ and its PDF in content/pdfs/, then rebuilding (see README.md).
- The engine reports that `npm run build` passes and that its Playwright checks pass (53/53 at 320, 390 and 1440px).
- Engine log: .stove-logs/run1.jsonl (gitignored). Claude session id: de4a0da2-bdc5-489e-a935-c3fa7d08660f

## Left from BRIEF.md / to check
- Nobody has verified the build independently yet. Still to do: our own `npm run build`, a preview, screenshots at 390x844 and 1440x900, and a fix pass if needed.
- The taste-skill finish gate is OPEN with 10 FAILs:
  - 9 are scroll-section/container rules that don't fit a flip book.
  - 1 is a cover "hard fact" check.
  - Waivers are in .taste-skill/waivers.json (gitignored).
- Joseph should approve the copy the engine wrote itself: "5 recipes from Joseph's oven", "Cups and spoons first. The kitchen scale is broken.", the "Cups first!" sticker, and a "How this book works" page.
- React Bits is not used; the cover animation is plain CSS.
- Each recipe JSON gained an optional `"route"` field. No recipe text was changed.

## Resume
Run the site:

    cd ~/code/recipe-book && npm install && npm run build && npm run preview -- --port 4173
    # then open http://localhost:4173/

Continue the same engine session (run only one engine at a time):

    cd ~/code/recipe-book && mkdir -p .stove-logs && claude -p --resume de4a0da2-bdc5-489e-a935-c3fa7d08660f \
      --model claude-opus-5-5 --effort medium \
      --permission-mode acceptEdits --permission-prompts none \
      --allowedTools "Read Edit Write Glob Grep Skill TodoWrite Read(~/.claude/skills/**) Bash(npm *) Bash(npx *) Bash(node *) Bash(git add *) Bash(git commit *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git mv *) Bash(ls *) Bash(mkdir *) Bash(cat *) Bash(wc *) Bash(head *)" \
      --disallowedTools "Bash(git push*) Bash(git remote*) Bash(rm -rf *)" \
      --output-format stream-json --verbose "<fix-pass instructions>" > .stove-logs/run2.jsonl 2>&1

Fallback engine: Codex CLI with GPT 6.1 Sol at medium effort. Check `codex --help` for the exact model id and flags first.
