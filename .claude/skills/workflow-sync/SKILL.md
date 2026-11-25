---
name: workflow-sync
description: 'Release this library and bring every project that uses it up to the new version in one go, with one permission question: the tests, a VERSION bump, the library commit and push, then in each repo of repos.json a sync branch, its tests, a commit, a push and a PR (an open sync PR is updated, not duplicated). Use when working in claude-workflow and asked to "sync all", "sync every project", "sync the workflow", "release", "ship this to the repos", or after changing issues-sprint/, design/ or templates/.'
---

# Release claude-workflow to every project

This folder is the library. The projects that use it are listed in `repos.json`, each with the path of its
checkout relative to this folder. `sync-all.mjs` does the whole release: **one command, one yes.** It is the
same release the projects' own `<prefix>-workflow-sync` skill runs from inside a project; this skill is for a
session opened here.

## 1. Check the change

- Shared behaviour is changed here only: `issues-sprint/`, `design/`, `templates/`, `sync.mjs`,
  `sync-all.mjs`. A project's own values (its `config.mjs`, `SKILL.repo.md` files, `layout.config.mjs`,
  agents) are changed in that project, never here.
- `npm test` must pass.
- **This repo is public.** Nothing about any project's users, secrets, data or private details goes into
  it, its commit message or its issues. Describe a problem by its shape.
- `git status` should show only the change you mean to release. Anything else: stop and ask.

## 2. The commit message and the bump

- Write the message to a file in the scratchpad: a first line `<next version>: <what changed>` (the next
  version is `VERSION` with the bump applied), a short body, and the commit attribution lines this session
  asks for.
- Choose the bump: `patch` for a fix or wording, `minor` for a new command, flag, hook, skill or behaviour.

## 3. Plan, then ask once

```
node sync-all.mjs --dry [--only "<name>,<name>"]
```

This prints the plan (the library commit, which projects' PRs would be updated or opened, which are already
current or missing) and changes nothing. Show the person that plan in a few lines and ask for **one** yes for
all of it: the library's commit and push to `main`, and in every project a branch, a commit, a push and a PR.
That yes is the commit-and-push yes every project's rules require, for this run only. `--only` limits the run
to the projects named (as `repos.json` names them).

## 4. Run it

```
node sync-all.mjs --message-file <file> --bump patch|minor [--only "<names>"]
```

1. The library's tests; `--bump` raises `VERSION`, the change is committed with `--message-file` and `main`
   is pushed.
2. For each project, in a temporary worktree (the person's checkouts are never touched): the open
   `chore/claude-workflow*` PR's branch with `main` merged in, or a new `chore/claude-workflow-<version>`
   branch; `sync.mjs`; the project's shared tests; one commit; a push; the PR opened, or its title and
   description brought up to date with every library change since that project's `main` last synced.
3. A summary line per project.

It never commits or pushes to a project's `main`, force-pushes, or merges a PR. A project whose merge
conflicts or whose tests fail is left alone and reported (a failed one keeps its worktree, named in the
summary). Nothing to release (a clean tree and every project already at `VERSION`): it says so and stops.

## 5. After

- Give the person each PR's link. Merging them is theirs.
- A release that needs a project-owned change (a new `config.mjs` value, a `settings.json` hook, a
  `SKILL.repo.md` line) cannot be made by the sync: say which, per project, and offer to make it on that
  project's sync branch, under that project's rules and with its own yes.
- A sprint already running in a project keeps the old scripts until its branch has the new files: after the
  merge, or with `node <this folder>/sync.mjs .` on that branch as its own commit.
- A project missing from its path in `repos.json` is skipped. To add one, follow "Adding a repo" in
  `README.md`.
