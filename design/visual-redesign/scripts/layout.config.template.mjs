// What the layout sweep needs to know about THIS product: how to reach each state. Copy to
// `layout.config.mjs` beside layout-sweep.mjs (the repo owns it; sync never overwrites it) and
// fill in `run`.
//
// Two ways to walk states, depending on how the product lays out:
//  * Lays out in CSS only (most pages and apps): open a state once per device class, then
//    `h.resizeThrough(page, label, cls)` measures it at each of the class's sizes.
//  * Measures itself once at start (a game's deal, a hand-off, a takeover): load each state fresh
//    at each size with `h.newContext(...)`, then `h.sweep(page, label, { cls, size })`.

// export const classes = { desk: { sizes: [[1440, 900], ...], ctx: {} }, phone: { sizes: [...], ctx: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } } };
// (omit it for the defaults in layout-sweep.mjs)

// Findings that are true by design, learned by looking (a skip link off-screen on purpose, an open
// menu covering what is under it, screen-reader-only text that is a 1px box). Matched on the detail.
export const noise = /skip-link|sr-only|visually-hidden/;

// Options for the measurements (layout-core.mjs documents each).
export const measure = {
  framed: false,                            // true: a game or kiosk that must never scroll
  floor: { px: 12 },                        // the smallest type; or { cssVar: '--type-floor', fallback: 6, phoneFallback: 9 }
  font: null,                               // or { expect: 'inter', except: 'svg' }: flags a control that missed font: inherit
  dialogSel: 'dialog[open]',
  actionsSel: '.modal-actions',
  skipFixedPairs: true,                     // a docked bar floats over scrolling content by design
};

const BASE = process.env.BASE || 'http://127.0.0.1:4176';   // a throwaway server, never the owner's

export async function run(h, browser) {
  for (const cls of h.classNames()) {
    const [w0, h0] = h.classes[cls].sizes[0];
    const ctx = await h.newContext(browser, cls, [w0, h0]);
    const page = h.watch(await ctx.newPage(), cls);
    await page.goto(BASE);
    await page.waitForSelector('main');                      // wait for the state, never a fixed sleep
    await h.resizeThrough(page, 'home', cls);
    // …open each further state (a page, a menu, a dialog) and call h.resizeThrough(page, '<label>', cls)
    await ctx.close();
  }
}
