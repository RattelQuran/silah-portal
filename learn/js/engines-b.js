'use strict';
/* DOM engines: E5 drag (sort / build / sentence), E6 memory, E8 listen, E9 lesson, E10 exercise (+trace), E11 story. */

const bareLetters = w => [...String(w).replace(/[ً-ْٰ]/g, '')].filter(c => c !== 'ـ' && c !== ' ');

/* generic pointer drag: works for mouse and touch; onDrop returns true to accept */
function dragify(el, arena, { onStart, onDrop, onTap }) {
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, id = null, home = null;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { if (el.dataset.locked) return; if (el._back) el._back(); id = e.pointerId; el.setPointerCapture(id); moved = false; sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect(), a = arena.getBoundingClientRect(); ox = r.left - a.left; oy = r.top - a.top; onStart && onStart(); });
  el.addEventListener('pointermove', e => { if (id !== e.pointerId) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved) { moved = true; home = getComputedStyle(el).position === 'absolute' ? null : { parent: el.parentNode, next: el.nextSibling }; el.classList.remove('no'); el.classList.add('dragging'); el.style.position = 'absolute'; el.style.left = ox + 'px'; el.style.top = oy + 'px'; el.style.zIndex = 5; if (el.parentNode !== arena) { arena.appendChild(el); try { el.setPointerCapture(id); } catch (x) { } } }
    el.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`; });
  el.addEventListener('pointerup', e => { if (id !== e.pointerId) return; id = null; el.classList.remove('dragging');
    if (!moved) { onTap && onTap(); return; }
    const r = el.getBoundingClientRect(); const ok = onDrop(r.left + r.width / 2, r.top + r.height / 2);
    if (!ok) { el.style.transition = 'transform .25s'; el.style.transform = ''; const h = home; el._back = () => { clearTimeout(el._bt); el._back = null; el.style.transition = '';
      // a tile that lived in a flex row goes back to its place (floaters stay absolute and keep drifting)
      if (h && el.isConnected) { el.style.position = el.style.left = el.style.top = el.style.zIndex = ''; h.parent.insertBefore(el, h.next && h.next.parentNode === h.parent ? h.next : null); } }; el._bt = setTimeout(el._back, 260); } });
}
const inside = (x, y, el) => { const r = el.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; };

/* ============ E5 drag ============ */
ENGINES.drag = { name: 'سحب وإفلات وبناء', controls: 'اسحب بإصبعك أو بالفأرة، أو المس القطعة', total: l => l.mode === 'sort' ? l.bins.reduce((a, b) => a + b.accept.length, 0) : (l.words || l.sentences).length, fn(root, cfg, api) {
  if (cfg.mode === 'sort') return dragSort(root, cfg, api);
  return dragBuild(root, cfg, api);
} };
function dragSort(root, cfg, api) {
  const items = shuffle(cfg.bins.flatMap((b, bi) => b.accept.map(ch => ({ ch, bi }))));
  root.innerHTML = `<div class="sortarena" id="arena"><div class="sky-deco"></div><div class="bins">${cfg.bins.map((b, i) => `<div class="bin" data-b="${i}"><span class="bin-l">${esc(b.label)}</span><span class="bin-n" id="bn${i}"></span></div>`).join('')}</div></div>`;
  const arena = $('arena'); let placed = 0, wrong = 0, queue = [...items], live = [], raf;
  function spawn() { if (!queue.length || live.length >= 3) return; const it = queue.shift(); const el = document.createElement('div'); el.className = 'floater'; el.innerHTML = `<span>${esc(it.ch)}</span>`; arena.appendChild(el);
    const o = { it, el, x: arena.clientWidth + 40, y: 30 + live.length * 8 + Math.random() * 60, ph: Math.random() * 6, drag: false }; live.push(o);
    dragify(el, arena, { onStart: () => { o.drag = true; }, onDrop: (x, y) => { o.drag = false; const bin = [...arena.querySelectorAll('.bin')].find(b => inside(x, y, b)); if (!bin) { return false; }
      if (+bin.dataset.b === it.bi) { placed++; api.progress(placed); SFX.good(); el.dataset.locked = 1; el.classList.add('done'); bin.classList.add('glow'); setTimeout(() => bin.classList.remove('glow'), 400);
        const n = $('bn' + it.bi); n.textContent = (n.textContent || '') + ' ' + it.ch; setTimeout(() => el.remove(), 250); live = live.filter(q => q !== o);
        if (placed === items.length) setTimeout(() => api.finish({ correct: placed, wrong }), 500); return true; }
      wrong++; SFX.bad(); bin.classList.add('shake'); setTimeout(() => bin.classList.remove('shake'), 400); o.x = Math.min(o.x, arena.clientWidth - 70); return false; } }); }
  let t = 0, last = performance.now(), sp = .9 + (cfg.level || 1) * .25;
  const tick = now => { const dt = Math.min(.033, (now - last) / 1000); last = now; t += dt;
    if (Math.random() < dt * 1.2) spawn();
    for (const o of live) { if (o.drag || o.el.dataset.locked) continue; o.x -= 38 * sp * dt; if (o.x < -80) o.x = arena.clientWidth + 40; o.el.style.position = 'absolute'; o.el.style.left = o.x + 'px'; o.el.style.top = (o.y + Math.sin(t * 2 + o.ph) * 8) + 'px'; o.el.style.transform = ''; }
    raf = requestAnimationFrame(tick); };
  spawn(); raf = requestAnimationFrame(tick);
  window.__eng = { floaters: () => live.filter(o => !o.el.dataset.locked).map(o => { const r = o.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, bin: o.it.bi }; }), bins: () => [...arena.querySelectorAll('.bin')].map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }) };
  return () => cancelAnimationFrame(raf);
}
function dragBuild(root, cfg, api) {
  const isS = cfg.mode === 'sentence', list = isS ? cfg.sentences : cfg.words; let i = 0, ok = 0, wrong = 0, miss = false;
  function show() {
    const target = list[i], parts = isS ? target.split(/\s+/) : bareLetters(target);
    const extra = !isS && (cfg.level || 1) >= 2 ? shuffle(AR.filter(c => !parts.includes(c))).slice(0, 2) : [];
    const tiles = shuffle([...parts.map((p, k) => ({ p, k })), ...extra.map(p => ({ p, k: -1 }))]); miss = false;
    root.innerHTML = `<div class="buildarena" id="arena"><div class="build-q"><button class="iconbtn" id="sayW" aria-label="اسمع">${ICONS.speaker}</button>${(cfg.level || 1) === 1 || isS ? `<span class="ghost">${esc(target)}</span>` : '<span class="muted">اسمع الكلمة وركّبها</span>'}</div>
      <div class="slots ${isS ? 'words' : ''}" id="slots">${parts.map((p, k) => `<div class="slot" data-k="${k}"></div>`).join('')}</div>
      <div class="tiles ${isS ? 'words' : ''}" id="tiles">${tiles.map((t, j) => `<button class="tile" data-j="${j}">${esc(t.p)}</button>`).join('')}</div><div class="joined" id="joined"></div></div>`;
    const arena = $('arena'); $('sayW').onclick = () => say(target); setTimeout(() => say(target), 250);
    const filled = new Array(parts.length).fill(false);
    const place = (el, t, k) => { const slot = arena.querySelector(`.slot[data-k="${k}"]`); if (filled[k] || parts[k] !== t.p) return false;
      filled[k] = true; slot.textContent = t.p; slot.classList.add('in'); el.remove(); SFX.good();
      if (filled.every(Boolean)) { ok += 1; if (miss) wrong++; api.progress(i + 1); $('joined').innerHTML = `<b>${esc(target)}</b>`; say(target); SFX.win();
        setTimeout(() => { i++; i >= list.length ? api.finish({ correct: ok, wrong }) : show(); }, 1300); }
      return true; };
    const no = el => { miss = true; SFX.bad(); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); };
    arena.querySelectorAll('.tile').forEach(el => { const t = tiles[+el.dataset.j];
      dragify(el, arena, { onTap: () => { const k = filled.findIndex(f => !f); if (!place(el, t, k)) no(el); },
        onDrop: (x, y) => { const s = [...arena.querySelectorAll('.slot')].find(s => inside(x, y, s)); if (s && place(el, t, +s.dataset.k)) return true; no(el); return false; } }); });
  }
  show();
  window.__eng = { next: () => { const filledK = [...root.querySelectorAll('.slot')].findIndex(s => !s.classList.contains('in')); return filledK; } };
  return () => hush();
}

/* ============ E6 memory ============ */
ENGINES.memory = { name: 'ذاكرة وبطاقات', controls: 'المس بطاقتين لقلبهما', total: l => l.pairs.length, fn(root, cfg, api) {
  const cards = shuffle(cfg.pairs.flatMap((p, i) => [{ k: i, v: p[0] }, { k: i, v: p[1] }]));
  const cols = cards.length > 12 ? 4 : cards.length > 8 ? 4 : 3;
  root.innerHTML = `<div class="memgrid" style="grid-template-columns:repeat(${cols},1fr)">${cards.map((c, i) => `<button class="mcard" data-i="${i}" aria-label="بطاقة ${i + 1}"><span class="in"><span class="b"></span><span class="f ${c.v.length < 3 ? 'big' : ''}">${esc(c.v)}</span></span></button>`).join('')}</div>`;
  let open = [], got = 0, miss = 0, lock = false;
  root.querySelectorAll('.mcard').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (lock || b.classList.contains('flip') || b.classList.contains('got')) return; SFX.flip(); b.classList.add('flip'); open.push(i);
    if (open.length === 2) { lock = true; const [a, c] = open, A = root.querySelector(`[data-i="${a}"]`), C = root.querySelector(`[data-i="${c}"]`);
      if (cards[a].k === cards[c].k) setTimeout(() => { A.classList.add('got'); C.classList.add('got'); got++; api.progress(got); SFX.good(); if (cards[c].v.length > 1) say(cards[c].v.length > 1 ? cards[c].v : cards[a].v); open = []; lock = false;
        if (got === cfg.pairs.length) setTimeout(() => api.finish({ correct: got, wrong: Math.max(0, miss - cfg.pairs.length) }), 600); }, 380);
      else { miss++; setTimeout(() => { A.classList.remove('flip'); C.classList.remove('flip'); open = []; lock = false; }, 850); } } });
  window.__eng = { cards: () => cards.map(c => c.k) };
  return () => hush();
} };

/* ============ E8 listen (word, letter, riddle, flash) ============ */
ENGINES.listen = { name: 'استماع واختيار', controls: 'اسمع ثم المس الإجابة', total: l => l.items.length, fn(root, cfg, api) {
  const items = shuffle(cfg.items); let i = 0, correct = 0, wrong = 0, mistakes = 0;
  function faces() { return `<div class="faces" aria-label="الأخطاء">${Array.from({ length: 5 }, (_, k) => `<i class="${k < mistakes ? 'sad' : ''}"></i>`).join('')}</div>`; }
  function show() { const it = items[i]; let miss = false; const flash = cfg.mode === 'flash';
    root.innerHTML = `<div class="listen ${cfg.mode || 'word'}"><div class="speaker">${flash ? `<div class="flashcard" id="fc">${esc(it.answer)}</div>` : `<button class="bigspeak" id="play" aria-label="اسمع">${ICONS.speaker}</button>`}
      <button class="linkbtn" id="tx">${flash ? 'انظر مرة أخرى' : 'اعرض النص'}</button><p class="transcript" id="tr" hidden>${esc(it.say)}</p></div>
      <div class="choices ${cfg.mode === 'riddle' ? 'long' : ''}" id="ch" ${flash ? 'hidden' : ''}>${shuffle(it.options).map(o => `<button class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>${faces()}</div>`;
    if (flash) { const show = () => { $('fc').classList.remove('gone'); $('ch').hidden = true; setTimeout(() => { if ($('fc')) { $('fc').classList.add('gone'); $('ch').hidden = false; } }, [0, 1600, 1200, 800][cfg.level || 1]); };
      show(); $('tx').onclick = () => { miss = true; show(); }; }
    else { const p = () => { if (!say(it.say)) $('tr').hidden = false; }; $('play').onclick = p; setTimeout(p, 300); $('tx').onclick = () => { $('tr').hidden = !$('tr').hidden; }; }
    root.querySelectorAll('.choice').forEach(b => b.onclick = () => { if (b.dataset.o === it.answer) { b.classList.add('right'); SFX.good(); miss ? wrong++ : correct++; api.progress(i + 1); i++;
        root.querySelectorAll('.choice').forEach(x => x.disabled = true); setTimeout(() => i >= items.length ? api.finish({ correct, wrong }) : show(), 700); }
      else { miss = true; mistakes = Math.min(5, mistakes + 1); b.classList.add('wrong'); SFX.bad(); setTimeout(() => b.classList.remove('wrong'), 450); const f = root.querySelector('.faces'); if (f) f.outerHTML = faces(); } }); }
  show();
  window.__eng = { answer: () => items[i] && items[i].answer };
  return () => hush();
} };

/* ============ E9 lesson: present a letter step by step ============ */
ENGINES.lesson = { name: 'عرض الدرس', controls: 'المس لتسمع، ثم «التالي»', total: () => 6, fn(root, cfg, api) {
  const l = cfg.letter, n = NAMES[l], f = forms(l), words = cfg.words || WORDS[l] || []; let step = 0, wrong = 0;
  const steps = [
    () => `<div class="lstep"><div class="biglet" data-say="حَرْفُ ${n}">${l}</div><p class="big-ar">هَذَا حَرْفُ ${n}</p><p class="muted">المس الحرف لتسمعه</p></div>`,
    () => `<div class="lstep"><p class="big-ar">لِحَرْفِ ${n} أَشْكَالٌ</p><div class="forms4">${[['iso', 'وحده'], ['ini', 'في أول الكلمة'], ['med', 'في وسطها'], ['fin', 'في آخرها']].map(([k, t]) => `<button class="formcard" data-say="${t}">${f[k]}<small>${t}</small></button>`).join('')}</div></div>`,
    () => `<div class="lstep"><p class="big-ar">الحَرَكَاتُ مَعَ حَرْفِ ${n}</p><div class="harakat">${HARAKAT.slice(0, 3).map(([h, t]) => `<button class="hcard" data-say="${l}${h}"><b>${l}${h}</b><small>${t}</small></button>`).join('')}</div></div>`,
    () => `<div class="lstep"><p class="big-ar">كَلِمَاتٌ تَبْدَأُ بِحَرْفِ ${n}</p><div class="wordcards">${words.map(w => `<button class="wcard" data-say="${w}"><b>${w}</b></button>`).join('')}</div></div>`,
    () => `<div class="lstep"><p class="big-ar">اكْتُبِ الحَرْفَ بِإِصْبَعِكَ</p><div id="tracer"></div></div>`,
    () => { const ok = pickOne(words), o = shuffle([ok, ...shuffle(wordsNotStarting(l)).slice(0, 2)]); return `<div class="lstep"><p class="big-ar">أَيُّ كَلِمَةٍ تَبْدَأُ بِحَرْفِ ${n}؟</p><div class="choices">${o.map(w => `<button class="choice" data-ok="${w === ok}">${w}</button>`).join('')}</div></div>`; },
  ];
  function show() {
    root.innerHTML = `<div class="lessonwrap">${steps[step]()}<div class="lnav"><button class="gbtn ghost" id="prev" ${step ? '' : 'disabled'}>السابق</button><span class="muted">${num(step + 1)} / ${num(steps.length)}</span><button class="gbtn navy" id="next" ${step >= 4 ? 'disabled' : ''}>التالي</button></div></div>`;
    root.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { SFX.tap(); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 600); say(b.dataset.say); });
    $('prev').onclick = () => { step--; show(); }; $('next').onclick = () => { step++; api.progress(step); show(); };
    if (step === 4) tracer($('tracer'), l, ok => { if (ok) { $('next').disabled = false; SFX.good(); } else wrong++; });
    if (step === 5) root.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { if (b.dataset.ok === 'true') { b.classList.add('right'); SFX.good(); api.progress(6); setTimeout(() => api.finish({ correct: 5, wrong }), 600); } else { wrong++; b.classList.add('wrong'); SFX.bad(); setTimeout(() => b.classList.remove('wrong'), 400); } });
  }
  show(); setTimeout(() => say(`حَرْفُ ${n}`), 300);
  window.__eng = { step: () => step };
  return () => hush();
} };

/* letter tracer: score by covered letter pixels vs. ink outside */
function tracer(host, letter, done) {
  const size = Math.min(300, host.clientWidth || 300);
  host.innerHTML = `<div class="tracer"><canvas width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px"></canvas><div class="row center"><button class="gbtn ghost sm" data-clear>امسح</button><button class="gbtn red sm" data-check>تحقّق</button></div><p class="muted trmsg" aria-live="polite"></p></div>`;
  const cv = host.querySelector('canvas'), ctx = cv.getContext('2d'), S2 = size * 2;
  const mask = document.createElement('canvas'); mask.width = mask.height = S2; const m = mask.getContext('2d');
  m.fillStyle = '#000'; m.font = AR_FONT(S2 * .62); m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(letter, S2 / 2, S2 * .52);
  const md = m.getImageData(0, 0, S2, S2).data;
  const ink = document.createElement('canvas'); ink.width = ink.height = S2; const ic = ink.getContext('2d');
  function paint() { ctx.clearRect(0, 0, S2, S2); ctx.fillStyle = '#FBF7F0'; ctx.fillRect(0, 0, S2, S2); ctx.globalAlpha = .22; ctx.drawImage(mask, 0, 0); ctx.globalAlpha = 1;
    ctx.setLineDash([10, 12]); ctx.strokeStyle = 'rgba(12,36,112,.35)'; ctx.lineWidth = 3; ctx.font = AR_FONT(S2 * .62); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(letter, S2 / 2, S2 * .52); ctx.setLineDash([]); ctx.drawImage(ink, 0, 0); }
  paint(); let drawing = false, lx = 0, ly = 0;
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); [lx, ly] = pt(e); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pt(e); ic.strokeStyle = '#C8174D'; ic.lineWidth = S2 * .07; ic.lineCap = 'round'; ic.beginPath(); ic.moveTo(lx, ly); ic.lineTo(x, y); ic.stroke(); lx = x; ly = y; paint(); });
  cv.addEventListener('pointerup', () => drawing = false);
  host.querySelector('[data-clear]').onclick = () => { ic.clearRect(0, 0, S2, S2); paint(); };
  host.querySelector('[data-check]').onclick = () => { const id = ic.getImageData(0, 0, S2, S2).data; let L = 0, C = 0, I = 0, O = 0;
    for (let y = 0; y < S2; y += 4) for (let x = 0; x < S2; x += 4) { const k = (y * S2 + x) * 4 + 3, inL = md[k] > 40, inI = id[k] > 40; if (inL) { L++; if (inI) C++; } if (inI) { I++; if (!near(x, y)) O++; } }
    function near(x, y) { for (let dy = -24; dy <= 24; dy += 12) for (let dx = -24; dx <= 24; dx += 12) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < S2 && yy < S2 && md[(yy * S2 + xx) * 4 + 3] > 40) return true; } return false; }
    const cov = L ? C / L : 0, out = I ? O / I : 1, ok = cov >= .5 && out <= .35;
    host.querySelector('.trmsg').textContent = ok ? 'أَحْسَنْتَ! كَتَبْتَ الحَرْفَ.' : cov < .5 ? 'تابِعْ عَلَى شَكْلِ الحَرْفِ كُلِّهِ.' : 'حاوِلْ أَنْ تَبْقَى دَاخِلَ الحَرْفِ.';
    window.__trace = { cov, out }; done(ok); };
  window.__tracerMask = () => { const pts = []; const r = cv.getBoundingClientRect(); for (let y = 0; y < S2; y += 10) for (let x = 0; x < S2; x += 10) if (md[(y * S2 + x) * 4 + 3] > 40) pts.push([r.left + x / 2, r.top + y / 2]); return pts; };
}

/* ============ E10 exercise runner: mcq, tf, cat, trace; optional passage ============ */
ENGINES.exercise = { name: 'تمارين تفاعلية', controls: 'المس الإجابة، أو اسحب الكلمة إلى عمودها', total: l => l.items.reduce((a, it) => a + (it.type === 'cat' ? it.words.length : 1), 0), fn(root, cfg, api) {
  return runItems(root, cfg.items, api, cfg.passage, (c, w) => api.finish({ correct: c, wrong: w }));
} };
function runItems(root, items, api, passage, onDone, offset = 0) {
  let i = 0, correct = 0, wrong = 0, prog = offset;
  const tick = () => { prog++; api.progress(prog); };
  function show() {
    const it = items[i]; let miss = false;
    const head = passage ? `<details class="passage" ${i === 0 ? 'open' : ''}><summary>النص <button class="iconbtn sm" data-say="${esc(passage)}" aria-label="اسمع النص">${ICONS.speaker}</button></summary><p class="big-ar">${esc(passage)}</p></details>` : '';
    const next = ok => { ok && !miss ? correct++ : wrong++; tick(); i++; setTimeout(() => i >= items.length ? onDone(correct, wrong) : show(), 650); };
    if (it.type === 'mcq' || it.type === 'tf') {
      const opts = it.type === 'tf' ? ['صَحِيح', 'خَطَأ'] : it.options;
      const ans = it.type === 'tf' ? (it.answer ? 'صَحِيح' : 'خَطَأ') : it.answer;
      root.innerHTML = `<div class="ex">${head}<div class="exq"><p class="big-ar">${esc(it.q)}</p>${it.say ? `<button class="iconbtn" data-say="${esc(it.say)}" aria-label="اسمع">${ICONS.speaker}</button>` : ''}</div>
        <div class="choices ${it.type === 'tf' ? 'tf' : ''} ${opts.some(o => o.length > 8) ? 'long' : ''}">${opts.map(o => `<button class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
      bindNav(); if (it.say) setTimeout(() => say(it.say), 250);
      root.querySelectorAll('.choice').forEach(b => b.onclick = () => { if (b.dataset.o === ans) { b.classList.add('right'); SFX.good(); root.querySelectorAll('.choice').forEach(x => x.disabled = true); next(true); } else { miss = true; b.classList.add('wrong'); SFX.bad(); setTimeout(() => b.classList.remove('wrong'), 450); } });
      window.__eng = { answer: () => ans };
    } else if (it.type === 'cat') {
      const ws = shuffle(it.words); let left = ws.length, sel = null;
      root.innerHTML = `<div class="ex">${head}<p class="big-ar">صَنِّفِ الكَلِمَاتِ</p><div class="catcols" id="cols">${it.cats.map((c, k) => `<div class="catcol" data-c="${k}"><h3>${esc(c)}</h3><div class="catin"></div></div>`).join('')}</div><div class="chips" id="chips">${ws.map(([w, c], j) => `<button class="chip" data-j="${j}">${esc(w)}</button>`).join('')}</div></div>`;
      bindNav(); const arena = root.querySelector('.ex');
      const put = (el, k) => { const [w, c] = ws[+el.dataset.j]; if (c !== k) { wrong++; SFX.bad(); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); return false; }
        SFX.good(); correct++; tick(); el.remove(); const s = document.createElement('span'); s.className = 'chip in'; s.textContent = w; root.querySelector(`.catcol[data-c="${k}"] .catin`).appendChild(s); sel = null;
        if (--left === 0) { i++; setTimeout(() => i >= items.length ? onDone(correct, wrong) : show(), 600); } return true; };
      root.querySelectorAll('.chip').forEach(el => dragify(el, arena, { onTap: () => { root.querySelectorAll('.chip.sel').forEach(x => x.classList.remove('sel')); sel = el; el.classList.add('sel'); },
        onDrop: (x, y) => { const col = [...root.querySelectorAll('.catcol')].find(c => inside(x, y, c)); return col ? put(el, +col.dataset.c) : false; } }));
      root.querySelectorAll('.catcol').forEach(c => c.onclick = () => { if (sel) put(sel, +c.dataset.c); });
      window.__eng = { cat: () => ws.map(([w, c]) => c) };
    } else if (it.type === 'trace') {
      root.innerHTML = `<div class="ex">${head}<p class="big-ar">اكْتُبْ حَرْفَ ${NAMES[it.letter] || it.letter}</p><div id="tracer"></div><div class="row center"><button class="gbtn ghost sm" id="skip">تخطَّ</button></div></div>`;
      let tries = 0; tracer($('tracer'), it.letter, ok => { tries++; if (ok) { tries > 1 ? (miss = true) : 0; next(true); } else if (tries >= 3) miss = true; });
      $('skip').onclick = () => { miss = true; next(false); };
    }
  }
  show();
  return () => hush();
}

/* ============ E11 story: illustrated pages, narration with word highlight, hidden crescent, then questions ============ */
ENGINES.story = { name: 'قصص مصورة ومسموعة', controls: 'اسحب الصفحة أو استخدم الأسهم، والمس «اسمع»', total: l => l.pages.length + l.questions.length, fn(root, cfg, api) {
  let p = 0, found = new Set(), raf; const pages = cfg.pages;
  const hid = pages.map(() => ({ x: rnd(.12, .88), y: rnd(.15, .8) }));
  function show(dir = 0) {
    cancelAnimationFrame(raf); hush();
    const pg = pages[p], words = pg.text.split(/\s+/);
    root.innerHTML = `<div class="book"><div class="page ${dir ? (dir > 0 ? 'turn-next' : 'turn-prev') : ''}" id="page"><canvas id="scene"></canvas><p class="storytext" id="stx">${words.map((w, k) => `<span data-k="${k}">${esc(w)}</span>`).join(' ')}</p></div>
      <div class="booknav"><button class="gbtn ghost sm" id="bprev" ${p ? '' : 'disabled'} aria-label="الصفحة السابقة">›</button><button class="gbtn red sm" id="read">${ICONS.speaker} اسمع</button><span class="muted">صفحة ${num(p + 1)} من ${num(pages.length)} · الهلال المختبئ: ${num(found.size)}</span><button class="gbtn navy sm" id="bnext" aria-label="الصفحة التالية">${p === pages.length - 1 ? 'الأسئلة' : '‹'}</button></div></div>`;
    const cv = $('scene'), ctx = cv.getContext('2d'), W = cv.parentElement.clientWidth, H = Math.round(Math.min(W * .56, 340)); const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = '100%'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fx = fxLayer(); let last = performance.now(), t = 0;
    const loop = now => { const dt = Math.min(.033, (now - last) / 1000); last = now; t += dt; drawScene(ctx, W, H, pg.scene, t); const h = hid[p]; if (!found.has(p)) { ctx.globalAlpha = .9; ctx.fillStyle = '#C9A24B'; ctx.beginPath(); ctx.arc(h.x * W, h.y * H, 9, 0, 7); ctx.fill(); ctx.fillStyle = sceneBg(pg.scene); ctx.beginPath(); ctx.arc(h.x * W + 4, h.y * H - 3, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } fx.draw(ctx, dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = hid[p]; if (!found.has(p) && Math.hypot(x - h.x * W, y - h.y * H) < 26) { found.add(p); SFX.open(); fx.burst(x, y); fx.text(x, y - 20, 'وَجَدْتَهُ!'); show(); } });
    let sx = null; const pgEl = $('page'); pgEl.addEventListener('pointerdown', e => sx = e.clientX); pgEl.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 60) (e.clientX > sx ? go(1) : go(-1)); sx = null; });
    $('bprev').onclick = () => go(-1); $('bnext').onclick = () => go(1);
    $('read').onclick = () => read(words);
    api.progress(p + 1);
  }
  function read(words) { const spans = [...document.querySelectorAll('#stx span')]; let k = 0, timer;
    const lit = j => spans.forEach((s, q) => s.classList.toggle('lit', q === j));
    const ok = say(pages[p].text, ev => { if (ev.name && ev.name !== 'word') return; const idx = pages[p].text.slice(0, ev.charIndex).split(/\s+/).length - 1; lit(Math.max(0, idx)); }, () => { lit(-1); clearInterval(timer); });
    if (!ok) { timer = setInterval(() => { lit(k++); if (k > spans.length) { clearInterval(timer); lit(-1); } }, 650); } }
  function go(d) { if (d > 0 && p === pages.length - 1) return questions(); p = Math.max(0, Math.min(pages.length - 1, p + d)); SFX.flip(); show(d); }
  const kd = e => { if (e.key === 'ArrowLeft') go(1); if (e.key === 'ArrowRight') go(-1); }; addEventListener('keydown', kd);
  function questions() { cancelAnimationFrame(raf); removeEventListener('keydown', kd); if (!cfg.questions || !cfg.questions.length) return api.finish({ correct: pages.length, wrong: 0, bonus: found.size }); runItems(root, cfg.questions, api, null, (c, w) => api.finish({ correct: c, wrong: w, bonus: found.size }), pages.length); }
  show();
  window.__eng = { page: () => p, hidden: () => hid[p], go };
  return () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); hush(); };
} };
function sceneBg(s) { return ['lost', 'home', 'path', 'room', 'thanks'].includes(s) ? '#132B78' : '#BFE0F5'; }
function drawRabbit(ctx, x, y, s, mood) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#F4EEE6';
  ctx.beginPath(); ctx.ellipse(-8, -46, 6, 18, -.15, 0, 7); ctx.ellipse(8, -46, 6, 18, .15, 0, 7); ctx.fill(); ctx.fillStyle = '#F3C6CF'; ctx.beginPath(); ctx.ellipse(-8, -46, 3, 12, -.15, 0, 7); ctx.ellipse(8, -46, 3, 12, .15, 0, 7); ctx.fill();
  ctx.fillStyle = '#F4EEE6'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 22, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -22, 16, 0, 7); ctx.fill();
  ctx.fillStyle = '#0C2470'; ctx.beginPath(); ctx.arc(-6, -24, 2.6, 0, 7); ctx.arc(6, -24, 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#0C2470'; ctx.lineWidth = 2; ctx.beginPath(); mood === 'sad' ? ctx.arc(0, -12, 4, Math.PI + .4, -.4) : ctx.arc(0, -17, 4, .3, Math.PI - .3); ctx.stroke();
  ctx.restore();
}
function drawScene(ctx, W, H, s, t) {
  const night = ['lost', 'home', 'path', 'room', 'thanks'].includes(s);
  const g = ctx.createLinearGradient(0, 0, 0, H); if (night) { g.addColorStop(0, '#0C2470'); g.addColorStop(1, '#2A4FB8'); } else { g.addColorStop(0, '#BFE0F5'); g.addColorStop(1, '#FBEBD0'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const k = H / 300;
  if (night) { for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(243,227,184,${.4 + .4 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc((i * 97 % W), (i * 53 % (H * .5)), 1.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#F3E3B8'; ctx.beginPath(); ctx.arc(W * .85, H * .18, 20 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#0E2160'; ctx.beginPath(); ctx.arc(W * .85 + 8 * k, H * .18 - 5 * k, 18 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#1C3A8E'; ctx.beginPath(); ctx.moveTo(0, H * .7); ctx.quadraticCurveTo(W * .5, H * .58, W, H * .72); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill(); }
  else { cloud(ctx, W * .1 + Math.sin(t * .3) * 10, H * .15, k); cloud(ctx, W * .6, H * .1, k * .8); ctx.fillStyle = '#EBCB98'; ctx.beginPath(); ctx.moveTo(0, H * .72); ctx.quadraticCurveTo(W * .5, H * .6, W, H * .74); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill(); }
  const ground = H * .78;
  if (s === 'room') { ctx.fillStyle = '#E8CFA0'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#0C2470'; arch(ctx, W * .62, H * .15, W * .2, H * .5); ctx.fill(); ctx.fillStyle = '#F3E3B8'; ctx.beginPath(); ctx.arc(W * .72 + 6, H * .3, 10 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#C8174D'; ctx.fillRect(0, ground, W, H); drawNour(ctx, W * .35, ground - 30 * k, 1.6 * k, { mood: 'happy', glow: true }); }
  if (s === 'path') { ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 10 * k; ctx.beginPath(); ctx.moveTo(0, H * .92); ctx.quadraticCurveTo(W * .5, H * .7, W, H * .8); ctx.stroke(); drawNour(ctx, W * .5, ground - 34 * k, 1.3 * k, { mood: 'cheer', glow: true, walk: true }); drawHoopoe(ctx, W * .78, ground - 20 * k, .9 * k); drawRabbit(ctx, W * .22, ground - 6 * k, 1 * k); }
  if (s === 'lost') { for (let i = 0; i < 5; i++) palm(ctx, W * (.1 + i * .2), ground + 10 * k, 1.1 * k, Math.sin(t + i) * 2, '#123A5C'); drawRabbit(ctx, W * .5, ground - 6 * k, 1.2 * k, 'sad'); }
  if (s === 'home') { ctx.fillStyle = '#E8CFA0'; ctx.fillRect(W * .62, H * .42, W * .26, H * .38); ctx.fillStyle = '#0C2470'; arch(ctx, W * .7, H * .55, W * .1, H * .25); ctx.fill(); drawNour(ctx, W * .3, ground - 34 * k, 1.3 * k, { mood: 'happy', glow: true }); drawRabbit(ctx, W * .52, ground - 6 * k, 1.1 * k); }
  if (s === 'thanks') { drawNour(ctx, W * .38, ground - 34 * k, 1.4 * k, { mood: 'cheer', glow: true }); drawRabbit(ctx, W * .6, ground - 6 * k, 1.2 * k); ctx.fillStyle = '#C8174D'; ctx.beginPath(); const hx = W * .5, hy = H * .3 + Math.sin(t * 3) * 4; ctx.moveTo(hx, hy + 10); ctx.bezierCurveTo(hx - 18, hy - 6, hx - 8, hy - 18, hx, hy - 6); ctx.bezierCurveTo(hx + 8, hy - 18, hx + 18, hy - 6, hx, hy + 10); ctx.fill(); }
  if (s === 'oasis' || s === 'wind' || s === 'friends' || s === 'build' || s === 'happy') {
    ctx.fillStyle = '#7FC1D6'; ctx.beginPath(); ctx.ellipse(W * .3, H * .86, W * .18, H * .05, 0, 0, 7); ctx.fill();
    const sway = s === 'wind' ? Math.sin(t * 6) * 10 : Math.sin(t) * 2; palm(ctx, W * .62, ground + 14 * k, 2.1 * k, sway);
    const nestOnTree = s === 'oasis' || s === 'happy' || s === 'build';
    const nx = nestOnTree ? W * .62 + sway * 4 * k : W * .45, ny = nestOnTree ? ground - 150 * k : ground + 4 * k;
    ctx.fillStyle = '#8A6A3F'; ctx.beginPath(); ctx.ellipse(nx, ny, 22 * k, 9 * k, 0, 0, Math.PI); ctx.fill();
    if (s === 'wind') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const y = H * (.2 + i * .12); ctx.beginPath(); ctx.moveTo((t * 200 + i * 90) % (W + 100) - 100, y); ctx.lineTo((t * 200 + i * 90) % (W + 100), y); ctx.stroke(); } }
    drawHoopoe(ctx, s === 'friends' ? W * .4 : nx, s === 'friends' ? ground - 10 * k : ny - 18 * k, .9 * k, { mood: s === 'wind' || s === 'friends' ? 'sad' : 'ok' });
    if (s === 'friends' || s === 'build') { drawHoopoe(ctx, W * .22, ground - 6 * k, .7 * k, { flip: true }); drawNour(ctx, W * .82, ground - 26 * k, 1 * k, { mood: 'happy' }); }
    if (s === 'happy') drawNour(ctx, W * .3, ground - 26 * k, 1.1 * k, { mood: 'cheer', glow: true });
  }
}
