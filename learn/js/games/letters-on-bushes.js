'use strict';
/* Game G-001 «الحروف على الشجيرات» (reference: group 1, lesson 1).
   Mechanic, observed on the reference: a letter is introduced, then shows up on one plant at a time;
   the child taps it, the plant smiles, and after five plants a picture word appears.
   Tapping the picture shows the word; tapping the word separates its first letter.
   Art: Silah originals produced through ChatGPT (assets/games/letters-on-bushes). */

const LOB_DIR = 'assets/games/letters-on-bushes/';
/* stage layouts in the 1024x768 frame; y is the ground line for trees and the centre for shrubs */
const LOB_LAYOUTS = {
  trees: [
    { x: 119, top: 420 }, { x: 313, top: 322 }, { x: 511, top: 420 }, { x: 709, top: 322 }, { x: 906, top: 420 },
  ],
  shrubs: [
    { x: 119, y: 536 }, { x: 511, y: 536 }, { x: 903, y: 536 }, { x: 315, y: 676 }, { x: 707, y: 676 },
  ],
};
const LOB_GROUND = 616;

REFGAMES['letters-on-bushes'] = {
  id: 'G-001', name: 'الحروف على الشجيرات',
  assets: { bg: LOB_DIR + 'bg.jpg' },
  /* lesson data only: the game code above never names a letter */
  lessons: {
    'alef-ba': {
      title: 'هَيَّا نَتَعَرَّفُ عَلَى حَرفَي الألِفِ والبَاءِ',
      say: 'هيا نتعرف على حرفي الألف والباء',
      rounds: [
        { letter: 'أ', name: 'الألف', sound: 'أَ', layout: 'trees', word: 'أسد', pic: 'lion', picW: 340, firstJoins: false },
        { letter: 'ب', name: 'الباء', sound: 'بَ', layout: 'shrubs', word: 'بطة', pic: 'duck', picW: 430, firstJoins: true },
      ],
    },
  },
  async play(layer, data, ref) {
    for (let i = 0; i < data.rounds.length; i++) {
      await lobRound(layer, data.rounds[i], ref, i);
      layer.innerHTML = '';
    }
  },
};

function lobImg(name, parent, cls) { const im = refEl('img', cls, parent); im.src = LOB_DIR + name + '.png'; im.alt = ''; im.draggable = false; return im; }

async function lobRound(layer, r, ref, idx) {
  const st = { round: idx, letter: r.letter, phase: 'intro', found: 0, current: -1, plants: [] };
  window.__eng = st;
  /* 1. the letter, large, with the pointing hand */
  const big = refEl('div', 'lob-big pop', layer); big.textContent = r.letter;
  say(r.name);
  await sleep(1300);
  const hint = ref.hand(layer, 512, 470, 'up', 300);
  await new Promise(res => ref.stage.addEventListener('pointerdown', res, { once: true }));
  SFX.tap(); hint.remove(); big.classList.add('out'); await sleep(450); big.remove();

  /* 2. five plants grow in */
  const L = LOB_LAYOUTS[r.layout];
  L.forEach((p, i) => {
    const w = r.layout === 'trees' ? 170 : 216;
    const el = refEl('div', 'lob-plant ' + r.layout, layer);
    if (r.layout === 'trees') {
      const h = LOB_GROUND - p.top;
      Object.assign(el.style, { left: (p.x - w / 2) + 'px', top: p.top + 'px', width: w + 'px', height: h + 'px' });
    } else {
      const h = w * 0.75; refPlace(el, p.x, p.y, w, h);
      el.style.zIndex = p.y > 600 ? 3 : 2;
    }
    el.style.setProperty('--d', (i * 90) + 'ms');
    el.innerHTML = `<div class="lob-crown"><img src="${LOB_DIR + (r.layout === 'trees' ? 'tree' : 'shrub')}.png" alt="" draggable="false" class="plain"><img src="${LOB_DIR + (r.layout === 'trees' ? 'tree' : 'shrub')}-happy.png" alt="" draggable="false" class="happy"><b class="lob-letter">${esc(r.letter)}</b></div>${r.layout === 'trees' ? '<i class="lob-trunk"></i>' : ''}`;
    el.dataset.i = i;
    st.plants.push({ el, done: false });
  });
  SFX.whoosh();
  await sleep(1100);

  /* 3. the letter visits each plant once, in random order */
  st.phase = 'hunt';
  const order = shuffle([0, 1, 2, 3, 4]);
  for (const k of order) {
    const P = st.plants[k]; st.current = k;
    P.el.classList.add('show'); SFX.pop(); say(r.sound);
    await ref.tapOn(P.el, () => { ref.mistakes++; });
    SFX.good();
    P.el.classList.remove('show'); P.el.classList.add('got'); P.done = true; st.found++;
    st.current = -1;
    await sleep(st.found < 5 ? 1500 : 1000);
  }

  /* 4. the middle plants leave, the picture arrives */
  st.phase = 'picture';
  st.plants.forEach((P, i) => { const edge = r.layout === 'trees' ? (i === 0 || i === 4) : (i === 0 || i === 2); P.el.classList.add(edge ? 'stay' : 'leave'); });
  await sleep(700);
  const pic = refEl('div', 'lob-pic small', layer); pic.style.setProperty('--w', r.picW + 'px');
  lobImg(r.pic, pic);
  await sleep(900);
  const h2 = ref.hand(layer, 512 - (r.layout === 'trees' ? 150 : 210), 600, 'left', 120);
  await ref.tapOn(pic, () => { });
  SFX.tap(); h2.remove(); pic.classList.remove('small'); SFX.open();
  const word = refEl('div', 'lob-word pop', layer);
  word.innerHTML = `<span class="w-all">${esc(r.word)}</span>`;
  say(r.word);
  st.phase = 'word';
  await sleep(1800);
  const h3 = ref.hand(layer, 300, 175, 'left', 120);
  h3.classList.add('nearword');
  await ref.tapOn(word, () => { });
  SFX.tap(); h3.remove();
  /* a joining letter keeps its link to the word through a stretched kashida; a non-joining one steps up */
  word.innerHTML = r.firstJoins
    ? `<span class="w-first">${esc(r.letter)}ـــ</span><span class="w-rest">ـ${esc(r.word.slice(1))}</span>`
    : `<span class="w-lift">${esc(r.letter)}</span><span class="w-rest">${esc(r.word.slice(1))}</span>`;
  word.classList.add('split');
  say(r.word + '، ' + r.name);
  st.phase = 'split';
  await sleep(3200);
  layer.classList.add('fadeout'); await sleep(600); layer.classList.remove('fadeout');
}
