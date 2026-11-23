// sync.mjs: the shared files land, the repo's own files are never touched, --check sees drift,
// and the shared tests pass in a repo that has only a config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sync = (repo, ...a) => spawnSync(process.execPath, [join(ROOT, 'sync.mjs'), repo, ...a], { encoding: 'utf8' });

function freshRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'cw-'));
  mkdirSync(join(repo, '.claude'), { recursive: true });
  return repo;
}

test('--init writes the repo-owned files, a second sync renders both SKILL.md files', () => {
  const repo = freshRepo();
  try {
    assert.equal(sync(repo, '--prefix', 'demo').status, 2, 'no config yet: asks for --init');
    const init = sync(repo, '--prefix', 'demo', '--init');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    for (const f of ['demo-issues/config.mjs', 'demo-issues/SKILL.repo.md', 'demo-sprint/SKILL.repo.md']) {
      assert.ok(existsSync(join(repo, '.claude/skills', f)), f);
    }
    const second = sync(repo);
    assert.equal(second.status, 0, second.stderr + second.stdout);
    const skill = readFileSync(join(repo, '.claude/skills/demo-sprint/SKILL.md'), 'utf8');
    assert.match(skill, /^---\nname: demo-sprint/);
    assert.ok(!/\{\{\w+\}\}/.test(skill), 'every {{token}} is filled');
    assert.match(skill, /\/demo-sprint/);
    const release = readFileSync(join(repo, '.claude/skills/demo-workflow-sync/SKILL.md'), 'utf8');
    assert.match(release, /^---\nname: demo-workflow-sync\n/);
    assert.ok(!/\{\{\w+\}\}/.test(release), 'the workflow-sync skill has every {{token}} filled');
    assert.match(release, /sync-all\.mjs --dry/);
    assert.ok(existsSync(join(repo, '.claude/workflow.lock.json')));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('the repo\'s own files survive a sync, and --check notices an edited shared file', () => {
  const repo = freshRepo();
  try {
    sync(repo, '--prefix', 'demo', '--init'); sync(repo);
    const cfg = join(repo, '.claude/skills/demo-issues/config.mjs');
    writeFileSync(cfg, readFileSync(cfg, 'utf8') + '\n// mine\n');
    assert.equal(sync(repo, '--check').status, 0, 'in sync');
    assert.equal(sync(repo).status, 0);
    assert.match(readFileSync(cfg, 'utf8'), /\/\/ mine/);

    const work = join(repo, '.claude/skills/demo-issues/work.mjs');
    writeFileSync(work, readFileSync(work, 'utf8') + '\n// hand edit\n');
    const check = sync(repo, '--check');
    assert.equal(check.status, 1);
    assert.match(check.stdout, /work\.mjs/);
    sync(repo);
    assert.ok(!/hand edit/.test(readFileSync(work, 'utf8')), 'a sync puts the package copy back');
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('the shared tests pass in a repo that only has the template config', () => {
  const repo = freshRepo();
  try {
    // A child of node --test reports to the parent, not its own stdout, unless the context is cleared.
    const ownRun = { ...process.env }; delete ownRun.NODE_TEST_CONTEXT;
    sync(repo, '--prefix', 'demo', '--init'); sync(repo);
    const r = spawnSync(process.execPath, ['--test', '.claude/tests/*.test.mjs'], { encoding: 'utf8', cwd: repo, env: ownRun });
    assert.equal(r.status, 0, r.stdout.slice(-1500));
    assert.match(r.stdout, /ℹ pass [1-9]/, 'the shared tests ran');
    assert.match(r.stdout, /ℹ fail 0/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('--design installs the visual-redesign method; the repo\'s sweep config and agents survive a sync', () => {
  const repo = freshRepo();
  try {
    assert.equal(sync(repo, '--prefix', 'demo', '--init', '--design').status, 0);
    assert.equal(sync(repo, '--design').status, 0);
    const base = join(repo, '.claude/skills/demo-visual-redesign');
    for (const f of ['SKILL.md', 'references/traps.md', 'scripts/layout-sweep.mjs', 'scripts/layout-core.mjs', 'scripts/axe-sweep.mjs', 'scripts/layout.config.mjs']) assert.ok(existsSync(join(base, f)), f);
    assert.ok(existsSync(join(repo, '.claude/agents/demo-visual-qa.md')));
    const skill = readFileSync(join(base, 'SKILL.md'), 'utf8');
    assert.ok(!/\{\{\w+\}\}/.test(skill));
    assert.match(skill, /## The loop/);
    assert.match(skill, /## In this repo/);

    const cfg = join(base, 'scripts/layout.config.mjs');
    writeFileSync(cfg, readFileSync(cfg, 'utf8') + '\n// mine\n');
    const agent = join(repo, '.claude/agents/demo-visual-qa.md');
    writeFileSync(agent, readFileSync(agent, 'utf8') + '\nmine\n');
    assert.equal(sync(repo).status, 0, 'design stays on from the lock');
    assert.match(readFileSync(cfg, 'utf8'), /\/\/ mine/);
    assert.match(readFileSync(agent, 'utf8'), /\nmine\n/);
    assert.equal(sync(repo, '--check').status, 0);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
