'use strict';
/* The shop (الدكان): four fun games unlocked with coins earned from lessons.
   No real money, nothing random: each item has a fixed price, a confirmation step, and is bought once.
   Parent controls: a lock with a duration, a daily play limit, and an on/off switch for buying. */

const SHOP = [
  { id: 'color', name: 'ألوان الفوانيس', price: 40, blurb: 'لوّن نور بألوانك وارتدِ تصميمك في المدينة.', fn: gameColor, icon: 'palette' },
  { id: 'boat', name: 'قارب الهلال', price: 60, blurb: 'حلّق بين الغيوم واجمع النجوم، وتجنّب غيوم المطر.', fn: gameBoat, icon: 'boat' },
  { id: 'maze', name: 'متاهة النجوم', price: 50, blurb: 'اعثر على الطريق إلى الباب واجمع النجوم. المتاهة تكبر مع كل مرحلة.', fn: gameMaze, icon: 'maze' },
  { id: 'city', name: 'ابنِ مدينتك', price: 80, blurb: 'ضع البيوت والقباب والنخيل والفوانيس وابنِ حيّك الخاص.', fn: gameCity, icon: 'city' },
];
const shopDay = () => new Date().toISOString().slice(0, 10);
function shopUsedSec() { const u = S.shopUsed; return u && u.day === shopDay() ? u.sec : 0; }
function shopAddSec(s) { if (!S.shopUsed || S.shopUsed.day !== shopDay()) S.shopUsed = { day: shopDay(), sec: 0 }; S.shopUsed.sec += s; }
function shopLocked() { return S.shopLockUntil && Date.now() < S.shopLockUntil; }
function shopLimitLeft() { const lim = (S.shopDailyMin ?? 20) * 60; return lim <= 0 ? Infinity : Math.max(0, lim - shopUsedSec()); }
function fmtTime(ms) { const d = new Date(ms); return d.toLocaleString('ar-EG', { weekday: 'long', hour: 'numeric', minute: '2-digit' }); }
function shopIcon(k, s = 64) {
  const g = {
    palette: '<circle cx="32" cy="32" r="24" fill="#FBF7F0" stroke="#0C2470" stroke-width="3"/><circle cx="22" cy="24" r="5" fill="#C8174D"/><circle cx="34" cy="18" r="5" fill="#C9A24B"/><circle cx="44" cy="28" r="5" fill="#2F7A62"/><circle cx="40" cy="42" r="5" fill="#1236A0"/><circle cx="24" cy="40" r="6" fill="#fff" stroke="#0C2470" stroke-width="2"/>',
    boat: '<path d="M10 36 Q32 58 54 36 Q40 44 32 44 Q22 44 10 36z" fill="#C9A24B"/><path d="M32 12v26" stroke="#0C2470" stroke-width="3"/><path d="M32 14l14 18H32z" fill="#C8174D"/><circle cx="16" cy="16" r="4" fill="#E2C171"/><circle cx="50" cy="12" r="3" fill="#E2C171"/>',
    maze: '<rect x="8" y="8" width="48" height="48" rx="6" fill="#DDEBE3" stroke="#0C2470" stroke-width="3"/><path d="M8 24h30M26 24v16M18 40h26M44 8v22M56 40H44" stroke="#0C2470" stroke-width="3"/><path d="M50 49l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#C9A24B"/>',
    city: '<rect x="6" y="50" width="52" height="6" fill="#2F7A62"/><rect x="10" y="30" width="16" height="20" fill="#F2EADC" stroke="#0C2470" stroke-width="2"/><path d="M30 50V30a9 9 0 0 1 18 0v20z" fill="#1236A0"/><circle cx="39" cy="20" r="3" fill="#C9A24B"/><path d="M52 50V30M52 30q-8-2-10 4M52 30q8-2 10 4M52 30q-4-6-10-6M52 30q4-6 10-6" stroke="#2F7A62" stroke-width="3" fill="none"/>',
  }[k];
  return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${g}</svg>`;
}

function viewShop() {
  const locked = shopLocked(), left = shopLimitLeft();
  return `<button class="crumb" data-go="home">‹ الرئيسية</button>
  <div class="sec-head shop-head"><div><h1>دكان صلة</h1><p>ألعاب مرح تُفتح بالعملات التي تكسبها من الدروس. لا مال حقيقي ولا صناديق عشوائية: سعر ثابت وتأكيد قبل الشراء.</p></div><div class="nour-sm">${nourSVG('cheer')}</div></div>
  ${locked ? `<div class="notice lock">🔒 الدكان مقفل من وليّ الأمر حتى ${esc(fmtTime(S.shopLockUntil))}. تابع دروسك الآن!</div>` : ''}
  ${!locked && left !== Infinity ? `<div class="notice">وقت اللعب المتبقي اليوم: <b id="leftMin">${num(Math.ceil(left / 60))}</b> دقيقة (يحدده وليّ الأمر)</div>` : ''}
  ${S.allowBuy === false ? '<div class="notice">الشراء متوقف مؤقتًا من وليّ الأمر. يمكنك لعب ما فتحته من قبل.</div>' : ''}
  <div class="shopgrid">${SHOP.map(it => { const own = S.owned.includes(it.id); return `<div class="shopcard ${own ? 'own' : ''}" data-item="${it.id}">
    <div class="sc-art">${shopIcon(it.icon, 76)}</div><h3>${esc(it.name)}</h3><p>${esc(it.blurb)}</p>
    ${own ? `<button class="gbtn green" data-play="${it.id}" ${locked || left <= 0 ? 'disabled' : ''}>العب</button>${S.shopBest && S.shopBest[it.id] != null ? `<span class="tag">أفضل نتيجة: ${num(S.shopBest[it.id])}</span>` : ''}`
      : `<button class="gbtn gold" data-buy="${it.id}" ${locked || S.allowBuy === false ? 'disabled' : ''}>${coinSVG(20)} ${num(it.price)}</button>${S.coins < it.price ? `<span class="tag">تحتاج ${num(it.price - S.coins)} عملة أخرى</span>` : ''}`}
  </div>`; }).join('')}</div>
  <div class="card ledger"><h3>سجل العملات</h3>${S.ledger.length ? `<ul>${S.ledger.slice(0, 8).map(x => `<li><span>${esc(x.label)}</span><b class="${x.amt > 0 ? 'plus' : 'minus'}">${x.amt > 0 ? '+' : ''}${num(x.amt)}</b></li>`).join('')}</ul>` : '<p class="muted">لا حركات بعد. العب الدروس لتكسب العملات.</p>'}</div>
  <div id="buyDlg"></div>`;
}
function bindShop() {
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => askBuy(SHOP.find(x => x.id === b.dataset.buy)));
  document.querySelectorAll('[data-play]').forEach(b => b.onclick = () => runShopGame(SHOP.find(x => x.id === b.dataset.play)));
}
function askBuy(it) {
  SFX.tap();
  if (shopLocked() || S.allowBuy === false) return toast('الشراء غير متاح الآن');
  const enough = S.coins >= it.price;
  $('buyDlg').innerHTML = `<div class="overlay fixed"><div class="panel pop"><div>${shopIcon(it.icon, 80)}</div><h2>${esc(it.name)}</h2>
    ${enough ? `<p>هل تريد فتح هذه اللعبة مقابل <b>${num(it.price)}</b> عملة؟ سيبقى معك <b>${num(S.coins - it.price)}</b>.</p><div class="row center"><button class="gbtn red" id="yesBuy">نعم، افتحها</button><button class="gbtn ghost" id="noBuy">ليس الآن</button></div>`
      : `<p>رصيدك <b>${num(S.coins)}</b> وتحتاج <b>${num(it.price)}</b>. أكمل دروسًا جديدة أو حسّن نجومك لتكسب المزيد.</p><div class="row center"><button class="gbtn" data-go="section-games">إلى الدروس</button><button class="gbtn ghost" id="noBuy">حسنًا</button></div>`}</div></div>`;
  bindNav();
  $('noBuy').onclick = () => $('buyDlg').innerHTML = '';
  if (enough) $('yesBuy').onclick = () => {
    // one purchase per item: mirrors ledger doc id buy_{itemId} in the planned rules
    if (S.owned.includes(it.id) || S.coins < it.price) return;
    S.coins -= it.price; S.owned.push(it.id); S.ledger.unshift({ t: Date.now(), label: 'شراء: ' + it.name, amt: -it.price, kind: 'buy', id: 'buy_' + it.id });
    saveState(); renderWallet(); SFX.coin(); toast('فُتحت «' + it.name + '»!'); route();
  };
}

/* shell for shop games: stage, timer for the parent's daily limit, result panel, replay */
function runShopGame(it) {
  if (!S.owned.includes(it.id)) return toast('افتح اللعبة أولًا');
  if (shopLocked()) return toast('الدكان مقفل الآن');
  if (shopLimitLeft() <= 0) return toast('انتهى وقت اللعب لليوم');
  $('view').innerHTML = `<button class="crumb" data-go="shop">‹ الدكان</button>
  <div class="stage" id="stage" data-engine="shop-${it.id}"><div class="hud"><div class="prompt" id="prompt">${esc(it.name)}</div><div class="hudstat" id="hudstat"></div>
  <button class="iconbtn" id="sfx" aria-pressed="${S.sfx}" aria-label="المؤثرات الصوتية">${S.sfx ? ICONS.note : ICONS.mute}</button></div><div id="game" class="game"></div></div>
  <p class="muted center">${esc(it.blurb)}</p>`;
  bindNav();
  $('sfx').onclick = ev => { S.sfx = !S.sfx; saveState(); ev.currentTarget.innerHTML = S.sfx ? ICONS.note : ICONS.mute; };
  const g = $('game'); window.__eng = null;
  let tick = setInterval(() => { shopAddSec(1); if (shopLimitLeft() <= 0) end({ score: null, note: 'انتهى وقت اللعب الذي حدده وليّ الأمر لليوم.' }); }, 1000);
  let stop = null, ended = false;
  function end(r) {
    if (ended) return; ended = true; clearInterval(tick); saveState(); stop && stop();
    if (r.score != null) { S.shopBest = S.shopBest || {}; if (r.score > (S.shopBest[it.id] ?? -1)) S.shopBest[it.id] = r.score; saveState(); }
    SFX.win();
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="panel pop result"><div class="nour-sm">${nourSVG('cheer')}</div><h2>${esc(r.title || 'أَحْسَنْتَ!')}</h2>
      ${r.score != null ? `<p class="bigscore">${num(r.score)}</p><p>أفضل نتيجة: <b>${num(S.shopBest[it.id])}</b></p>` : ''}${r.note ? `<p>${esc(r.note)}</p>` : ''}
      <p class="muted">ألعاب الدكان للمرح ولا تمنح عملات.</p>
      <div class="row center">${shopLimitLeft() > 0 ? '<button class="gbtn red" id="again">العب مرة أخرى</button>' : ''}<button class="gbtn ghost" data-go="shop">الدكان</button></div></div>`;
    $('stage').appendChild(o); bindNav();
    const a = $('again'); if (a) a.onclick = () => runShopGame(it);
    window.__lastShop = { id: it.id, ...r };
  }
  stop = it.fn(g, end) || null;
  stopGame = () => { clearInterval(tick); stop && stop(); };
}

/* ---- 1. Lantern colours: tap a part of Nour, then a colour. Saved as the "custom" skin. ---- */
function gameColor(root, end) {
  const PAL = ['#1236A0', '#0C2470', '#C8174D', '#8E0F37', '#2F7A62', '#1E5544', '#C9A24B', '#A8822F', '#E2C171', '#7A3E1D', '#6B4FA0', '#F28C28', '#FBF7F0', '#3A3A3A'];
  const PARTS = { body: 'الجسم', glass: 'الزجاج المضيء', cap: 'التاج', trim: 'الحواف', band: 'الشريط' };
  const base = S.designs.custom || SKINS[S.skin] || SKINS.classic;
  const d = { body: base.body, glass: [...base.glass], cap: base.cap, trim: base.trim, band: base.band };
  const SENT = { body: '#000001', cap: '#000002', trim: '#000003', band: '#000004', g0: '#000005', g1: '#000006' };
  const lighten = (h, p) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, f = c => Math.round(c + (255 - c) * p); return '#' + [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
  let part = 'body';
  root.innerHTML = `<div class="colorgame"><div class="cg-art" id="cgArt"></div><div class="cg-side">
    <div class="cg-parts">${Object.entries(PARTS).map(([k, v]) => `<button class="chip ${k === part ? 'on' : ''}" data-part="${k}">${v}</button>`).join('')}</div>
    <div class="cg-pal">${PAL.map(c => `<button class="sw" data-c="${c}" style="--c:${c}" aria-label="لون"></button>`).join('')}</div>
    <div class="row"><button class="gbtn green" id="cgSave">احفظ وارتدِ التصميم</button><button class="gbtn ghost" id="cgReset">من جديد</button></div>
    <p class="muted">المس جزءًا من نور أو اختره من الأزرار، ثم المس لونًا.</p></div></div>`;
  const art = $('cgArt');
  function paint() {
    S.designs.__tmp = { body: SENT.body, cap: SENT.cap, trim: SENT.trim, band: SENT.band, glass: [SENT.g0, SENT.g1] };
    art.innerHTML = nourSVG('happy', '__tmp'); delete S.designs.__tmp;
    const map = { [SENT.body]: 'body', [SENT.cap]: 'cap', [SENT.trim]: 'trim', [SENT.band]: 'band' };
    art.querySelectorAll('*').forEach(el => {
      for (const at of ['fill', 'stroke']) { const v = el.getAttribute(at); if (map[v]) { el.setAttribute(at, d[map[v]]); el.dataset.p = map[v]; } }
      if ((el.getAttribute('fill') || '').startsWith('url(')) el.dataset.p = 'glass';
      if (el.tagName === 'stop') el.setAttribute('stop-color', el.getAttribute('stop-color') === SENT.g0 ? d.glass[0] : d.glass[1]);
    });
    art.querySelectorAll('[data-p]').forEach(el => { el.style.cursor = 'pointer'; el.classList.toggle('sel', el.dataset.p === part); el.addEventListener('pointerdown', e => { e.preventDefault(); pick(el.dataset.p); }); });
  }
  function pick(p) { part = p; SFX.tap(); root.querySelectorAll('[data-part]').forEach(b => b.classList.toggle('on', b.dataset.part === p)); paint(); }
  function color(c) { if (part === 'glass') d.glass = [lighten(c, .7), lighten(c, .25)]; else d[part] = c; SFX.pop(); paint(); }
  root.querySelectorAll('[data-part]').forEach(b => b.onclick = () => pick(b.dataset.part));
  root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => color(b.dataset.c));
  $('cgReset').onclick = () => { Object.assign(d, structuredClone(SKINS.classic)); paint(); };
  $('cgSave').onclick = () => { S.designs.custom = structuredClone(d); S.skin = 'custom'; saveState(); end({ score: null, title: 'تصميم رائع!', note: 'ارتدى نور تصميمك. ستراه في المدينة والدروس.' }); };
  paint();
  window.__eng = { pick, color, get design() { return d; } };
  return () => { };
}

/* ---- 2. Crescent boat: fly up/down, collect stars, avoid rain clouds. 3 hearts, 60 seconds. ---- */
function gameBoat(root, end) {
  const st = makeStage(root, .5, 1.1), { ctx } = st, fx = fxLayer();
  let y = .5, vy = 0, target = null, hearts = 3, score = 0, time = 60, inv = 0, items = [], spawn = 0, over = false, bg = 0;
  const keys = {};
  const kd = e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { keys[e.key] = e.type === 'keydown'; e.preventDefault(); } };
  addEventListener('keydown', kd); addEventListener('keyup', kd);
  const pt = e => { target = st.local(e).y / st.H; };
  st.cv.addEventListener('pointerdown', e => { pt(e); st.cv.setPointerCapture(e.pointerId); });
  st.cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') pt(e); });
  const hud = () => { $('hudstat').innerHTML = `<span>${'❤'.repeat(hearts)}<i class="dim">${'❤'.repeat(3 - hearts)}</i></span><span>★ ${num(score)}</span><span>⏱ ${num(Math.ceil(time))}</span>`; };
  hud();
  st.run(dt => {
    const { W, H } = st; if (over) return;
    time -= dt; bg += dt; inv = Math.max(0, inv - dt);
    if (keys.ArrowUp) target = Math.max(.08, (target ?? y) - dt * 1.2); if (keys.ArrowDown) target = Math.min(.92, (target ?? y) + dt * 1.2);
    if (target != null) { vy += ((target - y) * 30 - vy * 7) * dt; } y = Math.min(.92, Math.max(.08, y + vy * dt));
    spawn -= dt; const speed = 150 + (60 - time) * 2.2;
    if (spawn <= 0) { spawn = rnd(.55, .95); const storm = Math.random() < .38 + (60 - time) / 200; items.push({ x: -40, y: rnd(.1, .9), storm, r: storm ? 26 : 15, a: 0 }); }
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0C2470'); g.addColorStop(1, '#3B5FC4'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + .3 * Math.sin(bg * 2 + i)})`; ctx.fillRect((i * 97 + bg * 10) % W, (i * 53) % H, 2, 2); }
    for (let i = 0; i < 4; i++) cloud(ctx, ((i * 260 + bg * 30) % (W + 200)) - 100, 40 + i * H / 4.5, .9, .12);
    const bx = W - 80, byy = y * H;
    for (const it of items) {
      it.x += speed * dt; it.a += dt;
      if (it.storm) { cloud(ctx, it.x - 30, it.y * H, .9, 1); ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); ctx.fillStyle = '#7C8AA8'; ctx.beginPath(); ctx.arc(it.x - 10, it.y * H - 6, 16, 0, 7); ctx.arc(it.x + 12, it.y * H - 10, 18, 0, 7); ctx.arc(it.x + 30, it.y * H, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#9FC2F2'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const rx = it.x - 6 + k * 14, ry = it.y * H + 14 + (it.a * 60 + k * 7) % 14; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 7); ctx.stroke(); } }
      else { ctx.fillStyle = '#E2C171'; star8(ctx, it.x, it.y * H, it.r, it.a * 2); ctx.fill(); ctx.strokeStyle = '#A8822F'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (!it.hit && Math.hypot(it.x - bx, it.y * H - byy) < it.r + 26) {
        it.hit = true;
        if (it.storm) { if (!inv) { hearts--; inv = 1.4; SFX.bad(); fx.text(bx, byy - 40, 'انْتَبِهْ!', '#C8174D'); hud(); } }
        else { score++; SFX.coin(); fx.burst(it.x, it.y * H); hud(); }
      }
    }
    items = items.filter(it => it.x < W + 60 && !(it.hit && !it.storm));
    // boat + Nour
    ctx.save(); if (inv && (inv * 10 | 0) % 2) ctx.globalAlpha = .4;
    ctx.translate(bx, byy + Math.sin(bg * 3) * 3); ctx.rotate(Math.max(-.3, Math.min(.3, vy * .25)));
    drawNour(ctx, 0, -12, .55, { mood: inv ? 'sad' : 'happy' });
    ctx.fillStyle = '#C9A24B'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(0, 46, 40, 0); ctx.quadraticCurveTo(0, 22, -40, 0); ctx.fill(); ctx.strokeStyle = '#A8822F'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    fx.draw(ctx, dt);
    if ((time | 0) !== (hud.t | 0)) { hud.t = time; hud(); }
    if (hearts <= 0 || time <= 0) { over = true; end({ score, title: time <= 0 ? 'انتهت الرحلة!' : 'عاد القارب إلى الميناء', note: `جمعت ${score} نجمة.` }); }
  });
  window.__eng = { get state() { return { y, hearts, score, time, items: items.map(i => ({ x: i.x, y: i.y * st.H, storm: i.storm })) }; }, setTarget: v => target = v, finishNow: () => { time = 0; } };
  return () => { st.stop(); removeEventListener('keydown', kd); removeEventListener('keyup', kd); };
}

/* ---- 3. Star maze: generated each time; levels grow 5x5 -> 7x7 -> 9x9 ---- */
function gameMaze(root, end) {
  let level = 1, total = 0, moves = 0;
  root.innerHTML = `<div class="mazewrap"><canvas id="mz"></canvas><div class="dpad static"><button data-d="0,-1" aria-label="أعلى">▲</button><button data-d="1,0" aria-label="يمين">▶</button><button data-d="-1,0" aria-label="يسار">◀</button><button data-d="0,1" aria-label="أسفل">▼</button></div></div>`;
  const cv = $('mz'), ctx = cv.getContext('2d'); let M, n, P, stars, door, cs, anim = 0, raf;
  function gen(sz) {
    n = sz; M = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ n: 1, e: 1, s: 1, w: 1, v: 0 })));
    const stack = [[0, 0]]; M[0][0].v = 1;
    while (stack.length) { const [x, y] = stack[stack.length - 1]; const nb = [[0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e']].map(([dx, dy, a, b]) => [x + dx, y + dy, a, b]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !M[b][a].v);
      if (!nb.length) { stack.pop(); continue; } const [nx, ny, a, b] = pickOne(nb); M[y][x][a] = 0; M[ny][nx][b] = 0; M[ny][nx].v = 1; stack.push([nx, ny]); }
    P = { x: n - 1, y: 0, dx: n - 1, dy: 0 }; door = { x: 0, y: n - 1 }; // RTL: start top-right, exit bottom-left
    const cells = shuffle(Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: i / n | 0 })).filter(c => !(c.x === P.x && c.y === P.y) && !(c.x === door.x && c.y === door.y)));
    stars = cells.slice(0, n - 2);
    $('prompt').textContent = `المرحلة ${num(level)}: اجمع النجوم ثم اذهب إلى الباب`;
  }
  function fit() { const dpr = Math.min(2, devicePixelRatio || 1), w = Math.min(root.clientWidth - 8, innerHeight * .62, 560); cv.width = w * dpr; cv.height = w * dpr; cv.style.width = cv.style.height = w + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cs = w / n; }
  function move(dx, dy) {
    const c = M[P.y][P.x], wall = dx === 1 ? c.e : dx === -1 ? c.w : dy === 1 ? c.s : c.n;
    if (wall) { SFX.bad(); anim = .2; return false; }
    P.x += dx; P.y += dy; moves++; SFX.step();
    const si = stars.findIndex(s => s.x === P.x && s.y === P.y); if (si >= 0) { stars.splice(si, 1); total++; SFX.coin(); hudM(); }
    if (P.x === door.x && P.y === door.y) {
      if (stars.length) { toast('بَقِيَتْ نُجُومٌ! اجْمَعْهَا أَوَّلًا'); SFX.bad(); }
      else { SFX.win(); if (level >= 3) { end({ score: total, title: 'خَرَجْتَ مِنْ كُلِّ المَتَاهَاتِ!', note: `في ${moves} خطوة.` }); return true; } level++; gen(3 + level * 2); fit(); hudM(); }
    }
    return true;
  }
  const hudM = () => { $('hudstat').innerHTML = `<span>المرحلة ${num(level)}/٣</span><span>★ ${num(total)}</span>`; };
  const kd = e => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (m) { e.preventDefault(); move(...m); } };
  addEventListener('keydown', kd);
  root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => move(...b.dataset.d.split(',').map(Number)));
  let sw = null;
  cv.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', e => {
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.hypot(dx, dy) > 24) { Math.abs(dx) > Math.abs(dy) ? move(Math.sign(dx), 0) : move(0, Math.sign(dy)); return; }
    const r = cv.getBoundingClientRect(), cx = (e.clientX - r.left) / cs | 0, cy = (e.clientY - r.top) / cs | 0, ddx = cx - P.x, ddy = cy - P.y;
    if (Math.abs(ddx) + Math.abs(ddy) === 1) move(ddx, ddy); else if (ddx === 0 && ddy === 0) { } else if (Math.abs(ddx) > Math.abs(ddy)) move(Math.sign(ddx), 0); else move(0, Math.sign(ddy));
  });
  gen(5); fit(); hudM(); addEventListener('resize', fit);
  const draw = now => {
    const w = cs * n, t = now / 1000; anim = Math.max(0, anim - .016);
    ctx.fillStyle = '#DDEBE3'; ctx.fillRect(0, 0, w, w);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x * cs, y * cs, cs, cs); }
    // door: pointed arch
    ctx.fillStyle = '#C8174D'; arch(ctx, door.x * cs + cs * .2, door.y * cs + cs * .12, cs * .6, cs * .8); ctx.fill(); ctx.fillStyle = stars.length ? '#8E0F37' : '#FFE9A8'; arch(ctx, door.x * cs + cs * .32, door.y * cs + cs * .3, cs * .36, cs * .62); ctx.fill();
    for (const s of stars) { ctx.fillStyle = '#C9A24B'; star8(ctx, s.x * cs + cs / 2, s.y * cs + cs / 2 + Math.sin(t * 3 + s.x) * 2, cs * .26, t); ctx.fill(); }
    ctx.strokeStyle = '#0C2470'; ctx.lineWidth = Math.max(3, cs * .09); ctx.lineCap = 'round'; ctx.beginPath();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = M[y][x], X = x * cs, Y = y * cs; if (c.n) { ctx.moveTo(X, Y); ctx.lineTo(X + cs, Y); } if (c.w) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + cs); } if (y === n - 1 && c.s) { ctx.moveTo(X, Y + cs); ctx.lineTo(X + cs, Y + cs); } if (x === n - 1 && c.e) { ctx.moveTo(X + cs, Y); ctx.lineTo(X + cs, Y + cs); } }
    ctx.stroke();
    P.dx += (P.x - P.dx) * .3; P.dy += (P.y - P.dy) * .3;
    drawNour(ctx, P.dx * cs + cs / 2 + (anim ? Math.sin(t * 60) * 3 : 0), P.dy * cs + cs * .6, cs / 90, { mood: anim ? 'sad' : 'happy', walk: Math.abs(P.x - P.dx) > .05 });
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  // solver for tests: BFS path from player to a cell
  function path(tx, ty) { const q = [[P.x, P.y]], prev = { [P.x + ',' + P.y]: null }; while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) break; const c = M[y][x]; for (const [dx, dy, k] of [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']]) { const nx = x + dx, ny = y + dy, key = nx + ',' + ny; if (!c[k] && !(key in prev)) { prev[key] = [x, y, dx, dy]; q.push([nx, ny]); } } } const out = []; let k = tx + ',' + ty; while (prev[k]) { const [x, y, dx, dy] = prev[k]; out.unshift([dx, dy]); k = x + ',' + y; } return out; }
  window.__eng = { move, path, get state() { return { level, total, n, P: { x: P.x, y: P.y }, door, stars: stars.map(s => ({ ...s })) }; } };
  return () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('resize', fit); };
}

/* ---- 4. Build your city: place pieces on a grid; saved in S.city ---- */
const CITY_PIECES = { house: 'بيت', dome: 'قبة', arch: 'قوس', palm: 'نخلة', garden: 'حديقة', water: 'ماء', path: 'طريق', lantern: 'فانوس', erase: 'ممحاة' };
function drawPiece(ctx, k, x, y, s, t = 0) {
  ctx.save(); ctx.translate(x, y);
  if (k === 'path') { ctx.fillStyle = '#E9DCC3'; ctx.fillRect(0, 0, s, s); ctx.fillStyle = '#D6C4A2'; for (let i = 0; i < 4; i++) ctx.fillRect((i % 2) * s / 2 + 3, (i >> 1) * s / 2 + 3, s / 2 - 6, s / 2 - 6); }
  else if (k === 'water') { ctx.fillStyle = '#7FB6E6'; ctx.fillRect(0, 0, s, s); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); for (let q = 0; q <= s; q += 4) ctx.lineTo(q, i * s / 3 + Math.sin(q / 6 + t * 3) * 2); ctx.stroke(); } }
  else if (k === 'garden') { ctx.fillStyle = '#9ED39A'; ctx.fillRect(0, 0, s, s); for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#C8174D', '#E2C171', '#fff'][i % 3]; ctx.beginPath(); ctx.arc(s * (.2 + (i * .17) % .7), s * (.25 + (i * .31) % .6), s * .07, 0, 7); ctx.fill(); } }
  else {
    ctx.fillStyle = '#CFE6C8'; ctx.fillRect(0, 0, s, s);
    if (k === 'house') { ctx.fillStyle = '#F2EADC'; ctx.fillRect(s * .15, s * .35, s * .7, s * .55); ctx.strokeStyle = '#0C2470'; ctx.lineWidth = 2; ctx.strokeRect(s * .15, s * .35, s * .7, s * .55); ctx.fillStyle = '#C8174D'; arch(ctx, s * .4, s * .55, s * .2, s * .35); ctx.fill(); ctx.fillStyle = '#1236A0'; ctx.fillRect(s * .22, s * .45, s * .12, s * .12); ctx.fillRect(s * .66, s * .45, s * .12, s * .12); ctx.fillStyle = '#E9DCC3'; ctx.fillRect(s * .1, s * .28, s * .8, s * .08); }
    if (k === 'dome') { ctx.fillStyle = '#F2EADC'; ctx.fillRect(s * .2, s * .55, s * .6, s * .35); ctx.fillStyle = '#1236A0'; ctx.beginPath(); ctx.moveTo(s * .2, s * .56); ctx.quadraticCurveTo(s * .2, s * .15, s * .5, s * .12); ctx.quadraticCurveTo(s * .8, s * .15, s * .8, s * .56); ctx.fill(); ctx.fillStyle = '#C9A24B'; ctx.beginPath(); ctx.arc(s * .5, s * .08, s * .05, 0, 7); ctx.fill(); }
    if (k === 'arch') { ctx.fillStyle = '#C8174D'; arch(ctx, s * .15, s * .12, s * .7, s * .8); ctx.fill(); ctx.fillStyle = '#CFE6C8'; arch(ctx, s * .3, s * .35, s * .4, s * .57); ctx.fill(); ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 2; arch(ctx, s * .15, s * .12, s * .7, s * .8); ctx.stroke(); }
    if (k === 'palm') palm(ctx, s * .5, s * .92, s / 70, Math.sin(t * 2) * .05);
    if (k === 'lantern') { ctx.strokeStyle = '#7A3E1D'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s * .5, s * .95); ctx.lineTo(s * .5, s * .3); ctx.stroke(); const g = ctx.createRadialGradient(s * .5, s * .25, 1, s * .5, s * .25, s * .4); g.addColorStop(0, `rgba(255,233,168,${.6 + .2 * Math.sin(t * 4)})`); g.addColorStop(1, 'rgba(255,233,168,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s * .5, s * .25, s * .4, 0, 7); ctx.fill(); ctx.fillStyle = '#C9A24B'; rr(ctx, s * .4, s * .13, s * .2, s * .24, 4); ctx.fill(); ctx.fillStyle = '#FFE9A8'; rr(ctx, s * .44, s * .17, s * .12, s * .16, 3); ctx.fill(); }
  }
  ctx.restore();
}
function gameCity(root, end) {
  const C = 10, R = 7;
  const grid = (S.city && S.city.grid && S.city.grid.length === R * C) ? [...S.city.grid] : Array(R * C).fill('');
  let sel = 'house', raf, cs = 40, drag = false;
  root.innerHTML = `<div class="citygame"><div class="pieces">${Object.entries(CITY_PIECES).map(([k, v]) => `<button class="piece ${k === sel ? 'on' : ''}" data-k="${k}"><canvas width="48" height="48"></canvas><span>${v}</span></button>`).join('')}</div>
    <canvas id="cityCv"></canvas><div class="row center"><span class="tag" id="cityCount"></span><button class="gbtn green" id="citySave">احفظ مدينتي</button><button class="gbtn ghost" id="cityClear">امسح الكل</button></div></div>`;
  root.querySelectorAll('.piece').forEach(b => { const c = b.querySelector('canvas').getContext('2d'); if (b.dataset.k === 'erase') { c.fillStyle = '#F2EADC'; c.fillRect(0, 0, 48, 48); c.strokeStyle = '#C8174D'; c.lineWidth = 4; c.beginPath(); c.moveTo(12, 12); c.lineTo(36, 36); c.moveTo(36, 12); c.lineTo(12, 36); c.stroke(); } else drawPiece(c, b.dataset.k, 0, 0, 48); b.onclick = () => { sel = b.dataset.k; SFX.tap(); root.querySelectorAll('.piece').forEach(x => x.classList.toggle('on', x === b)); }; });
  const cv = $('cityCv'), ctx = cv.getContext('2d');
  const fit = () => { const dpr = Math.min(2, devicePixelRatio || 1), w = Math.min(root.clientWidth - 8, 720); cs = w / C; cv.width = w * dpr; cv.height = cs * R * dpr; cv.style.width = w + 'px'; cv.style.height = cs * R + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); addEventListener('resize', fit);
  const count = () => { $('cityCount').textContent = `قطع في مدينتك: ${num(grid.filter(Boolean).length)}`; };
  function place(i, k = sel) { if (i < 0 || i >= grid.length) return; const v = k === 'erase' ? '' : k; if (grid[i] === v) return; grid[i] = v; v ? SFX.pop() : SFX.tap(); count(); }
  const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / cs | 0, y = (e.clientY - r.top) / cs | 0; return x >= 0 && y >= 0 && x < C && y < R ? y * C + x : -1; };
  cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); place(at(e)); });
  cv.addEventListener('pointermove', e => { if (drag && ['path', 'water', 'garden', 'erase'].includes(sel)) place(at(e)); });
  cv.addEventListener('pointerup', () => drag = false);
  $('cityClear').onclick = () => { grid.fill(''); count(); SFX.whoosh(); };
  $('citySave').onclick = () => { S.city = { grid: [...grid], at: Date.now() }; saveState(); end({ score: grid.filter(Boolean).length, title: 'مدينة جميلة!', note: 'حُفظت مدينتك وستجدها هنا كلما عدت.' }); };
  count();
  const draw = now => { const t = now / 1000; for (let i = 0; i < grid.length; i++) { const x = (i % C) * cs, y = (i / C | 0) * cs; if (grid[i]) drawPiece(ctx, grid[i], x, y, cs, t); else { ctx.fillStyle = (i + (i / C | 0)) % 2 ? '#E6F1E1' : '#DDEBE3'; ctx.fillRect(x, y, cs, cs); } } ctx.strokeStyle = 'rgba(12,36,112,.12)'; ctx.lineWidth = 1; for (let x = 0; x <= C; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, R * cs); ctx.stroke(); } for (let y = 0; y <= R; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(C * cs, y * cs); ctx.stroke(); } raf = requestAnimationFrame(draw); };
  raf = requestAnimationFrame(draw);
  window.__eng = { place, grid, select: k => sel = k, cell: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + (x + .5) * cs, y: r.top + (y + .5) * cs }; } };
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
}
