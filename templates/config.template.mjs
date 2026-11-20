// Everything the shared issue and sprint scripts need to know about THIS repo.
// The scripts, tests and hook are copied in by claude-workflow's sync.mjs and are not edited here;
// this file and the two SKILL.repo.md files are the repo's own.
//
// Keep private values out of the shared package: they live here. A PUBLIC repo's file must hold
// nothing private either (names of private repos, account details).

export const OWNER = 'TC6IDM';
export const REPO_NAME = 'CHANGE-ME';                          // the GitHub repository's name
export const REPO = `${OWNER}/${REPO_NAME}`;
export const NAME = REPO_NAME;                                 // what PR titles and the status line call it
export const PREFIX = '__P__';                                 // skill names: <prefix>-issues, <prefix>-sprint
export const PROJECT = '';                                     // the Project board's number (bootstrap.mjs fills it)
export const PROJECT_URL = `https://github.com/users/${OWNER}/projects/${PROJECT}`;
export const PUBLIC_BOARD = false;                             // true: nothing private may go in an issue, comment or PR
export const NEEDS_LIVE_TEXT = 'not yet checked on a device';  // what `finish --needs-live` tells the PR
// Commands the guard hook always denies in this repo (it already asks before commit/push and blocks force-push):
//   [{ re: String.raw`\bnpm\s+run\s+build\b`, reason: 'A 10-minute build: the owner runs it.' }]
export const GUARD_DENY = [];
// true: ask before EVERY commit and push outside a running sprint, even where a permission rule would allow it.
// false: only main, upstream and a sprint's strays ask; the owner's yes in chat plus allow rules cover the rest.
export const GUARD_ASK_ALWAYS = false;

// Milestones, in the order a sprint works them. The key is what an issues file says after
// `milestone:`; the first value is the title on GitHub.
export const MILESTONES = {
  Now: ['Now', 'What is being worked on now.'],
  Later: ['Later', 'Ideas and research parked until the owner says otherwise.'],
};
export const MILESTONE_ORDER = Object.values(MILESTONES).map(m => m[0]);

// The parts of the repo; the board's "Platform" field mirrors these (sync-board.mjs).
export const PLATFORM = {
  'platform:app': 'App',
  'platform:tooling': 'Tooling',
};

export const LABELS = {
  'type:epic': ['3e4b9e', 'A group: one parent with sub-issues (usually one per part)'],
  'type:feature': ['a2eeef', 'Something new'],
  'type:bug': ['d73a4a', 'Something is broken or wrong'],
  'type:task': ['c5def5', 'Work that is neither a feature nor a bug (setup, checks, accounts)'],
  'type:research': ['d4c5f9', 'Find out and recommend; no product change yet'],
  'type:decision': ['fbca04', 'The owner has to decide before work can start'],
  'platform:app': ['1d76db', 'The product itself'],
  'platform:tooling': ['6e7781', 'scripts/, .claude/ skills, agents and hooks, CI'],
  'P0': ['b60205', 'Broken now'],
  'P1': ['d93f0b', 'Next up'],
  'P2': ['fbca04', 'Soon'],
  'P3': ['0e8a16', 'Nice to have / later'],
  'size:S': ['bfdadc', 'About one working session'],
  'size:M': ['7fb7be', 'Two or three sessions'],
  'size:L': ['3f8f9a', 'A week or more of sessions'],
  'who:you': ['f9d0c4', 'Waits on the owner (a decision, an account, money)'],
  'who:claude': ['c2e0c6', 'Claude can do it without help'],
  'who:together': ['fef2c0', "Needs both: a real device, the owner's accounts"],
  'status:blocked': ['444444', 'Waiting on another issue or an account'],
  'status:needs-decision': ['f7c6c7', 'Cannot start until the owner decides'],
  'inbox': ['ffffff', 'The pinned Inbox issue: raw ideas waiting to be turned into issues'],
  'area:devx': ['ededed', 'Developer tools, tests, CI, Claude skills'],
  'area:docs': ['ededed', 'CLAUDE.md, README, plans'],
};

// Other repos one sprint works with this one: an issue stays on this board, its label says where the
// code goes. The sprint never touches `path` (the owner's own checkout, often mid-edit): it adds a
// worktree beside it on the sprint's branch and opens that repo's own PR.
//   { 'other-repo': { path: '../other-repo', repo: `${OWNER}/other-repo`, remote: 'origin', base: 'main', label: 'repo:other-repo' } }
export const LINKED_REPOS = {};

/** The linked repo an issue's labels send it to, or null for this repo. */
export function linkedRepoOf(labels) {
  const names = labels.map(l => (typeof l === 'string' ? l : l.name));
  return Object.keys(LINKED_REPOS).find(k => names.includes(LINKED_REPOS[k].label)) ?? null;
}

// How bootstrap.mjs makes and checks the board. The board is a copy of a template board
// (copyProjectV2 brings the views' grouping and sort, which the API can't set), then its options
// and filters are tuned to this repo.
export const BOARD = {
  title: REPO_NAME,
  template: { owner: OWNER, number: 2 },
  status: ['Todo', 'In Progress', 'In Review', 'Done'],
  options: {
    Priority: ['P0', 'P1', 'P2', 'P3'],
    Size: ['S', 'M', 'L'],
    Who: Object.keys(LABELS).filter(l => l.startsWith('who:')).map(l => l.slice(4)),
    Platform: [...Object.values(PLATFORM), 'Several', 'None'],
    Kind: ['Epic', 'Feature', 'Bug', 'Task', 'Research', 'Decision'],
  },
  views: {
    Now: `milestone:"${MILESTONE_ORDER[0]}" -kind:Epic`,
    'Needs you': 'who:you,together -kind:Epic is:open',
  },
  dropViews: [],
};

// Board fields filled from labels by sync-board.mjs.
export function boardFields(labels) {
  const platforms = labels.filter(l => PLATFORM[l]);
  const kind = labels.includes('type:epic') ? 'Epic' : labels.find(l => l.startsWith('type:'))?.slice(5);
  return {
    Priority: labels.find(l => /^P[0-3]$/.test(l)),
    Size: labels.find(l => l.startsWith('size:'))?.slice(5),
    Who: labels.find(l => l.startsWith('who:'))?.slice(4),
    Platform: platforms.length === 1 ? PLATFORM[platforms[0]] : platforms.length ? 'Several' : 'None',
    Kind: kind && kind[0].toUpperCase() + kind.slice(1),
  };
}
