// Exact, all-or-nothing text replacement that keeps a file's line endings.
// Many files are CRLF, which breaks naive string edits and shell heredocs.
//
// usage: node replace.cjs <file> <spec.json>
// spec:  [[old, new], [old, new, "all"], ...]
//   Each `old` must occur exactly once (matched with line endings as LF), or
//   with a third element "all", any number of times. One miss aborts the lot.
//
// Write the spec with the Write tool, not a shell heredoc: apostrophes and
// backslashes survive that way. A regex with escaped slashes (/^\/api\//) is
// easier to insert with a small node script that reads a plain text file.
const fs = require('fs');
const [file, specFile] = process.argv.slice(2);
if (!file || !specFile) { console.error('usage: node replace.cjs <file> <spec.json>'); process.exit(2); }
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let text = raw.replace(/\r\n/g, '\n');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
spec.forEach(([a, b, all], i) => {
  const n = text.split(a).length - 1;
  if (all === 'all' && n > 0) { text = text.split(a).join(b); return; }
  if (n !== 1) { console.error(`edit ${i}: found ${n} times: ${a.slice(0, 80)}`); process.exit(1); }
  text = text.replace(a, () => b);
});
fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
console.log(`${file}: ${spec.length} edits`);
