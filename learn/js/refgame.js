'use strict';
/* Reference-locked game shell (Silah identity).
   A fixed 1024x768 stage scaled to fit any screen, the tap-to-start screen, the title card,
   the closing curtain and the return to the games list. Each game registers in REFGAMES
   and receives (stage, lessonData, api). Lesson data lives apart from the game code. */

const REFGAMES = {};
const REF_W = 1024, REF_H = 768;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function refEl(tag, cls, parent, css) {
  const e = document.createElement(tag); if (cls) e.className = cls;
  if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e;
}
/* place an element by its centre point in stage pixels */
function refPlace(e, x, y, w, h) { Object.assign(e.style, { left: (x - w / 2) + 'px', top: (y - h / 2) + 'px', width: w + 'px', height: h + 'px' }); return e; }

function handSVG(dir = 'up') {
  /* original pointing hand, drawn here; dir: up | left */
  const rot = dir === 'left' ? 'rotate(-90 60 60)' : '';
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><g transform="${rot}">
  <g stroke="#14213D" stroke-width="5" stroke-linecap="round" class="rays"><path d="M60 6v10M38 14l6 8M82 14l-6 8M28 34h10M82 34h10"/></g>
  <path d="M52 30c0-6 10-6 10 0v32l4-1c0-5 9-5 9 0v2c1-5 9-5 9 1v3c1-5 9-4 9 2v20c0 14-9 23-22 23H64c-8 0-13-4-17-10L34 84c-3-5 3-10 8-6l10 8z" fill="#fff" stroke="#14213D" stroke-width="5" stroke-linejoin="round"/>
  <rect x="46" y="104" width="44" height="10" rx="4" fill="#14213D"/></g></svg>`;
}

const REF = {
  root: null, stage: null, scaleBox: null, data: null, t0: 0, mistakes: 0,
  fit() {
    const r = REF.root.getBoundingClientRect();
    const k = Math.min(r.width / REF_W, r.height / REF_H);
    REF.scaleBox.style.transform = `translate(-50%,-50%) scale(${k})`;
    REF.k = k;
  },
  async start(gameId, lessonId) {
    const g = REFGAMES[gameId]; const data = g && g.lessons[lessonId];
    REF.root = document.getElementById('refRoot');
    if (!data) { REF.root.innerHTML = '<p class="refmsg">هذه اللعبة غير متاحة بعد.</p>'; return; }
    REF.game = g; REF.data = data; REF.gameId = gameId; REF.lessonId = lessonId;
    REF.root.innerHTML = '';
    REF.scaleBox = refEl('div', 'ref-scale', REF.root);
    REF.stage = refEl('div', 'ref-stage', REF.scaleBox);
    REF.fit(); addEventListener('resize', REF.fit);
    document.title = data.title + ' · صلة';
    /* 1. tap-to-start (needed anyway so that sound may play on phones) */
    const s = refEl('div', 'ref-start', REF.stage);
    s.innerHTML = `<div class="ref-glow"><div class="ref-hand">${handSVG()}</div></div>`;
    await new Promise(res => s.addEventListener('pointerdown', res, { once: true }));
    SFX.tap(); s.remove(); await sleep(60);   /* let this tap finish before the card listens */
    /* 2. backdrop + title card */
    refEl('div', 'ref-bg', REF.stage, { backgroundImage: `url(${g.assets.bg})` });
    REF.layer = refEl('div', 'ref-layer', REF.stage);
    /* the title card waits for a tap, as on the reference, over a dimmed scene */
    const dim = refEl('div', 'ref-dim', REF.stage);
    const card = refEl('div', 'ref-card pop', REF.stage);
    card.innerHTML = `<p>${esc(data.title)}</p>${g.assets.card ? `<img class="books" src="${g.assets.card}" alt="" draggable="false">` : ''}`;
    say(data.say || data.title);
    await new Promise(res => REF.stage.addEventListener('pointerdown', res, { once: true }));
    SFX.tap(); card.classList.add('out'); dim.style.opacity = 0; await sleep(350); card.remove(); dim.remove();
    REF.t0 = performance.now(); REF.mistakes = 0;
    /* 3. the game itself */
    await g.play(REF.layer, data, REF);
    /* 4. curtain, then back to the list */
    await REF.curtain();
    REF.done();
  },
  async curtain() {
    const c = refEl('div', 'ref-curtain', REF.stage); SFX.whoosh();
    await sleep(30); c.classList.add('in'); await sleep(1100);
  },
  done() {
    const id = `ref:${REF.gameId}:${REF.lessonId}`;
    const ms = Math.round(performance.now() - REF.t0);
    S.refDone = S.refDone || {}; S.refDone[id] = { at: Date.now(), ms, mistakes: REF.mistakes };
    saveState();
    window.__refResult = { id, ms, mistakes: REF.mistakes };
    const back = new URLSearchParams(location.search).get('back') || 'index.html#section-games';
    if (window.__refStay) {   /* tests and previews stay on the page and offer a replay */
      const b = refEl('button', 'ref-again', REF.stage); b.textContent = 'العب مرة أخرى';
      b.onclick = () => location.reload(); return;
    }
    location.href = back;   /* the tick comes from S.refDone */
  },
  /* wait for a tap on one element; taps elsewhere call onMiss */
  tapOn(el, onMiss) {
    return new Promise(res => {
      const h = ev => {
        if (el.contains(ev.target)) { REF.stage.removeEventListener('pointerdown', h); res(ev); }
        else if (onMiss) onMiss(ev);
      };
      REF.stage.addEventListener('pointerdown', h);
    });
  },
  hand(parent, x, y, dir = 'up', size = 150) {
    const h = refEl('div', 'ref-hint ' + dir, parent); refPlace(h, x, y, size, size); h.innerHTML = handSVG(dir); return h;
  },
};
