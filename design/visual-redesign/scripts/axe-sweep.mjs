#!/usr/bin/env node
// axe-core WCAG 2.2 AA sweep over the same states as the layout sweep (same config): the
// repo's layout.config.mjs `run` already says how to reach each state, so this is the layout
// sweep with CHECK=axe. Run it for light and dark by having the config set the theme.
//
//   AXE_CORE=<path to axe.min.js> node .claude/skills/<prefix>-visual-redesign/scripts/axe-sweep.mjs [config.mjs]
//
// axe-core is not a project dependency: npm install --prefix <scratch>/axe axe-core, then point
// AXE_CORE at <scratch>/axe/node_modules/axe-core/axe.min.js. CSP is bypassed only so axe itself can
// be injected; nothing in the page changes.
process.env.CHECK = 'axe';
const { main } = await import('./layout-sweep.mjs');
await main();
