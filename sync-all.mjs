#!/usr/bin/env node
// One command, one yes: release the library and bring every repo up to it (the owner, 2026-11-23:
// "make it so we only need to ask permission once").
//
//   node sync-all.mjs [--message-file msg.txt] [--bump patch|minor] [--only "PTrainr,EzAutoApply"] [--dry]
//
// 1. The library: its tests must pass. Uncommitted changes need --message-file (the whole commit
//    message, trailers included); --bump raises VERSION first. Commits on main and pushes.
// 2. Each repo in repos.json, in a worktree of its own (the person's checkout is never touched):
//    - an open sync PR (head chore/claude-workflow*) is updated: its branch, main merged in;
//      otherwise a new branch chore/claude-workflow-<version> from origin/main;
//    - sync.mjs, then the repo's shared tests (`node --test .claude/tests/*.test.mjs`);
//    - one commit, a push, and the PR opened or its title and description brought up to date
//      (every library change since the repo's main last synced).
//    A repo already at this version, or one whose tests fail or whose merge conflicts, is left
//    alone and reported (a failed one keeps its worktree for a look).
// Never: a commit or push to a repo's main, a force-push, a merge of a PR. Repo-owned files
// (config.mjs, SKILL.repo.md, settings.json) are never changed; a release that needs one says so.
//
// The commit guard (hooks/guard-rules.mjs) asks once for this whole command: that yes covers
// every commit, push and PR it makes. --dry prints the plan and changes nothing (no question).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = name => args.includes(`--${name}`);
const dry = flag('dry');
const run = (cmd, list, cwd = HERE, extra = {}) => execFileSync(cmd, list, { cwd, encoding: 'utf8', timeout: 10 * 60000, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'], ...extra }).trim();
const git = (list, cwd = HERE) => run('git', list, cwd);
const gh = (list, cwd = HERE) => run('gh', list, cwd, { timeout: 120000 });
const say = line => console.log(line);
const fail = line => { console.log(`STOP: ${line}`); process.exit(1); };

// ---------- 1. the library ----------
if (git(['branch', '--show-current']) !== 'main') fail('the library is not on main');
say('library: running its tests…');
try { run(process.execPath, ['--test', 'tests/*.test.mjs']); } catch (e) { fail(`the library's tests fail:\n${String(e.stdout || e.message).split('\n').filter(l => /✖|fail/.test(l)).slice(0, 15).join('\n')}`); }
git(['fetch', '-q', 'origin', 'main']);
const dirty = git(['status', '--porcelain']);
if (dirty) {
  const file = opt('message-file');
  if (!file) fail(`the library has uncommitted changes; pass --message-file with the commit message:\n${dirty}`);
  const bump = opt('bump');
  if (bump) {
    const [maj, min, pat] = readFileSync(join(HERE, 'VERSION'), 'utf8').trim().split('.').map(Number);
    const next = bump === 'minor' ? `${maj}.${min + 1}.0` : bump === 'patch' ? `${maj}.${min}.${pat + 1}` : null;
    if (!next) fail('--bump is patch or minor');
    if (!dry) writeFileSync(join(HERE, 'VERSION'), `${next}\n`);
    say(`library: VERSION ${maj}.${min}.${pat} → ${next}`);
  }
  if (dry) say('library: would commit and push to main');
  else { git(['add', '-A']); git(['commit', '-q', '-F', resolve(file)]); }
}
const ahead = Number(git(['rev-list', '--count', 'origin/main..HEAD']));
if (ahead && !dry) { git(['push', '-q', 'origin', 'main']); say(`library: pushed ${ahead} commit(s)`); }
const VERSION = readFileSync(join(HERE, 'VERSION'), 'utf8').trim();
const COMMIT = git(['rev-parse', '--short', 'HEAD']);
const LIB = git(['remote', 'get-url', 'origin']).replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
const headMessage = git(['log', '-1', '--format=%B']);
const trailers = headMessage.split('\n').filter(l => /^Co-Authored-By:/i.test(l));
say(`library: ${VERSION} at ${COMMIT}${dry ? ' (dry run: nothing below changes)' : ''}`);

// ---------- 2. each repo ----------
const { repos } = JSON.parse(readFileSync(join(HERE, 'repos.json'), 'utf8'));
const only = opt('only') ? opt('only').split(',').map(s => s.trim().toLowerCase()) : null;
const results = [];
for (const r of repos.filter(r => !only || only.includes(r.name.toLowerCase()))) {
  const home = resolve(HERE, r.path);
  const tag = r.name;
  if (!existsSync(join(home, '.git'))) { results.push([tag, 'skipped: no checkout at ' + home]); continue; }
  const slug = git(['remote', 'get-url', 'origin'], home).replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
  git(['fetch', '-q', 'origin', 'main'], home);
  // What the repo's main last synced, for the PR's list of changes.
  let was = null;
  try { was = JSON.parse(git(['show', 'origin/main:.claude/workflow.lock.json'], home)); } catch { /* a first sync */ }
  if (was?.version === VERSION && String(was.commit).replace(/\+dirty$/, '') === COMMIT) { results.push([tag, `already at ${VERSION} on main`]); continue; }
  const open = JSON.parse(gh(['pr', 'list', '--repo', slug, '--state', 'open', '--json', 'number,headRefName,url', '--limit', '50']))
    .find(p => p.headRefName.startsWith('chore/claude-workflow'));
  const branch = open ? open.headRefName : `chore/claude-workflow-${VERSION}`;
  if (dry) { results.push([tag, open ? `would update ${slug}#${open.number} (${branch})` : `would open a PR from ${branch}`]); continue; }
  const dir = join(tmpdir(), 'claude-workflow-sync', tag.replace(/\W+/g, '-'));
  if (existsSync(dir)) { try { git(['worktree', 'remove', '--force', dir], home); } catch { rmSync(dir, { recursive: true, force: true }); } }
  git(['worktree', 'prune'], home);
  mkdirSync(join(tmpdir(), 'claude-workflow-sync'), { recursive: true });
  try {
    if (open) { git(['fetch', '-q', 'origin', branch], home); git(['worktree', 'add', '-q', '-B', branch, dir, `origin/${branch}`], home); }
    else git(['worktree', 'add', '-q', '-B', branch, dir, 'origin/main'], home);
  } catch (e) { results.push([tag, `skipped: could not make a worktree for ${branch} (${String(e.stderr || e.message).split('\n')[0]})`]); continue; }
  const drop = () => { try { git(['worktree', 'remove', '--force', dir], home); } catch { /* left for a look */ } };
  if (open) {
    try { git(['merge', '-q', '--no-edit', 'origin/main'], dir); }
    catch { try { git(['merge', '--abort'], dir); } catch { /* nothing to abort */ } drop(); results.push([tag, `skipped: merging main into ${branch} conflicts; resolve it by hand`]); continue; }
  }
  try { run(process.execPath, [join(HERE, 'sync.mjs'), dir]); }
  catch (e) { results.push([tag, `FAILED sync.mjs (worktree kept at ${dir}): ${String(e.stdout || e.message).split('\n').slice(-3).join(' ')}`]); continue; }
  try { run(process.execPath, ['--test', '.claude/tests/*.test.mjs'], dir); }
  catch (e) { results.push([tag, `FAILED its tests (worktree kept at ${dir}): ${String(e.stdout || '').split('\n').filter(l => /✖/.test(l)).slice(0, 5).join(' | ')}`]); continue; }
  const changed = git(['status', '--porcelain'], dir);
  const unpushed = open ? Number(git(['rev-list', '--count', `origin/${branch}..HEAD`], dir)) : 0;
  if (!changed && !unpushed) { drop(); results.push([tag, open ? `${slug}#${open.number} already carries ${VERSION}` : `nothing to change`]); continue; }
  const since = String(was?.commit || '').replace(/\+dirty$/, '');
  let log = '';
  try { log = git(['log', '--no-merges', '--format=- %s', since ? `${since}..HEAD` : '-5']); } catch { log = git(['log', '--no-merges', '--format=- %s', '-5']); }
  if (changed) {
    git(['add', '-A'], dir);
    const msg = [`Sync claude-workflow ${VERSION}`, '', `${LIB}@${COMMIT}. Library changes since this repo's main last synced:`, log, ...(trailers.length ? ['', ...trailers] : [])].join('\n');
    const file = join(tmpdir(), 'claude-workflow-sync', `${tag.replace(/\W+/g, '-')}-msg.txt`);
    writeFileSync(file, msg);
    git(['commit', '-q', '-F', file], dir);
  }
  git(['push', '-q', '-u', 'origin', branch], dir);
  const title = `Sync claude-workflow ${VERSION}: ${headMessage.split('\n')[0].replace(/^\d+\.\d+\.\d+:\s*/, '')}`.slice(0, 200);
  const body = [`Syncs claude-workflow ${VERSION} (${LIB}@${COMMIT}).`, '', `Library changes since this repo's \`main\` last synced${since ? ` (${since})` : ''}:`, log, '',
    '`node --test ".claude/tests/*.test.mjs"` passes. Made by `sync-all.mjs`; repo-owned files (config.mjs, SKILL.repo.md, settings.json) are untouched.',
    '', 'Anyone running sprints needs to pull `main` after this merges.', ...(trailers.length ? ['', '🤖 Generated with [Claude Code](https://claude.com/claude-code)'] : [])].join('\n');
  const bodyFile = join(tmpdir(), 'claude-workflow-sync', `${tag.replace(/\W+/g, '-')}-pr.md`);
  writeFileSync(bodyFile, body);
  let url;
  if (open) { gh(['pr', 'edit', String(open.number), '--repo', slug, '--title', title, '--body-file', bodyFile]); url = open.url; }
  else url = gh(['pr', 'create', '--repo', slug, '--base', 'main', '--head', branch, '--title', title, '--body-file', bodyFile]);
  drop();
  results.push([tag, `${open ? 'updated' : 'opened'} ${url}`]);
}

say('');
for (const [tag, what] of results) say(`${tag}: ${what}`);
if (results.some(([, w]) => w.startsWith('FAILED'))) process.exit(3);
