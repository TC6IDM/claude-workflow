## The method

The owner never has to imagine a design from a description. Every choice is a playable
page on the real thing, beside a capture of how it looks today, and every step stops for
the owner's call. It is slower per step and much faster overall, because nothing gets
built twice. Ride The Bus's 2026-10 overhaul (the loader, the board, the panels, the win
takeover, the sounds) and PTrainr's "Two inks" redesign (the whole app, plus 19 moves of
where things live) were both done this way; this is the one method, built on Ride The
Bus's version, with what PTrainr's added where it was better.

The record of every round is the repo's design archive (`design-archive/…`):
`DECISIONS.md` maps every pick to its file and the comparison page has a tab per area.
Read the relevant tab before proposing something for an area that was already explored; a
direction the owner passed on is recorded there with why.

## The loop

The loop stops for the owner at steps 4, 5 and 8. When a step needs answers, ask
everything it needs in **one** round of questions (AskUserQuestion), recommended option
first, rather than one question per message: sizes, themes, languages, the branch, how
commits should go.

### 0. Scope it, and read what is settled

- Name the area and the states it has (empty, with data, mid-action, an error, a dialog
  open; each role; each theme; phone and desktop; the longest language and a right-to-left
  one).
- Read the repo's `design.md`, `CLAUDE.md`, `DECISIONS.md` and the product brief. Settled
  owner's calls are not reopened without asking, with a reason. `design.md` is the system:
  a direction either fits it or proposes changing it, in writing. It is not locked: judge
  a finding on its merit.
- Data, maths, money and permissions are out of scope for a visual redesign. A direction
  that needs a new action, a new status or a changed number is a feature, and is said so.

### 1. Capture today

Spawn the repo's **today-capture** agent to photograph the area on the running product:
the states at desktop and phone (and the other themes or languages when they matter),
into the round's `today/` folder as WebP, plus the measured geometry the mock-ups need
(a clean backdrop with the redesigned element hidden, the element's rect at rest). Doing
it in a subagent keeps dozens of screenshots out of this conversation. For sound, measure
the cue instead (peak, RMS, how much is above 4 kHz, where the strike lands).

### 2. Audit it

Write 4-8 findings, each one concrete and measured, not a taste remark: "Start workout
sits 430px down the card, below the fold on a 320px phone", "the card rises 16px over
1.65s, so the hold reads as nothing happening", "only 1.3% of the energy is above 4 kHz".
Lenses that found real problems: does it move enough to be seen; does it say what matters
first (what is at stake, what is needed); is the main action where the thumb is; is each
thing in the one place a person would look; does it speak the product's own language; does
it hold at the smallest phone, in the longest language, in the dark theme; does it obey
the standing rules. Run the layout sweep and the accessibility sweep (`scripts/`) over the
area too, and publish the findings as one ranked page, each with its screenshot and the
file it lives in.

End the audit with two lines every direction then honours: **"All directions fix it the
same way: …"** (the shared fixes) and **"Kept by all: …"** (the settled calls and
invariants none of them touches). That stops directions differing on things that were
never in question.

### 3. Mock up two or three directions, plus the original

Each direction is a different idea, not a colour swap of one idea. Good sets so far: one
quiet direction built from existing pieces, one that changes the lighting, material or
type, one bold ritual or signature move (Ride The Bus's squeeze was the bold one, and won).

- Build each as a scratch HTML page in the round's folder on the shared kit: the product's
  real tokens, real fonts, real components, real demo data (never lorem ipsum), the
  photographed backdrop at measured positions. Mechanics: `references/comparison-page.md`.
- Play the real moment at the product's real timings, looping, at desktop and phone, with
  a theme toggle when the product has themes. If the outcome could differ (a win and a
  miss, empty and full), alternate them, so the page shows the design does not tip off
  the result.
- Give every direction the same facts: **The idea** (two sentences) · **Signature move**
  (what nobody would mistake for another product) · **Reuses** · **Motion** (properties,
  durations, curves, what reduced motion keeps) · **Cost when shipped** (bytes, new
  strings in every language) · **Honest risk** (phone fit, right-to-left, contrast in the
  dark theme, performance, which settled call it touches).
- The **Original** pane comes first: today's capture, played as frames.
- Mark one **My pick** with why in one line, not a survey.
- If a direction moves something to a different place (a setting into another panel, a
  readout off the board, a control onto the rail), list it as a numbered **move**:
  *from -> to -> why*, drawn as a before/after. Flag any move that reopens a settled call:
  those are asked about, never slipped in with a look. At the end of the build every move
  is checked off as built as drawn, built differently, or not built.

Test each page in a headless browser before publishing (no page errors, every tab renders,
the toggle works, each frame shows what its caption says). Time captures off the page's
own state (`waitForSelector`), never fixed sleeps.

### 4. Publish, then stop

Add a tab to the comparison page and republish it (the recipe is in
`references/comparison-page.md`; read the live artifact before publishing). For sound,
publish a separate audition page (`references/audio-auditions.md`). Then stop and wait for
the owner's pick. Do not start building on a guess. Expect "not yet: one more option, and
cover every tab"; build nothing until the owner says start.

### 5. Refine in rounds

The owner's notes usually come as a list ("half the chips", "not 3D", "start from Big").
Apply them to a NEW file or round (`w1b`, `w1c`, `round-4/`) rather than overwriting the one
they saw, add it to the tab as "Your pick: …, modified", and republish. Earlier passes
stay playable. A note that would break a standing rule gets said back to the owner in one
line before it is built, never quietly dropped.

### 6. Record it

Before or alongside the build, write the round into `DECISIONS.md`: the pick and the
owner's notes, and **every option passed over** (the other directions, earlier passes of the
picked one, other sounds or behaviours offered, any suggestion of yours the owner
overrode), each with its file so it can be reopened. Keep each round in the same shape:

- a table *Area | Picked | Offered and passed on* (with files);
- the owner's notes, each refinement round under its own heading;
- every question asked during the build, with its answer;
- a build log, one row per section: *# | Section | Commit | Notes* (the commit column
  fills in when the owner says commit).

### 7. Build in sections

Groundwork first (tokens, foundation), then each picked area, then the moves. Sections a
reviewer can read one at a time. The checklist and the build traps are in
`references/building.md` and `references/traps.md`; the repo's own traps are in "In this
repo" below. After **every** section:

1. The repo's full check green (tests, types, lint, the checks that read the source).
2. Every changed screen driven in the real product and **looked at** (Read the image): the
   target sizes, a phone as a phone, both outcomes, the dark theme, a right-to-left
   language, reduced motion. For sound, the audio measurement before and after.
3. The layout sweep over the states the section touched (`ONLY=`), or the repo's
   **visual-qa** agent, which runs the sweep, verifies each finding by eye and returns only
   the real ones. The accessibility sweep for any area whose markup changed.
4. A failing test that pins a visual rule is a question for the owner, unless the owner
   asked for exactly that change: then update the test to the new rule and prove it still
   catches a mistake (sabotage the code, watch it fail, restore).
5. Every new or changed visible string in every language the product ships.
6. `design.md`, `CLAUDE.md` and the code comments updated in the same change (with the
   owner's call and its date), and a build-log row in `DECISIONS.md`.

### 8. Close out, and check the build against the pick

When the last section is in: run the full layout and accessibility sweeps (all states,
both device classes, the longest language once) and capture the moments again, so the
comparison page can gain a "Built" pane beside the pick. Go through the picked mock-up
element by element and move by move, and list each as **built as drawn / built differently
/ not built**. Ask the owner about every one built differently, in one round, and say why
it differs (a rule, a size, a cost). Never report "all done" from memory: the list is made
by looking at the mock and the running product side by side.

### 9. Commit only when told

Never commit or push without the owner saying so for that batch (or for each section, if
they authorised that for the branch). Logical commits: the archive round, then each
section. A PR description is written for its reviewer: what changes on screen, what does
**not** change (data, maths, permissions, or exactly what does if a feature rode along),
the checks run with their results, and a **Before it ships** list (a real phone, a listen
on real speakers, the preview deploy, anything that needs a native speaker). Say if
merging deploys to production.

## Design skills this method calls

The method is the loop above; these are the tools called inside it. Load the one a step
needs, not all of them. Which are installed, where they come from, and a list of
candidates found since but **not** installed or reviewed: `design/third-party-skills.json`
in the claude-workflow package (`node design/skills.mjs` prints it by step).

| Step | Skill | What it does here |
|---|---|---|
| 0, 2, 8 | **hallmark** | The audits: reads `design.md` first; its passes found stock neon, cool ink on warm panels, haloed controls, and wrote `design.md`. |
| 2, 7, 8 | **impeccable** (+ its agents) | Critique and polish against a direction; the finish review checks a build against the approved mock. |
| 3 | **frontend-design** | Sets each direction's aesthetic before its mock-up, so the directions are different ideas. |
| 2 (motion) | **improve-animations**, **find-animation-opportunities** | The motion audit; where motion is missing. |
| 2, 3 (motion) | **design-motion-principles**, **emil-design-eng**, **animation-vocabulary** | Per-designer motion reads; the curves and durations in each direction's "Motion" fact; the name for an effect the owner described. |
| 7 (motion) | **review-animations** | Reviewing a built animation against the pick. |
| 1, 7 (sound) | the repo's audio lab, with **game-audio** / **ui-sound-design** | Measuring every cue; the audition pages. |
| 2, 8 | **accessibility**, **web-design-guidelines** | Belongs in step 2 and step 8 of every round. |
| 4 | **artifact-design** | The comparison page's contract when it is published. |

Installed in some repos but not used in a round so far: **design-taste-frontend** (anti-slop
art direction for public marketing or portfolio pages, a better fit there than for an
app screen), **high-end-visual-design**, **ui-ux-pro-max**, **awesome-design-md**,
**redesign-existing-projects**.

## Reference files, scripts and agents

- `references/comparison-page.md`: the archive layout, the mock-up kit, a moment engine,
  a direction page, a tab, today's frames, serving, checking, publishing. Read before step 3.
- `references/audio-auditions.md`: an audition page for sounds, level-matched. Read when
  the area has sound.
- `references/building.md`: the build checklist. Read before step 7.
- `references/traps.md`: every trap the three projects have sprung, by kind (cascade,
  layers, layout and sizes, measuring, mock-up pages, strings and files, sound). Read the
  group for what you are changing; the visual-qa agent reads it too.

| Script (`scripts/`) | Use |
|---|---|
| `layout-sweep.mjs` + `layout-core.mjs` | The layout sweep engine: loads each state at each size (phones as real touch phones) and reports the frame scrolling, controls or text off screen or clipped, overlapping controls, text spilling or printed on text, type under the floor, a font that missed `font: inherit`, and (for dialogs) off-screen, nested scrolling, content under or after the action row. It measures; it does not judge. The repo supplies its states in `layout.config.mjs` (`scripts/layout.config.template.mjs`). `ONLY=`, `SIZES=desk\|phone`, `SHOTS=1`, `CSS=` to try a fix or break something on purpose. |
| `axe-sweep.mjs` | axe-core WCAG 2.2 AA over the same states, light and dark. |
| `replace.cjs` | Exact, all-or-nothing, CRLF-safe text replacements (a spec file, never a heredoc). |

| Agent | Use |
|---|---|
| today-capture | Step 1: today's frames, backdrops and geometry, into the archive. |
| visual-qa | Steps 7-8: runs the sweep, reproduces each finding in a real viewport, looks, finds the rule that causes it, returns only the confirmed problems. Edits nothing. |
| locale-auditor / translator | Any new or changed string, in every catalogue. |
