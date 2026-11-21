// The sprint's verdicts and finish's refusals.
// Run: node --test .claude/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  judge, defaultLines, largeAllowed, averageCost, finishRefusal, isLarge,
  DEFAULT_SMALL_AT, DEFAULT_NEW_AT, DEFAULT_STOP_AT, FABLE_LINES, LARGE_SESSION_AT, LARGE_WEEKLY_UNDER,
} from '../skills/__P__-sprint/verdict.mjs';

const soon = new Date(Date.now() + 3600e3).toISOString();
const u = (session, weekly) => ({ session, weekly, sessionResets: soon, weeklyResets: soon });
const v = (session, weekly, lines) => judge(u(session, weekly), lines).verdict;

test('default lines: GO / SMALL / WRAP / STOP on either limit', () => {
  assert.deepEqual([DEFAULT_SMALL_AT, DEFAULT_NEW_AT, DEFAULT_STOP_AT], [80, 94, 96]);
  assert.equal(v(10, 10), 'GO');
  assert.equal(v(79, 0), 'GO');
  assert.equal(v(80, 0), 'SMALL');
  assert.equal(v(0, 93), 'SMALL', 'the weekly figure counts too');
  assert.equal(v(94, 0), 'WRAP');
  assert.equal(v(95, 50), 'WRAP');
  assert.equal(v(96, 0), 'STOP');
  assert.equal(v(10, 99), 'STOP');
});

test('a missing figure counts as 0, an error is UNKNOWN', () => {
  assert.equal(v(null, 50), 'GO');
  const j = judge({ error: 'no Claude login found on this machine' });
  assert.equal(j.verdict, 'UNKNOWN');
  assert.equal(j.used, null);
  assert.match(j.line, /^UNKNOWN: no Claude login/);
});

test('Fable gets the lower lines; other models and unknown keep the usual ones', () => {
  assert.deepEqual(FABLE_LINES, { smallAt: 70, newAt: 82, stopAt: 88 });
  const fable = defaultLines({ id: 'claude-fable-5-2', name: 'Fable 5.2' });
  assert.deepEqual([fable.smallAt, fable.newAt, fable.stopAt], [70, 82, 88]);
  assert.equal(v(71, 0, fable), 'SMALL');
  assert.equal(v(83, 0, fable), 'WRAP');
  assert.equal(v(88, 0, fable), 'STOP');
  for (const m of [{ id: 'claude-opus-5-5', name: 'Opus 5.5' }, null]) {
    const l = defaultLines(m);
    assert.deepEqual([l.smallAt, l.newAt, l.stopAt], [80, 94, 96]);
  }
});

test('named lines win, and small never sits above new', () => {
  const lines = { smallAt: 99, newAt: 12, stopAt: 15 };
  assert.equal(v(11, 0, lines), 'GO');
  assert.equal(v(12, 0, lines), 'WRAP');
  assert.equal(v(15, 0, lines), 'STOP');
  assert.equal(judge(u(0, 0), lines).smallAt, 12);
});

test('the line names the binding limit and when to resume', () => {
  const j = judge(u(20, 60));
  assert.equal(j.binding, 'weekly');
  assert.ok(j.resumeInSeconds > 3600 && j.resumeInSeconds < 3600 + 200, String(j.resumeInSeconds));
  assert.match(j.line, /5-hour 20% .* weekly 60%/);
  assert.match(judge({ ...u(20, 10), stale: 'endpoint 429' }).line, /stale: endpoint 429/);
});

test('size:L only in a keep-going sprint with a fresh window and weekly room', () => {
  assert.equal(isLarge([{ name: 'size:L' }]), true);
  assert.equal(isLarge(['size:M']), false);
  assert.equal(largeAllowed(u(5, 10), { keepGoing: false }).ok, false);
  assert.equal(largeAllowed(u(LARGE_SESSION_AT, 10), { keepGoing: true }).ok, true);
  assert.equal(largeAllowed(u(LARGE_SESSION_AT + 1, 10), { keepGoing: true }).ok, false);
  assert.equal(largeAllowed(u(LARGE_SESSION_AT + 1, 10), { keepGoing: true }, true).ok, true, '--asked skips the fresh-window rule');
  assert.equal(largeAllowed(u(5, LARGE_WEEKLY_UNDER), { keepGoing: true }, true).ok, false, 'but never the weekly one');
  assert.equal(largeAllowed({ error: 'x' }, { keepGoing: true }).ok, false);
});

test('average cost counts only measured issues', () => {
  assert.equal(averageCost({ done: [] }), null);
  assert.equal(averageCost({ done: [{ cost: 10 }, { cost: null }, { cost: 0 }, { cost: 15 }] }), 13);
  assert.equal(averageCost(null), null);
});

test('finish refuses a dirty tree, a commit that does not name #N, and no note', () => {
  assert.equal(finishRefusal({ n: 48, dirty: ' M a.mjs', subject: '', note: 'x' }).code, 2);
  assert.equal(finishRefusal({ n: 48, dirty: '', subject: 'Tests for the guard (#4)', note: 'x' }).code, 2);
  assert.equal(finishRefusal({ n: 4, dirty: '', subject: 'Tests for the guard (#48)', note: 'x' }).code, 2, '#4 is not #48');
  assert.equal(finishRefusal({ n: 48, dirty: '', subject: 'Tests for the guard (#48)', note: '' }).code, 1);
  assert.equal(finishRefusal({ n: 48, dirty: '', subject: 'Tests for the guard (#48)', note: 'x' }), null);
});

import { takenAway } from '../skills/__P__-sprint/verdict.mjs';

test('an issue taken or closed while the sprint was paused is no longer its own', () => {
  assert.equal(takenAway({ state: 'OPEN', assignees: ['me'], me: 'me' }), null);
  assert.equal(takenAway({ state: 'OPEN', assignees: [], me: 'me' }), null, 'unassigned: still free to finish');
  assert.equal(takenAway({ state: 'OPEN', assignees: ['me', 'other'], me: 'me' }), null);
  assert.equal(takenAway({ state: 'OPEN', assignees: ['other'], me: 'me', also: ['other'] }), null, 'take-from');
  assert.equal(takenAway({ state: 'OPEN', assignees: ['other'], me: 'me' }), 'assigned to other');
  assert.equal(takenAway({ state: 'CLOSED', assignees: ['me'], me: 'me' }), 'closed', 'someone else built and merged it');
});

// ---------- usage per issue (#49) ----------
import { issueUsage, usageNote, sizeAverages, expectedCost, misSized, MEASURED_AFTER, DEFAULT_ISSUE_COST } from '../skills/__P__-sprint/verdict.mjs';

test('issue usage is the rise since begin; a reset or a missing reading is null', () => {
  const start = { sessionAtStart: 48, weeklyAtStart: 53 };
  assert.deepEqual(issueUsage(start, { session: 52, weekly: 54 }), { session: 4, weekly: 1 });
  assert.deepEqual(issueUsage(start, { session: 3, weekly: 54 }), { session: null, weekly: 1 }, 'the 5-hour window reset meanwhile');
  assert.deepEqual(issueUsage(start, { error: 'x' }), { session: null, weekly: null });
  assert.deepEqual(issueUsage(null, { session: 1, weekly: 1 }), { session: null, weekly: null });
});

test('the usage note names what was measured', () => {
  assert.equal(usageNote({ session: 4, weekly: 1 }), 'used about 4% of the 5-hour window, 1% of the week');
  assert.equal(usageNote({ session: null, weekly: 0 }), 'used about 0% of the week');
  assert.equal(usageNote({ session: null, weekly: null }), null);
});

test('per-size averages from the board ignore unmeasured and unsized rows', () => {
  const rows = [{ size: 'S', usage: 4 }, { size: 'size:S', usage: 3 }, { size: 'M', usage: 9 }, { size: 'M', usage: null }, { size: null, usage: 5 }];
  assert.deepEqual(sizeAverages(rows), { S: { n: 2, avg: 3.5 }, M: { n: 1, avg: 9 } });
});

test('expected cost: the measured average from MEASURED_AFTER issues, else a scaled guess', () => {
  const few = { M: { n: MEASURED_AFTER - 1, avg: 30 } };
  assert.deepEqual(expectedCost('size:M', few), { cost: DEFAULT_ISSUE_COST * 2, measured: false, n: MEASURED_AFTER - 1 });
  assert.deepEqual(expectedCost('size:M', few, 3), { cost: 6, measured: false, n: MEASURED_AFTER - 1 }, "this sprint's average beats the default");
  assert.deepEqual(expectedCost('size:M', { M: { n: MEASURED_AFTER, avg: 30 } }), { cost: 30, measured: true, n: MEASURED_AFTER });
  assert.equal(expectedCost(undefined, {}).cost, DEFAULT_ISSUE_COST, 'unsized counts as an S');
});

test('mis-sized issues sit nearer another size average', () => {
  const rows = [
    ...[3, 4, 5].map((usage, i) => ({ n: i + 1, size: 'S', usage })),
    ...[10, 12, 14].map((usage, i) => ({ n: i + 10, size: 'M', usage })),
    { n: 20, size: 'S', usage: 13 },
    { n: 21, size: 'L', usage: 4 },
  ];
  const odd = misSized(rows, sizeAverages(rows));
  assert.deepEqual(odd.map(o => [o.n, o.looks]), [[20, 'M']], 'L has too few measured to judge');
  assert.deepEqual(misSized(rows.slice(0, 3), sizeAverages(rows.slice(0, 3))), [], 'one size alone says nothing');
});

// ---------- the checkpoint's decisions and the reset times ----------
import { resetLabel, readingLine, usageLines, decisionsComment, answersSince, DECISIONS_MARK } from '../skills/__P__-sprint/verdict.mjs';

test('reset times: the time alone on the same day, the weekday on another', () => {
  const now = new Date('2026-11-20T15:00:00Z');
  assert.equal(resetLabel('2026-11-20T20:00:00Z', now, 'UTC'), '8:00 PM');
  assert.equal(resetLabel('2026-11-22T09:00:00Z', now, 'UTC'), 'Sun 9:00 AM');
  assert.equal(resetLabel(null, now, 'UTC'), null);
  assert.equal(resetLabel('not a date', now, 'UTC'), null);
});

test('a reading says when each window resets, and leaves it out when unknown', () => {
  const now = new Date('2026-11-20T15:00:00Z');
  assert.equal(readingLine({ session: 77, sessionResets: '2026-11-20T20:00:00Z', weekly: 39, weeklyResets: '2026-11-22T09:00:00Z' }, now, 'UTC'),
    '5-hour 77% (resets 8:00 PM), weekly 39% (resets Sun 9:00 AM)');
  assert.equal(readingLine({ session: 5, weekly: null }, now, 'UTC'), '5-hour 5%, weekly ?%');
});

test('usage: the start, every checkpoint, then the latest reading unless it is the last checkpoint', () => {
  const r = (at, session, step) => ({ at, session, weekly: 10, step });
  const start = r('2026-11-20T06:00:00Z', 5, 'start');
  const one = r('2026-11-20T09:00:00Z', 95, 'checkpoint');
  const mid = r('2026-11-20T12:00:00Z', 30, 'finish');
  const two = r('2026-11-20T14:00:00Z', 96, 'checkpoint');
  const late = r('2026-11-20T15:00:00Z', 12, 'finish');
  const labels = lines => lines.slice(1).map(l => l.match(/^- ([^(]+?) \(/)?.[1] ?? l);

  assert.deepEqual(usageLines([]), []);
  assert.deepEqual(labels(usageLines([start], 0, 'UTC')), ['At the start']);
  assert.deepEqual(labels(usageLines([start, one, mid, two, late], 0, 'UTC')), ['At the start', 'Checkpoint 1', 'Checkpoint 2', 'Latest reading']);
  assert.deepEqual(labels(usageLines([start, one, mid, two], 0, 'UTC')), ['At the start', 'Checkpoint 1', 'Checkpoint 2'], 'no repeat of the last checkpoint');
  const lines = usageLines([start, one, late], 2, 'UTC');
  assert.equal(lines[0], '## Usage');
  assert.match(lines[2], /^- Checkpoint 1 \(.+\): 5-hour 95%, weekly 10%$/);
  assert.equal(lines.at(-1), '- The 5-hour window reset 2× during the sprint');
});

test('the decisions comment: options lettered, the recommended one marked, the link, nothing when none are open', () => {
  assert.equal(decisionsComment([]), null);
  assert.equal(decisionsComment([{ text: 'old', posted: true }]), null);
  const c = decisionsComment([
    { issue: 12, text: 'Which header?', options: ['Compact', 'Large'], recommend: 'A', link: 'https://example.com/mock' },
    { text: 'Merge conflict in x', recommend: 'keep main' },
  ], 'attrib');
  assert.ok(c.startsWith(DECISIONS_MARK));
  assert.match(c, /1\. \*\*#12:\*\* Which header\?/);
  assert.match(c, /A\. Compact \*\*\(recommended\)\*\*/);
  assert.doesNotMatch(c, /B\. Large \*\*/);
  assert.match(c, /Mock-ups: https:\/\/example\.com\/mock/);
  assert.match(c, /2\. Merge conflict in x\n   - Recommended: keep main/);
  assert.ok(c.endsWith('attrib'));
});

test('answers are the comments after the last decisions post, minus the ones seen', () => {
  const list = [
    { at: '2026-11-20T10:00:00Z', body: 'before' },
    { at: '2026-11-20T11:00:00Z', body: `${DECISIONS_MARK} first` },
    { at: '2026-11-20T12:00:00Z', body: 'stale answer' },
    { at: '2026-11-20T13:00:00Z', body: `${DECISIONS_MARK} second` },
    { at: '2026-11-20T14:00:00Z', body: '1 A' },
    { at: '2026-11-20T15:00:00Z', body: '2 keep main' },
  ];
  assert.deepEqual(answersSince(list).map(c => c.body), ['1 A', '2 keep main']);
  assert.deepEqual(answersSince(list, '2026-11-20T14:00:00Z').map(c => c.body), ['2 keep main']);
  assert.deepEqual(answersSince(list.slice(0, 1)), []);
});
