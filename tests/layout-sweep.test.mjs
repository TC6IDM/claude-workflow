// The layout sweep sees the defects it claims to see, and stays quiet on a clean page.
// Needs a Playwright with a browser: PLAYWRIGHT_MODULE, a sibling repo's, or the global CLI's;
// the test is skipped (not failed) when none loads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { sweepWith, loadPlaywright } from '../design/visual-redesign/scripts/layout-sweep.mjs';

const guess = [process.env.PLAYWRIGHT_MODULE, join(homedir(), 'Desktop/EzAutoApply/extension/node_modules/playwright')].filter(Boolean).find(existsSync);
if (guess) process.env.PLAYWRIGHT_MODULE = guess;
let pw = null;
try { pw = loadPlaywright(); } catch { /* skipped below */ }
const browserOk = pw && await pw.chromium.launch().then(b => b.close().then(() => true), () => false);
const t = browserOk ? test : test.skip;

const classes = { desk: { sizes: [[800, 600]], ctx: {} }, phone: { sizes: [[320, 640]], ctx: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } } };
const configFor = html => ({
  classes,
  measure: { floor: { px: 12 } },
  async run(h, browser) {
    for (const cls of h.classNames()) {
      const [size] = classes[cls].sizes;
      const ctx = await h.newContext(browser, cls, size);
      const page = h.watch(await ctx.newPage(), cls);
      await page.setContent(html);
      await h.sweep(page, 'fixture', { cls, size, settle: 50 });
      await ctx.close();
    }
  },
});
const kinds = r => new Set(r.findings.map(f => f.kind));
const env = { OUT: join(process.env.TEMP || '/tmp', 'cw-sweep-test') };

t('a clean page has no findings', async () => {
  const r = await sweepWith(configFor('<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0;font:16px sans-serif"><main><h1>Hello</h1><p>Some words.</p><button>Save</button></main>'), env);
  assert.deepEqual(r.findings, []);
});

t('a page wider than the screen, a clipped button, overlapping buttons, tiny type and text on text are all reported', async () => {
  const html = `<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0;font:16px sans-serif">
    <div style="width:1500px;height:10px;background:#ccc"></div>
    <div style="width:80px;height:20px;overflow:hidden"><button style="width:200px">Cut off by its box</button></div>
    <div style="position:relative;height:60px"><button style="position:absolute;left:10px;top:10px;width:100px;height:40px">A</button><button style="position:absolute;left:60px;top:20px;width:100px;height:40px">B</button></div>
    <p style="font-size:8px">tiny words</p>
    <div style="position:relative;height:30px"><span style="position:absolute;left:0;top:0">printed over</span><span style="position:absolute;left:0;top:0">other words</span></div>`;
  const r = await sweepWith(configFor(html), env);
  const k = kinds(r);
  for (const kind of ['frame-scrolls-x', 'clipped', 'controls-overlap', 'type-below-floor', 'text-on-text']) assert.ok(k.has(kind), `missing ${kind}; got ${[...k].join(', ')}`);
});

t('NOISE hides known by-design findings, and SHOW_ALL brings them back', async () => {
  const html = '<!doctype html><body style="margin:0"><a class="skip-link" href="#m" style="position:absolute;left:-500px;width:100px;height:20px">Skip</a><main id=m>Hi</main>';
  const cfg = { ...configFor(html), noise: /skip-link/ };
  const hidden = await sweepWith(cfg, env);
  assert.equal(hidden.findings.filter(f => f.kind === 'off-screen').length, 0);
  const all = await sweepWith(cfg, { ...env, SHOW_ALL: '1' });
  assert.ok(all.findings.some(f => f.kind === 'off-screen'));
});
