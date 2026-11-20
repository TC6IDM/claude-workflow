# The comparison page and the mock-up kit

How a round is shown to the owner, so the next round reuses it rather than starts again.
Read before step 3 of the loop. Both projects used the same shape: Ride The Bus as one
`index.html` with a tab per area and a shared `kit/`; PTrainr as a `directions.html` review
board plus per-world CSS and renderers per screen. Use whichever fits the product (a game
with a moment to play, or an app with many screens), with these parts.

## 1. The archive

`design-archive/` (tracked in git). A new redesign gets a new dated folder
(`design-archive/<date>-<area>/`) and its own published page; extending an earlier round
republishes to that round's link.

| Path | What |
|---|---|
| `DECISIONS.md` | Every pick, the owner's notes, every option passed on, the build log, links to the published pages. |
| `index.html` (or `directions.html`) | The comparison page: a tab per area; in each, the audit, the **Original** first, then each direction (desktop and phone frames, the facts, Replay / Open full size). |
| `<code>-<name>.html` | One page per direction (`a2-blind`, `w1d-chips-flat`). Refinements are new files with a letter (`w1b`, `w1c`). |
| `today.html` | Plays captured frames of today: `today.html?f=hold0:640,hold1:450&ext=png`. |
| `kit/` | The shared kit, per-area engines, captured backdrops and frames, tab data files. |
| `phase-1…/` or `phase1/` | The audits that preceded a round: findings page and original screenshots. |
| `*-audition.html` | A sound audition page (`audio-auditions.md`). |

## 2. The kit

A `kit.css` that copies the product's own tokens and loads its real font files, so a
mock-up draws in the product's palette and faces; a stage (a fixed full-window box with
layers), the house components (card, panel, button) and a reduced-motion rule that
collapses every animation to 1ms. A `kit.js` exposing:

| Name | Use |
|---|---|
| `size()` | `'desk'` (>= 600px wide) or `'phone'`: every mock adapts to the frame it is in. |
| geometry | Positions **measured off the live product** (slots, rails, bars). Geometry goes stale as the product moves: for new work measure fresh with the today-capture agent and keep the numbers in the area's engine. |
| component drawers | The product's real components redrawn exactly (a card face, a chip), so a mock shows the real thing. |
| `el`, `place`, `loop`, `wait` | Make a node; place it over a measured rect; repeat a demo; a wait that is 0 under reduced motion. |

For an app: a renderer per screen, `M.<screen>(world, device)` returning HTML from **the
same demo data the app seeds** (the real names, the real loads), with each direction's
"world" as a class on the frame (its tokens, type, surfaces). The picked world's values are
what become the product's tokens. A Day/Night (light/dark) toggle and a world switch,
remembered in `localStorage`. Page chrome stays quiet so the mock-ups carry the colour.

## 3. A moment engine

When directions share a moment (a round's reveal, a hold, a win), put the moment in one
engine file and let each direction add only its idea:

- Lay the captured backdrop and composite another capture's region over it where needed.
- Draw the parts every direction needs at measured positions.
- Run the moment at the product's real timings and expose hooks
  (`play({ reset, hold, strike, land })`); await each round before the next, so a page that
  waits for a player's input still works.
- Alternate the outcome so every direction shows both a win and a miss.

A new area writes its own `kit/<area>mock.js` in the same shape.

## 4. A direction page

Plain HTML with no doctype (the artifact publisher wraps it), opening with
`<meta charset="utf-8">` and a `<title>`:

```html
<meta charset="utf-8">
<title>CL3b The squeeze, peeled</title>
<link rel="stylesheet" href="kit/kit.css">
<style>/* only this direction's idea */</style>
<div class="stage" id="s"></div>
<script src="kit/kit.js"></script><script src="kit/holdmock.js"></script>
<script>HOLDMOCK.play({ hold() { ... }, strike() { ... } });</script>
```

A comment at the top of the `<style>` says the idea in two sentences. Animate transform and
opacity; honour reduced motion. If the direction has a setting the owner should try, add a
small mock-only switch in a corner of the stage and read `?param=` for a default.

## 5. Adding a tab

Write a new tab in **its own file with template literals**; an apostrophe inside a
single-quoted string in the page's script has broken every tab at once, twice (both
projects). The file defines, per area, `title`, `intro`, `audit` and `dirs`
(`{ code, name, file, pick, idea, reuse, motion, bytes, risk, frames }`), and the Original's
frame source. Then in the page: a `<script src="kit/<area>items.js">` before the main
script, a tab button (the new one `aria-selected="true"`, the old "New" marker removed from
the previous tab), the items merged in, and the start tab set. Keep the counts in the tab
label right. A frame is either a captured screenshot (`orig('<img>', 'd'|'p', caption)`) or a
live mock (`live(w => M.screen(w, 'p'), 'p', caption)`). An area may also have `covers`:
screens drawn in the picked world without alternatives, for areas the owner only needs to
see ("looks good with this redesign").

**Suggested moves** live beside the directions as data (`moves.json`), numbered and drawn
as before/after diagrams:

```json
{ "t": "Start workout goes to the thumb", "dev": "p",
  "from": [24, 128, 90, 16], "to": [12, 300, 156, 22],
  "fromTxt": "Inside the Today card, mid-screen",
  "toTxt": "Docked above the tab bar whenever a workout is due",
  "why": "The session is why a client opens the app ..." }
```

## 6. Today's frames

`today.html?f=<name>:<ms>,<name>:<ms>[&ext=png]` crossfades `kit/today-<name>-<size>.<ext>`
for the given durations (WebP by default). The capture agent writes the frames with these
names and the durations from its own timeline, so the Original plays at real speed.

## 7. Serving, checking, publishing

- Serve the folder over HTTP (`python -m http.server 8771 --bind 127.0.0.1` from it; try
  another port if busy). `file://` cannot fetch images, fonts or SVGs.
- Check every page headless with the Playwright CLI: no `pageerror`, each tab renders its
  directions, the toggle works, each frame shows what its caption says, and screenshots at
  the moments you describe, timed off DOM state. A 404 for `favicon.ico` is harmless. Look
  at a screenshot of each tab.
- Images: WebP, quality 82: `ffmpeg -loglevel error -y -i x.png -c:v libwebp -quality 82
  -compression_level 6 x.webp` (a 600 KB PNG becomes about 40 KB; PIL may not be installed).
- Publish to the existing artifact, never a new one: `Artifact` with `action: "read"` on
  the link first, then `action: "list", scope: "files"` to see what is live. Diff the live
  page against the committed one: if the live one is NEWER, merge it first. Publish with
  `file_path` the round's HTML, `root` the round folder, and `files` mapping only the new
  and changed files (each published path is its archive path). Files not passed are kept.
- In the reply: which tab to open, what plays in each pane, which is your pick.
