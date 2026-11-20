# claude-workflow

One issues / Inbox / sprint system, and one visual-redesign method, shared by PTrainr, Ride The Bus and
EzAutoApply (TC6IDM/EzAutoApply#45, #46). Each repo keeps only its own settings; the scripts, tests, hook
and method text come from here, copied in by `sync.mjs` and pinned by a lock file, so a sprint never
depends on the network.

**This repo is private. EzAutoApply is public.** Nothing in this package may name a private repo's data,
and a public repo's CLAUDE.md must not quote this repo's contents (see "What a public repo may say").

## How the repos and this repo communicate (the whole contract)

There are two directions, and nothing else: **down** (a sync copies this package into a repo) and **up**
(a change to the shared part is made here, never in a repo's copy).

| | Where it lives | Who edits it |
|---|---|---|
| Shared scripts, tests, guard hook, SKILL text, the redesign engine and references | this repo (`package/`, `skill-text/`, `design/`) | here only |
| The copies of those inside each repo (`.claude/skills/<prefix>-issues/*.mjs` and so on) | each repo, committed | nobody: a sync overwrites them |
| A repo's own values | `config.mjs`, `SKILL.repo.md` files, `layout.config.mjs`, its agents | that repo |
| Which version a repo has | `.claude/workflow.lock.json` (version, library commit, hash of every synced file) | `sync.mjs` |

Each repo says this in its own CLAUDE.md, under "Shared workflow library" (the text is
`templates/claude-md-section.md`, so all three say the same thing). The rules in it:

1. **Never edit a synced file in a repo.** It is overwritten by the next sync, and
   `node <this repo>/sync.mjs . --check` fails on it.
2. **A change to shared behaviour** (a script bug, a new sprint flag, a guard rule, shared SKILL text, the
   redesign method) **is made here**: edit, `npm test`, bump `VERSION`, commit and push (the owner's yes, as
   for any commit), then sync **each** repo on its own branch and open a PR in each. Fixing it in one repo
   only would be lost on the next sync and the other repos would never get it.
3. **A change specific to one repo** (a label, a milestone, the Project number, the build checks a sprint
   runs, the repo's rules in the SKILL text, its sweep states) is made in that repo's `config.mjs` or
   `SKILL.repo.md` / `layout.config.mjs`. Nothing changes here.
4. **Found a problem in the shared part while working in a repo?** Tell the owner, or log an issue in this
   repo (repo, command, output). Do not patch the synced copy to get unstuck, except as a throwaway test
   that is reverted.
5. **Behind?** `node <this repo>/sync.mjs . --check` says whether a repo matches the library. Run it before a
   sprint on a long-idle repo.

### Changing the library, step by step

```
cd Desktop/claude-workflow
# 1. edit package/, skill-text/, design/ or templates/
npm test                                  # the library's own tests (sync, the layout sweep)
# 2. bump VERSION (patch for a fix, minor for a new option or script)
git add -A && git commit -m "..." && git push        # with the owner's yes
# 3. for each repo that uses it (a branch each; the repos are worktree-friendly):
node sync.mjs ../Ride-The-Bus-monorepo            # prefix and design come from the repo's lock
node sync.mjs ../PTrainer/PTrainer
node sync.mjs ../EzAutoApply
# 4. in each repo: run the shared tests, commit, PR
node --test ".claude/tests/*.test.mjs"
```

The shared tests (`package/tests/`) are copied into every repo and run there against that repo's own
`config.mjs`, so a bad value in a config fails in that repo's CI-less `node --test` run, not in a sprint.

## What is in it

| Path | What |
|---|---|
| `package/issues/` | `create-issues`, `sync-board`, `work`, `inbox` (+ `inbox-rules`), `watch-video`, `bootstrap` (+ `board-plan`). The newest of the three copies (EzAutoApply's, which already had Ride The Bus's `--label`/`--external`/Fable lines and PTrainr's Inbox). |
| `package/sprint/` | `sprint.mjs`, `verdict.mjs`. `finish --needs-live` and `--needs-device` are the same flag. |
| `package/hooks/` | `guard.mjs` + `guard-rules.mjs`: the commit/push/merge rule as a PreToolUse hook; force-push denied; per-repo `GUARD_DENY` and `GUARD_ASK_ALWAYS` (below). |
| `package/tests/` | 43 tests the three repos never had (guard, Inbox, sprint verdicts, board plan, config shape). |
| `skill-text/` | The shared text of the `<prefix>-issues` and `<prefix>-sprint` SKILL.md files, with `{{REPO}}`, `{{NAME}}`, `{{PREFIX}}`, `{{PROJECT_URL}}`, `{{NEEDS_LIVE_TEXT}}` filled from the repo's config. |
| `design/visual-redesign/` | The redesign method: `skill.shared.md` (the loop), `references/` (comparison page, building, traps, audio auditions), `scripts/` (the layout sweep engine, the axe sweep, `replace.cjs`). |
| `design/agents/` | Starter `today-capture` and `visual-qa` agents (a repo fills in its servers and states). |
| `design/third-party-skills.json`, `design/skills.mjs` | Which third-party design skills the method calls, by step, and unreviewed candidates. `node design/skills.mjs --repo <path>`. |
| `templates/` | Starting `config.mjs`, the `SKILL.repo.md` files, the design repo part, and the CLAUDE.md section. |
| `examples/ezautoapply/` | EzAutoApply's repo-owned SKILL parts, as split from its old SKILL.md files. |
| `tests/` | `sync` and the layout sweep (it plants defects in fixture pages and checks the sweep reports them). `npm test`. |

## Adding a repo

1. In the repo, make a branch (a worktree beside the checkout keeps the owner's own branch untouched).
2. `node sync.mjs <repo> --prefix <short name> --init [--design]` writes `config.mjs`, the SKILL.repo.md
   files (and, with `--design`, the redesign skill's repo part, `scripts/layout.config.mjs` and the two
   agents) from `templates/`. Fill them in; the repo's old values move into `config.mjs` (see the three
   examples: Ride The Bus, PTrainr and EzAutoApply each did this on 2026-11-19).
3. `node sync.mjs <repo> [--design]` again: renders both SKILL.md files and writes the lock.
4. Run `node --test ".claude/tests/*.test.mjs"` in the repo.
5. Wire `.claude/settings.json` like the others: the PreToolUse guard (`.claude/hooks/guard.mjs`), the
   `sprint.mjs budget --hook`, `precompact`, `aftercompact` and `statusline` hooks, and the Inbox
   `count --hook` on SessionStart. Paths do not change: the scripts land in `.claude/skills/<prefix>-issues`
   and `<prefix>-sprint`.
6. Add the CLAUDE.md section: render `templates/claude-md-section.md` (replace `{{PREFIX}}`, `{{WHERE}}`,
   `{{PRIVACY}}` and the three `{{DESIGN_*}}` slots, as the three repos did).
7. Delete the repo's old copies of the scripts, commit, open the PR.

`config.mjs` exports (see `templates/config.template.mjs`): `OWNER REPO_NAME REPO NAME PREFIX PROJECT
PROJECT_URL PUBLIC_BOARD NEEDS_LIVE_TEXT DESIGN MILESTONES MILESTONE_ORDER PLATFORM LABELS LINKED_REPOS
linkedRepoOf BOARD boardFields`, plus the guard's two options:

- `GUARD_DENY = [{ re: '<regex source>', reason }]`: commands always denied (Ride The Bus: the 40-minute
  math build and the 10-minute production build).
- `GUARD_ASK_ALWAYS = true`: ask before **every** commit and push outside a sprint, even where a permission
  rule would allow it (Ride The Bus and PTrainr). `false`: only main, upstream and a sprint's strays ask, and
  the owner's yes in chat plus allow rules cover the rest (EzAutoApply).

## Where the repos are (2026-11-19)

| Repo | Prefix | Design | Guard | Branch / PR |
|---|---|---|---|---|
| EzAutoApply (public) | `ezaa` | not installed (its UI is a side panel; add `--design` when a redesign starts) | main/upstream ask | `chore/claude-workflow`, PR #121 |
| Ride The Bus (private) | `rtb` | yes (`rtb-visual-redesign`; sweep config = the old `layout-audit.mjs` walker) | ask always, builds denied | `chore/claude-workflow` |
| PTrainr (private, repo `PTrainer`) | `ptrainr` | yes (`ptrainr-visual-redesign`, renamed from `ptrainr-redesign`; its walker is `layout.config.mjs`) | ask always | `chore/claude-workflow` |

## What a public repo may say

EzAutoApply's CLAUDE.md names this repo (`claude-workflow`) and says it is private, but does not link it,
quote it, or paste another repo's private details. Its `config.mjs` and `SKILL.repo.md` files hold only its
own values. If a shared script ever needs to print something repo-private, it must come from that repo's
config, not from this package.

## What differed between the three copies (#46, first box)

- `work`, `watch-video`, `create-issues`, `sync-board`: the same apart from repo names, paths and CRLF.
  PTrainr's `create-issues` and `sync-board` had the milestone, label and board-field tables written into the
  script (now PTrainr's `config.mjs`); Ride The Bus's and EzAutoApply's read `config.mjs`. EzAutoApply added
  cross-references (`#key` in a body is numbered after creation).
- `inbox`: PTrainr's was newest (refuses a comment already logged; `--add`); Ride The Bus's lacked it;
  EzAutoApply took PTrainr's and moved the pure part into `inbox-rules.mjs` (tested).
- `sprint`: Ride The Bus added `--label`, `--external` and the Fable lines; EzAutoApply added linked repos,
  autocompact, wind-down, usage per issue, `verdict.mjs` (tested), and the Inbox line in `budget`. The
  `--needs-device` flag of Ride The Bus and PTrainr is kept as an alias of `--needs-live`.
- `guard`: PTrainr had none; Ride The Bus's denied builds and asked on every commit and push; EzAutoApply's
  has the pure `guard-rules.mjs` (tested) with linked checkouts (`cd <dir> &&`, `git -C <dir>`),
  main-and-upstream-ask, force-push deny. All three behaviours are kept, through `GUARD_DENY` and
  `GUARD_ASK_ALWAYS`.
- Redesign: Ride The Bus's skill was the base; PTrainr's added the ranked audit page, the Day/Night toggle,
  the numbered suggested moves, the axe sweep, the dialog and sticky-bar checks, `replace.cjs`, and its
  traps. The two `layout-audit.mjs` scripts became one engine (`layout-core.mjs` + `layout-sweep.mjs`) and a
  per-repo `layout.config.mjs` holding the states and the noise list.

## Not done yet

- Bootstrapping a **new** repo's labels, milestones and board is `bootstrap.mjs` as EzAutoApply has it; it
  was not re-run against a live board here. The "each finished issue records how much usage it took" line of
  #45 is in `sprint.mjs` (`finish` writes it).
- The linked-repos section of the sprint SKILL text is still in EzAutoApply's repo part, not the shared text.
- `design/third-party-skills.json` candidates are unreviewed; none are installed.
- The ported sweeps were run on a subset of states against the real apps (Ride The Bus intro/board/hold/
  takeover on desktop; PTrainr sign-in, trainer dashboard and two dialogs on phone, plus axe). A full run in
  each repo is the next check.
