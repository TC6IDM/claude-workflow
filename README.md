# claude-workflow

One issues / Inbox / sprint system, and one visual-redesign method, shared by PTrainr, Ride The Bus and
EzAutoApply (TC6IDM/EzAutoApply#45, #46). Each repo keeps only its own settings; the scripts, tests, hook
and method text come from here, copied in by `sync.mjs` and pinned by a lock file, so a sprint never
depends on the network.

**This repo is public**, like EzAutoApply; PTrainr and Ride The Bus are private. So nothing in this package may hold
a private repo's data, secrets or internals: only shared scripts and method text, with each repo's own values in
that repo. The same goes for this repo's issues, PRs and commit messages (see "What may go in here").

## How the repos and this repo communicate (the whole contract)

There are two directions, and nothing else: **down** (a sync copies this package into a repo) and **up**
(a change to the shared part is made here, never in a repo's copy).

| | Where it lives | Who edits it |
|---|---|---|
| Shared scripts, tests, guard hook, SKILL text, the redesign engine and references | this repo (`issues-sprint/`, `design/`) | here only |
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
# 1. edit issues-sprint/, design/ or templates/; npm test
# 2. look at the plan (changes nothing, asks nothing):
node sync-all.mjs --dry
# 3. one yes, then all of it: tests, VERSION bump, library commit + push, and in every repo of repos.json
#    a sync branch (the open chore/claude-workflow* PR's, or a new one) in a temporary worktree,
#    sync.mjs, the repo's shared tests, a commit, a push, and the PR opened or updated:
node sync-all.mjs --message-file msg.txt --bump patch|minor [--only "PTrainr,EzAutoApply"]
```

The commit guard asks once for `sync-all.mjs` (without `--dry`); that yes covers the whole run. It never
touches a repo's `main` or the person's checkout, never force-pushes, never merges. A repo whose merge
conflicts or whose tests fail is skipped and reported. In every repo the same steps are the
`<prefix>-workflow-sync` skill ("sync the workflow"), which finds this folder beside the repo. By hand,
one repo at a time, `node sync.mjs <repo>` still works (then the repo's tests, commit and PR as usual).

The shared tests (`issues-sprint/tests/`) are copied into every repo and run there against that repo's own
`config.mjs`, so a bad value in a config fails in that repo's CI-less `node --test` run, not in a sprint.

## What is in it

Two halves, each in its own folder, plus what they share:

```
issues-sprint/   issues, Inbox, sprint, the commit guard, their tests, their SKILL text, and an example repo part
design/          the visual-redesign method: skill text, references, sweep engine, agents, third-party skill list
templates/       starting files for a new repo (config, SKILL.repo.md files, the CLAUDE.md section)
sync.mjs         copies both halves into a repo; tests/ tests sync.mjs and the sweep engine
sync-all.mjs     releases the library and syncs every repo in repos.json, behind one yes
.claude/skills/    workflow-sync: the release as a skill, for a session opened in this folder
```


| Path | What |
|---|---|
| `issues-sprint/issues/` | `create-issues`, `sync-board`, `work`, `inbox` (+ `inbox-rules`), `watch-video`, `bootstrap` (+ `board-plan`). The newest of the three copies (EzAutoApply's, which already had Ride The Bus's `--label`/`--external`/Fable lines and PTrainr's Inbox). |
| `issues-sprint/sprint/` | `sprint.mjs`, `verdict.mjs`. `finish --needs-live` and `--needs-device` are the same flag. |
| `issues-sprint/hooks/` | `guard.mjs` + `guard-rules.mjs`: the commit/push/merge rule as a PreToolUse hook; force-push denied; per-repo `GUARD_DENY` and `GUARD_ASK_ALWAYS` (below). `permission.mjs` + `permission-rules.mjs`: a PermissionRequest hook that, during a sprint, asks a permission prompt on the PR, waits 15 minutes for allow/deny from someone with write access, and answers it (no answer: deny, and the sprint skips the issue on purpose). |
| `issues-sprint/tests/` | 43 tests the three repos never had (guard, Inbox, sprint verdicts, board plan, config shape). |
| `issues-sprint/skill-text/` | `workflow-sync.md`, the wholly shared `<prefix>-workflow-sync` skill (sync-all, step by step). The shared text of the `<prefix>-issues` and `<prefix>-sprint` SKILL.md files, with `{{REPO}}`, `{{NAME}}`, `{{PREFIX}}`, `{{PROJECT_URL}}`, `{{NEEDS_LIVE_TEXT}}` filled from the repo's config. |
| `design/visual-redesign/` | The redesign method: `skill.shared.md` (the loop), `references/` (comparison page, building, traps, audio auditions), `scripts/` (the layout sweep engine, the axe sweep, `replace.cjs`). |
| `design/agents/` | Starter `today-capture` and `visual-qa` agents (a repo fills in its servers and states). |
| `design/third-party-skills.json`, `design/skills.mjs` | Which third-party design skills the method calls, by step, and unreviewed candidates. `node design/skills.mjs --repo <path>`. |
| `templates/` | Starting `config.mjs`, the `SKILL.repo.md` files, the design repo part, and the CLAUDE.md section. |
| `issues-sprint/examples/ezautoapply/` | EzAutoApply's repo-owned SKILL parts, as split from its old SKILL.md files. |
| `.claude/skills/workflow-sync/` | The release (`sync-all.mjs`, one yes) as a skill for a Claude session opened in this folder: "sync all" here does what each repo's `<prefix>-workflow-sync` does from inside a repo. Not synced into the repos. |
| `tests/` | `sync` and the layout sweep (it plants defects in fixture pages and checks the sweep reports them). `npm test`. |

## Adding a repo

1. In the repo, make a branch (a worktree beside the checkout keeps the owner's own branch untouched).
2. `node sync.mjs <repo> --prefix <short name> --init [--design]` writes `config.mjs`, the SKILL.repo.md
   files (and, with `--design`, the redesign skill's repo part, `scripts/layout.config.mjs` and the two
   agents) from `templates/`. Fill them in; the repo's old values move into `config.mjs` (see the three
   examples: Ride The Bus, PTrainr and EzAutoApply each did this on 2026-11-19).
3. `node sync.mjs <repo> [--design]` again: renders both SKILL.md files and writes the lock.
4. Run `node --test ".claude/tests/*.test.mjs"` in the repo.
5. Wire `.claude/settings.json` like the others: the PreToolUse guard (`.claude/hooks/guard.mjs`), the PermissionRequest hook (`.claude/hooks/permission.mjs`, matcher `*`, `timeout` 1200: longer than its 15-minute wait), the
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

## Where the repos are (2026-11-19; `repos.json` holds the paths for sync-all)

| Repo | Prefix | Design | Guard | Branch / PR |
|---|---|---|---|---|
| EzAutoApply (public) | `ezaa` | not installed (its UI is a side panel; add `--design` when a redesign starts) | main/upstream ask | a `chore/claude-workflow` PR |
| Ride The Bus (private repo) | `rtb` | yes (`rtb-visual-redesign`; sweep config = the old `layout-audit.mjs` walker) | ask always, builds denied | a `chore/claude-workflow` PR |
| PTrainr (private, repo `PTrainer`) | `ptrainr` | yes (`ptrainr-visual-redesign`, renamed from `ptrainr-redesign`; its walker is `layout.config.mjs`) | ask always | a `chore/claude-workflow` PR |

## What may go in here

This repo is public. Never put in it, or in its issues, PRs, comments or commit messages: a secret or token,
personal details, or anything from a private repo that is not already public (its users, data, licence or
store evidence, credentials, internals). Describe a problem by its shape ("a sticky bar leaves a strip under
it") and keep the evidence in the repo it came from. Each repo's own values (labels, milestones, board number,
the checks a sprint runs, its sweep states) live in that repo's `config.mjs`, `SKILL.repo.md` and
`layout.config.mjs`, never here. If a shared script ever needs to print something repo-private, it must come
from that repo's config, not from this package.

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
