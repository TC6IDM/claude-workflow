# claude-workflow

One issues / Inbox / sprint system, and one visual-redesign method, shared by PTrainr, Ride The
Bus and EzAutoApply (TC6IDM/EzAutoApply#45, #46). Each repo keeps only its own settings; the
scripts, tests, hook and method text come from here, copied in by `sync.mjs` and pinned by a
lock file, so a sprint never depends on the network.

Status: **local, uncommitted, not on GitHub yet.** No repo has been moved onto it.

## What is in it

| Path | What |
|---|---|
| `package/issues/` | `create-issues`, `sync-board`, `work`, `inbox` (+ `inbox-rules`), `watch-video`, `bootstrap` (+ `board-plan`). The newest of the three copies: EzAutoApply's, which already had Ride The Bus's `--label`/`--external`/Fable lines and PTrainr's Inbox (`log` refuses a comment already logged, `--add`). |
| `package/sprint/` | `sprint.mjs`, `verdict.mjs`. |
| `package/hooks/` | `guard.mjs` + `guard-rules.mjs`: the commit/push/merge rule as a PreToolUse hook. |
| `package/tests/` | The 40 tests the three repos never had (guard, Inbox, sprint verdicts, board plan). Run in the repo they are synced to. |
| `skill-text/` | The shared text of the `<prefix>-issues` and `<prefix>-sprint` SKILL.md files, with `{{REPO}}`, `{{NAME}}`, `{{PREFIX}}`, `{{PROJECT_URL}}`, `{{NEEDS_LIVE_TEXT}}` filled from the repo's config. |
| `design/visual-redesign/` | The redesign method: `skill.shared.md` (the loop), `references/` (comparison page, building, traps, audio auditions), `scripts/` (the layout sweep engine, the axe sweep, `replace.cjs`). |
| `design/agents/` | Starter `today-capture` and `visual-qa` agents (a repo fills in its servers and states). |
| `design/third-party-skills.json`, `design/skills.mjs` | Which third-party design skills the method calls, by step, and unreviewed candidates. |
| `templates/` | Starting `config.mjs`, `SKILL.repo.md` files and the design repo part, written by `sync.mjs --init`. |
| `examples/ezautoapply/` | EzAutoApply's repo-owned SKILL parts, as they were split out of its old SKILL.md files. |
| `tests/` | `sync` and the layout sweep (it plants defects in fixture pages and checks the sweep reports them). `npm test`. |

## Using it

```
node sync.mjs <repo> [--prefix ezaa] [--init] [--design] [--dry] [--check]
```

- First time in a repo: `--init` (writes `config.mjs` and the SKILL.repo.md files from
  `templates/`; fill them in, then sync again). Add `--design` for the visual-redesign method.
- After that: `node sync.mjs <repo>`. A repo's `config.mjs` exporting `DESIGN = true` keeps design on.
- `--check` exits 1 when a shared file in the repo was edited by hand or is behind this package.
  Change the package, never the copy: the next sync puts the package's version back (and says so).
- The repo owns (never overwritten): `<prefix>-issues/config.mjs`, both `SKILL.repo.md` files,
  and for design `scripts/layout.config.mjs` and the two agents.
- Private values (PTrainr and Ride The Bus are private, EzAutoApply is public) live only in
  each repo's `config.mjs` and `SKILL.repo.md`. Nothing in this package names a private repo's
  data; keep it that way, since it is copied into a public repo.

## Moving a repo onto it (one PR per repo; commits in the other two need the owner's yes there)

1. Copy the repo's `config.mjs` values (Ride The Bus has one; PTrainr's are written into its
   scripts) into the template's shape, adding `NAME`, `PREFIX`, `PUBLIC_BOARD`, `NEEDS_LIVE_TEXT`
   (and `DESIGN = true`).
2. Split its two SKILL.md files into `SKILL.repo.md` at the `<!-- shared -->` marker (see
   `examples/ezautoapply/`): the front matter and everything repo-specific; the rest is the
   package's.
3. `node sync.mjs <repo> --prefix <p>`, then run `node --test ".claude/tests/*.test.mjs"` there.
4. Wire `.claude/settings.json` (the guard hook, the budget/precompact/statusline hooks, the
   Inbox SessionStart hook) exactly as EzAutoApply's does; paths do not change, since the
   scripts land in the same `.claude/skills/<prefix>-issues|sprint` folders as before.
5. Delete the repo's old copies of the scripts; the repo's CLAUDE.md says the system is synced
   from claude-workflow and where the lock is.
6. For the redesign skill: split the repo's old `<x>-visual-redesign` / `<x>-redesign` SKILL.md
   into its `SKILL.repo.md` "In this repo" part, move its state walker into
   `scripts/layout.config.mjs` (`run(h, browser)`; the old sweep's `fresh`/`walk` bodies carry
   over, using `h.newContext`, `h.sweep`, `h.resizeThrough`), and its noise list into `noise`.

## What differed between the three copies (#46, first box)

- `work`, `watch-video`, `create-issues`, `sync-board`: the same, apart from repo names, paths
  and CRLF. PTrainr's `create-issues` and `sync-board` had the milestone, label and board-field
  tables written into the script; Ride The Bus's and EzAutoApply's read `config.mjs`. EzAutoApply
  added cross-references (`#key` in a body is numbered after creation).
- `inbox`: PTrainr's was newest (refuses a comment already logged; `--add`); Ride The Bus's lacked
  it; EzAutoApply took PTrainr's and moved the pure part into `inbox-rules.mjs` (tested).
- `sprint`: Ride The Bus added `--label`, `--external` and the Fable lines; EzAutoApply added
  linked repos, autocompact, wind-down, usage per issue, `verdict.mjs` (tested), and the Inbox
  line in `budget`.
- `guard`: each repo's differed; EzAutoApply's has the pure `guard-rules.mjs` (tested) with
  linked checkouts (`cd <dir> &&`, `git -C <dir>`), main-and-upstream-ask, force-push deny.
- None of the three repos had tests for any of it; EzAutoApply now does, and they ship here.

## Not done yet

- No repo is moved over (EzAutoApply's own scripts are still its own copy; the package was built
  from them and the 40 shared tests pass against a scratch copy of its `.claude/`).
- Bootstrapping a **new** repo's labels, milestones and board is `bootstrap.mjs` as EzAutoApply
  has it; the "each finished issue records how much usage it took" line of #45 is already in
  `sprint.mjs` (`finish` writes it); neither was re-verified against a live board here.
- The linked-repos section of the sprint SKILL text is still in EzAutoApply's repo part, not
  the shared text.
- `design/third-party-skills.json` candidates are unreviewed; none are installed.
- The Ride The Bus and PTrainr layout sweeps are not yet ported to `layout.config.mjs`.
