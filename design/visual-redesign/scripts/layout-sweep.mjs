#!/usr/bin/env node
// The layout sweep engine. It measures; it does not judge: every finding is a lead to
// reproduce in a real viewport and look at (the repo's visual-qa agent does exactly that).
//
//   node .claude/skills/<prefix>-visual-redesign/scripts/layout-sweep.mjs [config.mjs]
//
// The config (default: layout.config.mjs beside this file, then the repo's copy named in
// LAYOUT_CONFIG) says how to reach each state; see layout.config.template.mjs. Environment:
//   ONLY=<regex>       only states whose label matches, e.g. ONLY="settings|dlg-assign"
//   SIZES=desk|phone   one device class only
//   SHOTS=1            also save a viewport PNG per state and size into OUT
//   OUT=<dir>          findings.json and shots; default <tmp>/layout-sweep
//   SHOW_ALL=1         include findings the config lists as NOISE (true by design)
//   CSS="<rules>"      inject a stylesheet into every page: try a fix before writing it, or break
//                      something on purpose to prove the sweep still sees it
//   CHECK=axe          run axe-core (WCAG 2.2 AA) over the same states instead of the layout checks;
//                      AXE_CORE=<path to axe.min.js> (axe-core is not a dependency: npm install
//                      --prefix <scratch>/axe axe-core). `axe-sweep.mjs` is this with CHECK=axe set.
//   PLAYWRIGHT_MODULE  path to a `playwright` package (else the repo's, else the global CLI's)
// Phones run as real phones (isMobile + hasTouch): a narrow desktop window has hover and a fine
// pointer, and the touch-target rules never apply in it. Exit 0 with nothing found, 1 otherwise.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { measure } from './layout-core.mjs';

export function loadPlaywright() {
  const tries = [];
  if (process.env.PLAYWRIGHT_MODULE) tries.push(() => createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE));
  tries.push(() => createRequire(join(process.cwd(), 'package.json'))('playwright'));
  tries.push(() => createRequire(join(process.cwd(), 'extension', 'package.json'))('playwright'));
  tries.push(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/@playwright/cli/node_modules/playwright`));
  tries.push(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
  for (const t of tries) { try { return t(); } catch { /* next */ } }
  throw new Error('No Playwright found: set PLAYWRIGHT_MODULE, run from a repo that has it, or npm i -g @playwright/cli.');
}

export const DEFAULT_CLASSES = {
  desk: { sizes: [[1440, 900], [1280, 720], [1024, 768], [768, 1024]], ctx: {} },
  phone: { sizes: [[430, 932], [390, 844], [360, 740], [320, 640]], ctx: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
};

/** Runs a loaded config. Exported so tests can drive it without the command line. */
export async function sweepWith(config, env = process.env) {
  const { chromium } = loadPlaywright();
  const OUT = env.OUT || join(tmpdir(), 'layout-sweep');
  const ONLY = env.ONLY ? new RegExp(env.ONLY) : null;
  const classes = config.classes || DEFAULT_CLASSES;
  const NOISE = config.noise || null;
  const findings = [];
  const axe = env.CHECK === 'axe';
  let axeSource = '';
  if (axe) {
    if (!env.AXE_CORE) throw new Error('CHECK=axe needs AXE_CORE=<path to axe.min.js> (npm install --prefix <scratch>/axe axe-core).');
    axeSource = readFileSync(env.AXE_CORE, 'utf8');
  }
  const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
  const check = async (page, scopeSel) => {
    if (!axe) return page.evaluate(measure, { ...(config.measure || {}), scopeSel });
    if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
    const v = await page.evaluate(async tags => (await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] })).violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, targets: x.nodes.slice(0, 3).map(n => n.target.join(' ')) })), AXE_TAGS);
    return v.map(x => [`axe:${x.id}`, `${x.impact} x${x.n}: ${x.help} (${x.targets.join(' | ')})`]);
  };
  mkdirSync(OUT, { recursive: true });

  const h = {
    classes, env, out: OUT, findings,
    wants: label => !ONLY || ONLY.test(label),
    fail: (label, size, cls, detail) => findings.push({ label, size: Array.isArray(size) ? size.join('x') : String(size), cls, kind: 'audit-error', detail }),
    /** Class names to walk, honouring SIZES=. */
    classNames: () => Object.keys(classes).filter(n => !env.SIZES || env.SIZES === n),
    /** A fresh context at one size (an init script applies CSS= and anything the config adds). */
    async newContext(browser, cls, size, init) {
      const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, ...classes[cls].ctx, ...(axe ? { bypassCSP: true } : {}) });
      if (init) await ctx.addInitScript(init.fn, init.arg);
      if (env.CSS) await ctx.addInitScript(css => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }), env.CSS);
      return ctx;
    },
    /** Watch a page for script errors. */
    watch(page, cls = '-') { page.on('pageerror', e => findings.push({ label: 'page', size: '-', cls, kind: 'page-error', detail: String(e.message).slice(0, 160) })); return page; },
    /** Measure the page as it stands (it was loaded fresh at this size). */
    async sweep(page, label, { cls, size, scopeSel = null, settle = 350 } = {}) {
      if (!h.wants(label)) return;
      await page.waitForTimeout(settle);
      let res;
      try { res = await check(page, scopeSel ?? config.measure?.scopeSel ?? null); } catch (e) { res = [['audit-error', String(e.message).slice(0, 120)]]; }
      for (const [kind, detail] of res) findings.push({ label, size: size.join('x'), cls, kind, detail });
      if (env.SHOTS) await page.screenshot({ path: join(OUT, `${cls}-${label.replace(/[\\/]/g, '-')}-${size.join('x')}.png`) }).catch(() => {});
      process.stdout.write('.');
    },
    /** Measure one open state through every size of its class (for products that lay out in CSS only). */
    async resizeThrough(page, label, cls, { settle = 160, phoneSettle = 400 } = {}) {
      if (!h.wants(label)) return;
      // axe finds the same problems at every width: one size per class is enough.
      for (const size of axe ? classes[cls].sizes.slice(0, 1) : classes[cls].sizes) {
        await page.setViewportSize({ width: size[0], height: size[1] });
        // Crossing into the phone layout can turn dialogs into sheets that slide up: measuring
        // mid-slide reports them off-screen.
        await page.waitForTimeout(size[0] <= 720 ? phoneSettle : settle);
        await h.sweep(page, label, { cls, size, settle: 0 });
      }
    },
  };

  const browser = await chromium.launch({ channel: env.PW_CHANNEL || 'chrome' }).catch(() => chromium.launch());
  try { await config.run(h, browser); } finally { await browser.close(); }

  const shown = findings.filter(f => env.SHOW_ALL || !NOISE || f.kind === 'page-error' || !NOISE.test(f.detail));
  writeFileSync(join(OUT, 'findings.json'), JSON.stringify(shown, null, 2));
  return { findings: shown, dropped: findings.length - shown.length, out: OUT };
}

export function report({ findings, dropped, out }) {
  const by = new Map();
  for (const f of findings) { const k = `${f.kind}`; (by.get(k) || by.set(k, []).get(k)).push(f); }
  console.log(`\n${findings.length} finding(s)${dropped ? `, ${dropped} known by-design finding(s) hidden (SHOW_ALL=1)` : ''}; saved to ${out}`);
  for (const [kind, list] of by) {
    console.log(`\n== ${kind} (${list.length})`);
    const seen = new Map();
    for (const f of list) { const key = `${f.label} ${f.detail}`; (seen.get(key) || seen.set(key, []).get(key)).push(f.size); }
    for (const [key, sizes] of seen) console.log(`  ${key}  [${[...new Set(sizes)].join(' ')}]`);
  }
}

export async function main(argv = process.argv) {
  const candidates = [argv[2], process.env.LAYOUT_CONFIG, join(fileURLToPath(new URL('.', import.meta.url)), 'layout.config.mjs')].filter(Boolean).map(p => resolve(p));
  const file = candidates.find(existsSync);
  if (!file) { console.error('No config: pass one, set LAYOUT_CONFIG, or write layout.config.mjs beside this script (see layout.config.template.mjs).'); process.exit(2); }
  const config = await import(pathToFileURL(file).href);
  const result = await sweepWith(config);
  report(result);
  process.exit(result.findings.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
