# Traps visual work has already sprung

Every entry cost time at least once, in the projects this method was built on. Most real
findings in a sweep or a review turn out to be one of these, and so are most false ones: read
the group that matches what you are changing before you start, and again when something
looks wrong. A repo adds its own (framework-specific ones especially) under "In this repo".

## Contents

1. The cascade and specificity
2. Layers, filters and painting
3. Layout, sizes and scrolling
4. Languages
5. Measuring and capturing
6. Mock-up pages and the archive
7. Strings, scripts and files
8. Servers and tooling
9. Sound

## 1. The cascade and specificity

- **A later rule of equal specificity wins silently.** A locked-state rule loaded after a dimming rule and beat it for months; `.modal-card label { display: grid }` stacked radios over their words; `.set-cell > span { display: none }` also hid a picker whose wrapper was a span. After a rule by element type or a new state rule, list what else matches
  and in which order the sheets load.
- **A `<button>`, `<input>` or `<select>` does not inherit `font-family`** (or size): the UA's
  `font: 400 13.333px Arial` wins, and its size half fixes a line box that never scales. Say
  `font: inherit`. Only the computed style of a live page shows it; the sweep's font check
  catches it.
- **Grid and flex children default to `min-width: auto`**: a `<select>` or a long word widens
  its card past the screen. Use `minmax(0, 1fr)` and `min-width: 0`.
- **A component framework may scope styles** (Svelte, for one: a stylesheet only styles the component that imports it, and an unused selector fails the gate; an apostrophe in a CSS
  comment breaks the parser pointing somewhere else). Draw new markup inside the component
  whose sheet styles the parts you reuse.

## 2. Layers, filters and painting

- **A `filter` makes a stacking context and clips what sticks out** (a chip cut at a seam). Put the filter on the part that needs it, and lighten a colour with relative
  colour syntax instead of `brightness()`.
- **Angles drawn on a squashed box are wrong.** Draw it round, then squash with a transform.
- **Text behind a semi-transparent layer stays legible.** A settled number read through a
  veil. Hide it outright; do not count on a veil to cover it.
- **Lettered, not lit** (one project's rule, a good default): no glow, bloom or halo; light from one
  direction, edges lit and shaded.

## 3. Layout, sizes and scrolling

- **A narrow desktop window is not a phone.** Phones need `isMobile` + `hasTouch`; a bare
  resize keeps hover and a fine pointer, and the 44px touch-target rules never apply (a bar came out 11-20px short; touch rules did not fire).
- **A touch laptop reports `hover: none`.** Gate hover on `any-hover`, never `hover: hover`.
- **`position: sticky` sticks to the scroller's *content* edge**: card padding leaves a strip
  where fields scroll past under a sticky action bar. Move the padding into the bar, in the
  card's colour. Sticky only reaches the bottom on a page longer than the screen: a bar that
  must always be at the bottom is `position: fixed` on a phone (pad the page).
- **On a phone only the sheet scrolls**: a dialog and the card inside it with different
  `max-height`s give two scroll areas. A docked button covers the page's last content unless
  the page is padded by its height.
- **Narrow rows** (a phone *or* a half-width panel) need a container query on the row, not a
  viewport media query.
- **A layout must not move under the user**: a new readout line needs an empty state that
  keeps its height; overlays use transform and opacity.
- **Clamp floors**: when a scaled layout bottoms out on a `clamp()` floor, it stops scaling
  and starts restructuring (every small-window defect in one project). Look for the floor first.

## 4. Languages

- **Long words** (Russian, Finnish, German) break fitted names first; **Arabic** mirrors the
  layout but not a table's props. Sweep them, do not assume.
- A mono or display font that is Latin-only falls back to a system font that pulls Arabic
  apart: use `:lang()`. Text somebody typed takes its own direction (`unicode-bidi: plaintext`).

## 5. Measuring and capturing

- **Time screenshots off DOM state, never fixed sleeps** (`waitForSelector`,
  `document.fonts.ready`). Fixed sleeps caught the wrong instant three times.
- **Never resize the window into a moment that has started** where the product measures once
  at start (a deal, a hand-off, a takeover): load fresh at each size.
- **Measure at rest.** Take the running transform out before reading a rect.
- **A defect that does not reproduce may need zoom** (a seam cut showed at 4x and 10x
  `deviceScaleFactor`, not 1x).
- **The sweep measures; it does not judge.** Text with `pointer-events: none` drops out of
  `elementsFromPoint`, a tap area widens `scrollWidth`, a covered element still has a rect.
  Look at the screenshot before calling anything a defect.
- **Full-page screenshots stitch sticky and fixed elements into odd places** (a skip link
  mid-page, a white band under an Arabic rail). Confirm in a real scrolled viewport.
- A long-lived browser keeps the old stylesheet for minutes: bump the cache-bust or load a
  fresh query before measuring. A dev server can serve a stale stylesheet to a driver:
  restart it.
- A preview frame in a desktop browser has gutter scrollbars; real phones overlay them.
- A demo that **rotates** per sign-in (five demo clients) needs test data for each.

## 6. Mock-up pages and the archive

- **An apostrophe in a single-quoted string in the page's script broke every tab at once,
  twice.** Write tab data in its own file with template literals.
- **Start every page with `<meta charset="utf-8">`**, or × and em dashes come out as mojibake.
- **Serve the folder over HTTP**; `file://` cannot fetch images, fonts or SVGs.
- **Read the live artifact before publishing to it.** If it is newer than the committed page,
  merge it first.
- Convert images with ffmpeg (`-c:v libwebp -quality 82`) when PIL is missing.

## 7. Strings, scripts and files

- **Heredocs mangle non-ASCII and backslashes** (`\b` became a backspace, `\d` became `d`):
  write scripts with the Write tool; run Python with `PYTHONUTF8=1` and open files with
  `newline='\n'` (text mode writes CRLF). Many files are CRLF: edit with the Edit tool or
  `scripts/replace.cjs` (its JSON spec written with Write, not a heredoc).
- **New strings go in every catalogue** with a genuinely different value; the completeness
  check fails a missing or identical one. A command that exits non-zero while languages lag
  must not be chained with `&&`.
- **A moved test takes its path strings with it**, and template-literal paths and comments
  naming a file are the half no compiler checks.
- In Git Bash, give Node `C:/…` paths, not `/c/…`.

## 8. Servers and tooling

- **Never use the owner's server or ports.** Dev commands that "reclaim" a port kill their
  session. Use a spare pair or a throwaway server (in-memory database), and stop what you
  started.
- Hooks that match command text can fire on an `echo` of the same words: say so in a
  comment where one exists.
- In the Playwright CLI's `run-code`, never `await` a dialog-confirming helper: it hangs
  until the dialog closes.

## 9. Sound

- A scheduling test pins what gets scheduled, not how it sounds: measure the moment before
  and after and look at the spectrogram.
- A test's fake audio node may lack `disconnect`: wrap it in try/catch or add it to the fake.
- A cache-bust that names the wrong module passes while testing nothing: prove a changed test
  by breaking the code on purpose.
- **The owner chooses by ear.** Level-match renditions before an A/B; a louder one wins for
  being louder.
