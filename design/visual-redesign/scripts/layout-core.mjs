// The measurements of the layout sweep, as one function that runs INSIDE the page
// (`page.evaluate(measure, options)`): it must stay self-contained, no imports or outer names.
// Merged from Ride The Bus's and PTrainr's sweeps (2026-11-19): the union of what each found.
//
// It measures; it does not judge. Every finding is a lead to reproduce and look at.
//
// Finds (kind): frame-scrolls-x/-y (a page or frame wider/taller than the screen; -y only when
// options.framed) · off-screen / off-scroller (a control or words outside the screen or their
// scroller) · clipped (a control cut by an overflow box) · controls-overlap · text-spills (words
// leaving their box) · text-on-text (words printed over other words, unless something opaque lies
// between) · type-below-floor · wrong-font (a control that missed `font: inherit`) · and, when a
// dialog is open: dialog-off-screen · nested-scroll · content-after-actions ·
// gap-under-sticky-actions · under-actions · control-apart-from-label (a radio or checkbox away
// from its words).
//
// options:
//   scopeSel      measure only inside this selector (default: the open dialog, else the body)
//   framed        true for an app that must never scroll (a game): also check the vertical axis
//   floor         { px: 12 }  or  { cssVar: '--type-floor', fallback: 6, phoneFallback: 9,
//                   phoneQuery: '(orientation: portrait) and (max-width: 620px)' }
//   font          { expect: 'atkinson', except: 'svg, .brand-name' } or null
//   dialogSel     default 'dialog[open]'
//   actionsSel    a dialog's action row, default '.modal-actions'
//   skipFixedPairs  do not report text-on-text between a fixed/sticky bar and the page
export function measure(options = {}) {
  const o = { framed: false, floor: { px: 12 }, font: null, dialogSel: 'dialog[open]', actionsSel: '.modal-actions', skipFixedPairs: false, ...options };
  const de = document.documentElement;
  const vw = de.clientWidth, vh = de.clientHeight;
  const out = [];

  const shown = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (el.closest('[inert], [hidden], details:not([open]) > :not(summary), .sr-only, .visually-hidden')) return false;
    let op = 1;
    for (let e = el; e && e !== de; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      op *= Number(cs.opacity);
    }
    return op > 0.05;
  };
  const path = el => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      const cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).filter(c => !/^svelte-/.test(c)).slice(0, 2).join('.') : '';
      parts.unshift(e.id ? '#' + e.id : e.tagName.toLowerCase() + cls);
    }
    const text = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24);
    return parts.join(' > ') + (text ? ` "${text}"` : '');
  };
  const scrollerOf = el => { for (let e = el.parentElement; e && e !== de; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return e; } return null; };
  const clipperOf = el => { for (let e = el.parentElement; e && e !== de; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return null; if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) return e; } return null; };
  const fixedish = el => { for (let e = el; e && e !== de; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  // Rendered size: computed font-size times any scale the element is drawn at.
  const drawnSize = el => { const fs = parseFloat(getComputedStyle(el).fontSize); const k = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1; return fs * (k > 0.05 ? k : 1); };
  // Words scrolled or clipped out of sight inside a box (a message list, a tab strip) are not on screen.
  const clipBoxes = el => { const boxes = []; for (let e = el.parentElement; e && e !== de; e = e.parentElement) { const cs = getComputedStyle(e); if (!/visible/.test(cs.overflowX) || !/visible/.test(cs.overflowY)) boxes.push(e.getBoundingClientRect()); } return boxes; };
  const seen = (r, boxes) => boxes.every(b => r.right > b.left + 1 && r.left < b.right - 1 && r.bottom > b.top + 1 && r.top < b.bottom - 1);
  // The words' own boxes, never the element's: a tap area, a pseudo-element or an ellipsis widens
  // scrollWidth without any word leaving its box.
  const wordRects = el => {
    const rg = document.createRange(); const rects = []; const boxes = clipBoxes(el);
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); rects.push(...[...rg.getClientRects()].filter(x => x.width > 1 && seen(x, boxes))); }
    return rects;
  };

  if (de.scrollWidth > de.clientWidth + 1) out.push(['frame-scrolls-x', `by ${de.scrollWidth - de.clientWidth}px`]);
  if (o.framed && de.scrollHeight > de.clientHeight + 1) out.push(['frame-scrolls-y', `by ${de.scrollHeight - de.clientHeight}px`]);

  const dialog = [...document.querySelectorAll(o.dialogSel)].pop() || null;
  const scope = (o.scopeSel && document.querySelector(o.scopeSel)) || dialog || document.body;

  const all = [...scope.querySelectorAll('*')].filter(e => !(e instanceof SVGElement) || e.tagName === 'svg');
  const controls = all.filter(e => /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.tagName) || e.getAttribute('role') === 'button').filter(e => shown(e) && !(e.tagName === 'INPUT' && e.type === 'hidden'));
  const texts = all.filter(e => !(e instanceof SVGElement) && ownText(e) && !e.closest('[aria-hidden="true"]')).filter(shown);

  for (const el of [...controls, ...texts]) {
    const r = el.getBoundingClientRect();
    const sc = scrollerOf(el);
    const box = sc ? sc.getBoundingClientRect() : { left: 0, top: 0, right: vw, bottom: vh };
    const offX = r.right > vw + 1 || r.left < -1, offY = o.framed && (r.bottom > vh + 1 || r.top < -1);
    if (!sc && (offX || offY)) out.push(['off-screen', `${path(el)} [${Math.round(r.left)},${Math.round(r.top)}..${Math.round(r.right)},${Math.round(r.bottom)} of ${vw}x${vh}]`]);
    if (sc && (r.left < box.left - 1 || r.right > box.right + 1) && getComputedStyle(sc).overflowX !== 'auto') out.push(['off-scroller', `${path(el)} outside ${path(sc).split(' "')[0]}`]);
  }
  for (const el of controls) {
    const c = clipperOf(el);
    if (!c) continue;
    const r = el.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const cut = Math.max(cr.left - r.left, r.right - cr.right, cr.top - r.top, r.bottom - cr.bottom);
    if (cut > 2) out.push(['clipped', `${path(el)} cut ${Math.round(cut)}px by ${path(c).split(' "')[0]}`]);
  }
  const inter = controls.filter(e => !fixedish(e) || !o.skipFixedPairs);
  for (let i = 0; i < inter.length; i++) for (let j = i + 1; j < inter.length; j++) {
    const a = inter[i], b = inter[j];
    if (a.contains(b) || b.contains(a)) continue;
    const la = a.closest('label'); if (la && la === b.closest('label')) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 4 && h > 4) out.push(['controls-overlap', `${path(a)} / ${path(b)}`]);
  }

  // ---- dialogs: sheets, action rows, nested scrolling ----
  if (dialog) {
    const dr = dialog.getBoundingClientRect();
    if (dr.bottom > vh + 1 || dr.top < -1 || dr.right > vw + 1 || dr.left < -1) out.push(['dialog-off-screen', `${path(dialog).split(' "')[0]} [${Math.round(dr.left)},${Math.round(dr.top)} ${Math.round(dr.width)}x${Math.round(dr.height)}]`]);
    const scrollers = [dialog, ...dialog.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1 && shown(e); });
    if (scrollers.length > 1) out.push(['nested-scroll', scrollers.map(e => path(e).split(' "')[0]).join(' + ')]);
    for (const actions of [...dialog.querySelectorAll(o.actionsSel)].filter(shown)) {
      const leaves = [...dialog.querySelectorAll('*')].filter(e => shown(e) && !actions.contains(e) && !e.contains(actions) && e.children.length === 0 && e.textContent.trim());
      const after = leaves.filter(e => actions.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (after.length) out.push(['content-after-actions', `${path(actions).split(' "')[0]} then ${path(after[0])}`]);
      // A sticky bar sits on its scroller's content edge: a padded scroller leaves a strip under the
      // bar where fields scroll past.
      if (getComputedStyle(actions).position === 'sticky') {
        for (const s of scrollers) s.scrollTop = 0;
        const sc = scrollers.find(e => e.contains(actions));
        if (sc) { const a2 = actions.getBoundingClientRect(), sr = sc.getBoundingClientRect(); const gap = sr.bottom - a2.bottom - parseFloat(getComputedStyle(sc).borderBottomWidth); if (sc.scrollHeight > sc.clientHeight + 1 && gap > 2) out.push(['gap-under-sticky-actions', `${path(actions).split(' "')[0]} ${Math.round(gap)}px`]); }
      }
      for (const s of scrollers) s.scrollTop = s.scrollHeight;
      const ar = actions.getBoundingClientRect();
      const under = [...dialog.querySelectorAll('input, select, textarea, button, label, p')].filter(e => shown(e) && !actions.contains(e)).filter(e => { const r = e.getBoundingClientRect(); return r.bottom > ar.top + 2 && r.top < ar.bottom - 2 && r.right > ar.left && r.left < ar.right; });
      if (under.length) out.push(['under-actions', `${path(under[0])} (+${under.length - 1})`]);
      for (const s of scrollers) s.scrollTop = 0;
    }
  }

  // ---- a radio or checkbox apart from its words ----
  for (const input of [...scope.querySelectorAll('input[type=radio], input[type=checkbox]')].filter(shown)) {
    const label = input.closest('label') || (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`));
    if (!label) continue;
    // Only the label's text: a block span spans the row and hides a radio stacked above its words.
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT); const rects = [];
    while (walker.nextNode()) { if (!walker.currentNode.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(walker.currentNode); rects.push(...[...rg.getClientRects()].filter(x => x.width > 1)); }
    if (!rects.length) continue;
    const ir = input.getBoundingClientRect();
    const first = rects.reduce((a, b) => (a.top <= b.top ? a : b));
    const gap = Math.min(...rects.map(r => Math.max(r.left - ir.right, ir.left - r.right, 0)));
    if (ir.bottom < first.top || ir.top > first.bottom || gap > 32) out.push(['control-apart-from-label', `${path(label)} (gap ${Math.round(gap)}px, box y${Math.round(ir.top)} text y${Math.round(first.top)})`]);
  }

  // ---- type: spilling, the floor, the font ----
  let floor = o.floor.px;
  if (floor == null) {
    const phone = matchMedia(o.floor.phoneQuery || '(orientation: portrait) and (max-width: 620px)').matches;
    floor = parseFloat(getComputedStyle(de).getPropertyValue(o.floor.cssVar)) || (phone ? o.floor.phoneFallback : o.floor.fallback);
  }
  const boxes = texts.map(el => ({ el, rects: wordRects(el) }));
  const under = [], foreign = new Set();
  let smallest = Infinity;
  for (const { el, rects } of boxes) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!cs.display.startsWith('inline') && /visible/.test(cs.overflowX) && r.width > 0) {
      const spill = Math.max(0, ...rects.map(t => Math.max(r.left - t.left, t.right - r.right)));
      if (spill > 2) out.push(['text-spills', `${path(el)} (${Math.round(spill)}px out)`]);
    }
    if (!el.closest('svg')) {
      const px = drawnSize(el);
      smallest = Math.min(smallest, px);
      if (px < floor - 0.05) under.push(`${path(el).split(' > ').pop()} ${px.toFixed(1)}px`);
      if (o.font && !new RegExp(o.font.expect, 'i').test(cs.fontFamily.split(',')[0]) && !(o.font.except && el.closest(o.font.except))) foreign.add(`${el.tagName.toLowerCase()} in ${cs.fontFamily.split(',')[0]}`);
    }
  }
  if (under.length) out.push(['type-below-floor', `${under.length} under ${floor}px, smallest ${smallest.toFixed(1)}px: ${under.slice(0, 3).join('; ')}`]);
  if (foreign.size) out.push(['wrong-font', [...foreign].slice(0, 4).join('; ')]);

  // ---- words printed on other words (not covered by something opaque between them) ----
  const covered = (x, y, A, B) => {
    const stack = document.elementsFromPoint(x, y);
    // Text with pointer-events: none is not in the stack; its nearest ancestor that is stands in.
    const at = el => { const i = stack.findIndex(e => e === el || el.contains(e)); return i >= 0 ? i : stack.findIndex(e => e.contains(el)); };
    const ia = at(A), ib = at(B);
    if (ia < 0 || ib < 0) return false;
    for (const e of stack.slice(Math.min(ia, ib) + 1, Math.max(ia, ib))) {
      // A layer holding the LOWER text is its own background; one holding only the upper text
      // (a scrim behind a title) still covers.
      if (e.contains(ia > ib ? A : B)) continue;
      const cs = getComputedStyle(e);
      const alpha = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      if ((alpha.length === 4 ? alpha[3] : alpha.length === 3 ? 1 : 0) >= 0.5 || cs.backgroundImage !== 'none' || cs.backdropFilter !== 'none') return true;
    }
    return false;
  };
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A = boxes[i], B = boxes[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    // A docked or sticky bar floats over content scrolling beneath it by design.
    if (o.skipFixedPairs && fixedish(A.el) !== fixedish(B.el)) continue;
    pair: for (const ra of A.rects) for (const rb of B.rects) {
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w <= 3 || h <= 3) continue;
      const x = Math.max(ra.left, rb.left) + w / 2, y = Math.max(ra.top, rb.top) + h / 2;
      if (!covered(x, y, A.el, B.el)) out.push(['text-on-text', `${path(A.el)} / ${path(B.el)}`]);
      break pair;
    }
  }
  return out;
}
