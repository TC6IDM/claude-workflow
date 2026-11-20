# Building the pick

The checklist for turning a picked direction into the product, and the habits that cost
time in Ride The Bus's overhaul and PTrainr's "Two inks". Read before step 7 of the loop.
The repo's own file paths, ports, checks and invariants are in its "In this repo" section.

## Before writing code

- Find where each area lives (the repo's `CLAUDE.md` map of which file holds what) and the
  invariants that touch it. Note the checks that **read the source** (tab-bar counts,
  landmarks, "motion is transform/opacity only", every route listed, contrast, locale
  completeness): they will need to know about moved or renamed things.
- Plan sections a reviewer can read one at a time, each verified before the next. Bug fixes
  that are not the redesign (a demo seed, untranslated labels) get their own commits.

## While building

- **Pure logic in a module, with a test.** Geometry and decisions go in plain modules with
  unit tests; components only draw. A new component goes into whatever manifest the repo
  keeps for source-reading tests in the same change.
- **Append, don't rewrite.** In a stylesheet with old rules still in force, new rules go at
  the end under a banner naming the pick or move; edit in place only where an old rule must
  change. **Scope new rules to their container**: class names get reused (`.session-date` was
  a date picker *and* a list column).
- **Cache-bust assets** (`?v=`) after any CSS or JS change in a product without a bundler.
- **Behaviour is not a look.** If a direction needs a new action, route or status, that is a
  feature: server-side authorisation with allowed and denied tests, an audit event, the API
  docs, its own commit.
- **Standing rules that apply to almost every visual change** (the repo's design.md has its
  own): the layout never moves under the user (overlays use transform and opacity only);
  colour comes from the tokens; reduced motion keeps every state change; nothing tips off a
  result before it shows; text is real text (never baked into an image).
- **Strings:** the English text is the key; add it to **every** catalogue with a genuinely
  different value, in the product's own vocabulary, and write the patch with the Write tool
  (heredocs mangle non-ASCII). Sound changes: measure before and after.
- **A comment at the change** says what and why, with "the owner's call, <date>" or
  "suggested move N" when it carries a decision.

## Verifying

- Drive it in the real product, never only the source, on a **throwaway or spare server**
  (never the owner's own dev server or ports: they reclaim and kill a session). Restart the
  dev server after a stylesheet change (it can serve stale CSS to a driver) and wait for it
  to answer before the first navigation.
- Reach the state deterministically (a replay link, a forced resume, a dev flag, a demo
  sign-in) and read state from the DOM; time screenshots off it.
- Check every target size, both outcomes, reduced motion, the dark theme, a right-to-left
  language, the longest language once, and the phone **as a phone** (`isMobile: true,
  hasTouch: true`); a narrow desktop window is not a phone.
- Sweep the states you touched with `scripts/layout-sweep.mjs` (`ONLY=` narrows it). It
  loads each state fresh at each size where the product measures once at start. Treat what it
  prints as leads: open each in a real viewport and look before calling it a defect. Before
  trusting a quiet sweep on a new kind of problem, break the page on purpose with `CSS=` and
  check the sweep reports it.
- **A failing test** that pins a visual rule is a question for the owner, unless they asked
  for exactly that change. Then update the test to state the new rule and prove it still
  bites: break the code on purpose, watch the test fail, restore.

## Writing it down

- `design.md`: the pattern, in a "Patterns from …" section. `CLAUDE.md`: if navigation, a
  rule, or where something lives changed. `DECISIONS.md`: mark the pick built with the date;
  the build log row (*# | Section | Commit | Notes*), and any bug older than the redesign that
  surfaced and was fixed. Memory: the picks, briefly.

## Shipping

- Commit and push only when the owner says so for that batch (or per section, if they
  authorised that for the branch). Logical commits: the archive round, then each section.
- If the look changed, regenerate whatever art is derived from it (a store tile, an icon, a
  social card) and say so.
- The PR description is written for its reviewer: what changes on screen, what does **not**
  (data, maths, permissions, or exactly what does), the checks run with results, and a
  **Before it ships** list: a look on a real phone, the preview deploy's sign-in, a listen
  on real speakers, anything that needs a native speaker. Say if merging deploys to
  production.
