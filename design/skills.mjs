#!/usr/bin/env node
// Prints the third-party design skills by step of the visual-redesign loop, and what is not yet
// installed in a repo.
//
//   node design/skills.mjs                  the whole list, by step
//   node design/skills.mjs --repo <path>    mark what that repo's .claude/skills already has
//   node design/skills.mjs --candidates     the unreviewed candidates, with install commands
//
// It installs nothing: `npx skills add <source>` is run by a person, after reading the skill.
import { existsSync, readdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('./third-party-skills.json', import.meta.url)), 'utf8'));
const args = process.argv.slice(2);
const repoArg = args.indexOf('--repo') >= 0 ? resolve(args[args.indexOf('--repo') + 1]) : null;
const have = new Set();
if (repoArg) {
  for (const base of [join(repoArg, '.claude', 'skills'), join(repoArg, '.agents', 'skills')]) {
    if (existsSync(base)) for (const d of readdirSync(base)) have.add(d);
  }
}

if (args.includes('--candidates')) {
  console.log(manifest.candidates.about + '\n');
  for (const c of manifest.candidates.items) console.log(`${c.ref}  (${c.installs})\n    ${c.fits}\n    npx skills add ${c.ref}\n`);
  process.exit(0);
}

const rows = manifest.installed.map(s => ({ ...s, here: repoArg ? have.has(s.skill) : null }));
const byStep = new Map();
for (const r of rows) for (const step of r.step.split(',').map(x => x.trim().replace(/ \(.*\)/, ''))) {
  (byStep.get(step) || byStep.set(step, []).get(step)).push(r);
}
for (const step of [...byStep.keys()].sort()) {
  console.log(`Step ${step}`);
  for (const r of byStep.get(step)) console.log(`  ${r.here === null ? ' ' : r.here ? '✓' : '·'} ${r.skill}  [${r.source}]  ${r.use}`);
}
if (repoArg) console.log(`\n✓ installed in ${repoArg}, · not installed there. Install: npx skills add <source>`);
