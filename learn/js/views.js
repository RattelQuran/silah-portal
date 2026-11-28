'use strict';
/* Views and routing: home, the 10 sections, letters, search, world, shop, parent, teacher, content factory,
   certificate and printable worksheets. Everything reads LESSONS (data) and runs through the real engines. */

const SECTIONS = [
  { id: 'games', name: 'ألعاب الحروف', sub: 'رحلات متدرجة من الألف إلى الجملة', color: '#1236A0', target: 200, unit: 'درسًا تفاعليًا', art: 'games' },
  { id: 'letters', name: 'الحروف', sub: 'تعرّف كل حرف: شكله وحركاته وكلماته', color: '#C8174D', target: 28, unit: 'حرفًا', art: 'letters' },
  { id: 'sight', name: 'الكلمات البصرية', sub: 'كلمات نقرؤها من النظرة الأولى', color: '#2F7A62', target: 100, unit: 'كلمة', art: 'sight' },
  { id: 'exercises', name: 'التمارين', sub: 'كتابة وتصنيف واختيار', color: '#C9A24B', target: 133, unit: 'تصنيفًا', art: 'exercises' },
  { id: 'worksheets', name: 'أوراق العمل', sub: 'أوراق للطباعة والكتابة باليد', color: '#7A3E1D', target: 956, unit: 'ورقة', art: 'worksheets' },
  { id: 'listening', name: 'الاستماع', sub: 'اسمع وافهم واختر', color: '#6B4FA0', target: 100, unit: 'نشاط', art: 'listening' },
  { id: 'grammar', name: 'القواعد', sub: 'النحو بالأمثلة واللعب', color: '#0C2470', target: 216, unit: 'درسًا', art: 'grammar' },
  { id: 'stories', name: 'القصص', sub: 'قصص مصورة ومسموعة وأسئلة', color: '#C8174D', target: 88, unit: 'قصة', art: 'stories' },
  { id: 'texts', name: 'النصوص', sub: 'قراءة وفهم بمستويات', color: '#2F7A62', target: 350, unit: 'نصًا', art: 'texts' },
  { id: 'world', name: 'مدينة صلة', sub: 'عالم الكنز: تجوّل واجمع وافتح الصناديق', color: '#C9A24B', target: 0, unit: '', art: 'world' },
];
const ENGINE_LABEL = { catch: 'التقاط', jump: 'قفز', whack: 'إصابة', seek: 'بحث', drag: 'سحب وبناء', memory: 'ذاكرة', race: 'سباق', listen: 'استماع', lesson: 'درس', exercise: 'تمرين', story: 'قصة' };
const ENGINE_COLOR = { catch: '#1236A0', jump: '#2F7A62', whack: '#C8174D', seek: '#2F7A62', drag: '#C9A24B', memory: '#6B4FA0', race: '#C8174D', listen: '#6B4FA0', lesson: '#0C2470', exercise: '#C9A24B', story: '#C8174D' };
const LEVELS = ['', 'سهل', 'متوسط', 'صعب'];
const norm = s => stripHarakat(String(s || '')).toLowerCase().trim();
const lessonBy = id => LESSONS.find(l => l.id === id);
const inSection = sid => LESSONS.filter(l => l.section === sid);

function secArt(k, s = 64) {
  const A = {
    games: '<rect x="10" y="20" width="44" height="30" rx="12" fill="#1236A0"/><circle cx="22" cy="35" r="4" fill="#fff"/><rect x="38" y="31" width="10" height="3" rx="1.5" fill="#E2C171"/><rect x="41.5" y="27.5" width="3" height="10" rx="1.5" fill="#E2C171"/><text x="32" y="17" text-anchor="middle" font-size="14" font-weight="800" fill="#C8174D" font-family="Baloo Bhaijaan 2">أ</text>',
    letters: '<path d="M14 54V24a18 18 0 0 1 36 0v30z" fill="#C8174D"/><text x="32" y="46" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="Baloo Bhaijaan 2">ب</text>',
    sight: '<ellipse cx="32" cy="32" rx="24" ry="14" fill="#fff" stroke="#2F7A62" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="#2F7A62"/><circle cx="35" cy="29" r="2.5" fill="#fff"/>',
    exercises: '<rect x="14" y="10" width="36" height="46" rx="5" fill="#FBF7F0" stroke="#C9A24B" stroke-width="3"/><path d="M21 24l4 4 8-8M21 40l4 4 8-8" stroke="#2F7A62" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M37 26h7M37 42h7" stroke="#0C2470" stroke-width="3" stroke-linecap="round"/>',
    worksheets: '<rect x="12" y="8" width="40" height="50" rx="4" fill="#fff" stroke="#7A3E1D" stroke-width="3"/><path d="M20 22h24M20 32h24M20 42h14" stroke="#7A3E1D" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M44 40l6-12 4 2-6 12-5 2z" fill="#C8174D"/>',
    listening: '<path d="M16 38v-6a16 16 0 0 1 32 0v6" stroke="#6B4FA0" stroke-width="5" fill="none"/><rect x="11" y="36" width="11" height="16" rx="4" fill="#6B4FA0"/><rect x="42" y="36" width="11" height="16" rx="4" fill="#6B4FA0"/>',
    grammar: '<rect x="10" y="16" width="20" height="14" rx="4" fill="#0C2470"/><rect x="34" y="16" width="20" height="14" rx="4" fill="#C9A24B"/><rect x="18" y="36" width="28" height="14" rx="4" fill="#C8174D"/><path d="M20 30l6 6M44 30l-6 6" stroke="#0C2470" stroke-width="2.5"/>',
    stories: '<path d="M32 16c-8-5-16-6-22-4v38c6-2 14-1 22 4 8-5 16-6 22-4V12c-6-2-14-1-22 4z" fill="#FBF7F0" stroke="#C8174D" stroke-width="3"/><path d="M32 16v38" stroke="#C8174D" stroke-width="3"/>',
    texts: '<rect x="10" y="12" width="44" height="40" rx="6" fill="#DDEBE3" stroke="#2F7A62" stroke-width="3"/><path d="M18 22h28M18 30h28M18 38h20" stroke="#2F7A62" stroke-width="3" stroke-linecap="round"/>',
    world: '<path d="M8 52h48" stroke="#2F7A62" stroke-width="4"/><path d="M14 52V34h12v18z" fill="#F2EADC" stroke="#0C2470" stroke-width="2"/><path d="M28 52V30a8 8 0 0 1 16 0v22z" fill="#1236A0"/><circle cx="36" cy="18" r="3" fill="#C9A24B"/><rect x="46" y="40" width="10" height="12" rx="2" fill="#C9A24B" stroke="#7A3E1D" stroke-width="2"/>',
  };
  return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${A[k]}</svg>`;
}
function secProgress(sid) {
  const list = sid === 'letters' ? inSection('letters') : inSection(sid);
  const got = list.reduce((a, l) => a + (S.stars[l.id] || 0), 0), max = list.length * 3;
  return { got, max, pct: max ? Math.round(got / max * 100) : 0, n: list.length, done: list.filter(l => S.stars[l.id]).length };
}
const starRow = n => `<span class="stars3">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
function lessonCard(l, back) {
  const st = S.stars[l.id] || 0, glyph = l.letter || stripHarakat(l.title).replace(/[^ء-ي]/g, '')[0] || '؟';
  return `<button class="lcard" data-play="${esc(l.id)}" data-back="${esc(back)}" style="--c:${ENGINE_COLOR[l.engine] || '#1236A0'}">
    <span class="lc-art"><b>${esc(glyph)}</b></span><span class="lc-body"><span class="lc-t">${esc(l.title)}</span>
    <span class="lc-m"><span class="pill">${ENGINE_LABEL[l.engine] || l.engine}</span>${l.level ? `<span class="pill soft">${LEVELS[l.level]}</span>` : ''}${l.mastery ? '<span class="pill gold">اختبار إتقان</span>' : ''}${l.fromFactory ? '<span class="pill soft">من المصنع</span>' : ''}</span></span>${starRow(st)}</button>`;
}
function bindCards() {
  document.querySelectorAll('[data-play]').forEach(b => { if (b.closest('.shopgrid')) return; b.onclick = () => { SFX.tap(); playBack = b.dataset.back || location.hash.slice(1); location.hash = 'play-' + b.dataset.play; }; });
}
let playBack = 'home';

/* ---------- home ---------- */
function viewHome() {
  const last = S.last && lessonBy(S.last);
  const nStars = Object.values(S.stars).reduce((a, b) => a + b, 0);
  const asg = (S.assignments || []).map(a => ({ ...a, l: lessonBy(a.lesson) })).filter(a => a.l);
  return `<section class="hero"><div class="hero-txt"><p class="eyebrow">صلة التعليمية</p><h1>أَهْلًا يَا ${esc(childName())}!</h1><p>نتعلم العربية مع نور: نلعب ونقرأ ونسمع ونكتب.</p>
      <div class="row">${last ? `<button class="gbtn red" data-play="${esc(last.id)}" data-back="home">تابع: ${esc(last.title)}</button>` : `<button class="gbtn red" data-go="section-letters">ابدأ من الحروف</button>`}<button class="gbtn gold" data-go="world">مدينة صلة</button></div>
      <div class="hero-stats"><span>★ <b>${num(nStars)}</b> نجمة</span><span>${coinSVG(18)} <b>${num(S.coins)}</b></span><span>${ICONS.key} <b>${num(S.keys)}</b> مفتاح</span></div></div>
    <div class="hero-nour" data-say="أَهْلًا! أَنَا نُورٌ. هَيَّا نَتَعَلَّمُ مَعًا">${nourSVG('cheer')}<span class="bubble">المسني!</span></div></section>
  ${asg.length ? `<div class="card asg"><h3>مهام من معلمتك</h3>${asg.map(a => `<button class="asg-row" data-play="${esc(a.l.id)}" data-back="home"><span>${esc(a.l.title)}</span><span class="muted">حتى ${esc(a.due)}</span>${starRow(S.stars[a.l.id] || 0)}</button>`).join('')}</div>` : ''}
  <div class="secgrid">${SECTIONS.map(s => { const p = s.id === 'world' ? null : secProgress(s.id); return `<button class="seccard" data-go="${s.id === 'world' ? 'world' : 'section-' + s.id}" style="--c:${s.color}">
    <span class="sc-ic">${secArt(s.art, 56)}</span><span class="sc-t">${s.name}</span><span class="sc-s">${s.sub}</span>
    ${p ? `<span class="bar"><i style="width:${p.pct}%"></i></span><span class="sc-n">${s.id === 'worksheets' ? num(worksheetList().length) + ' ورقة متاحة' : num(p.n) + ' نشاطًا متاحًا'}</span>` : `<span class="sc-n">${num(S.chests.length)}/٤ صناديق</span>`}</button>`; }).join('')}
    <button class="seccard" data-go="shop" style="--c:#C9A24B"><span class="sc-ic">${shopIcon('boat', 56)}</span><span class="sc-t">الدكان</span><span class="sc-s">ألعاب مرح تفتحها بعملاتك</span><span class="sc-n">${num(S.owned.filter(x => SHOP.some(s => s.id === x)).length)}/٤ مفتوحة</span></button></div>`;
}
function childName() { return { mariam: 'مريم', yusuf: 'يوسف' }[S.child] || 'صديقي'; }

/* ---------- section views with search, filters and progress ---------- */
const UNIT_OF = l => l.section === 'games' ? (JOURNEYS[l.group] ? `الرحلة ${l.group + 1}: ${JOURNEYS[l.group][0]}` : 'رحلة') : l.section === 'sight' ? `المجموعة ${l.group + 1}` : (l.unit || l.topic || (l.level ? 'المستوى ' + LEVELS[l.level] : 'عام'));
let secFilter = { q: '', level: 0, engine: '', status: '' };
function viewSection(sid) {
  if (sid === 'letters') return viewLetters();
  if (sid === 'worksheets') return viewWorksheets();
  const s = SECTIONS.find(x => x.id === sid); if (!s) return viewHome();
  const all = inSection(sid), p = secProgress(sid);
  const engines = [...new Set(all.map(l => l.engine))];
  return `<button class="crumb" data-go="home">‹ الرئيسية</button>
  <div class="sec-head" style="--c:${s.color}"><span class="sc-ic">${secArt(s.art, 64)}</span><div class="grow"><h1>${s.name}</h1><p>${s.sub}</p>
    <div class="bar big"><i style="width:${p.pct}%"></i></div><p class="muted">${num(p.done)} من ${num(p.n)} أنشطة أُنجزت · ${num(p.got)} من ${num(p.max)} نجمة</p></div></div>
  <div class="filters"><input class="search" id="secQ" type="search" placeholder="ابحث في ${s.name}…" value="${esc(secFilter.q)}" aria-label="بحث في القسم">
    <div class="chips" role="group" aria-label="المستوى">${[0, 1, 2, 3].map(v => `<button class="chip ${secFilter.level === v ? 'on' : ''}" data-flevel="${v}">${v ? LEVELS[v] : 'كل المستويات'}</button>`).join('')}</div>
    ${engines.length > 1 ? `<div class="chips" role="group" aria-label="النوع"><button class="chip ${!secFilter.engine ? 'on' : ''}" data-feng="">كل الأنواع</button>${engines.map(e => `<button class="chip ${secFilter.engine === e ? 'on' : ''}" data-feng="${e}">${ENGINE_LABEL[e]}</button>`).join('')}</div>` : ''}
    <div class="chips" role="group" aria-label="الحالة">${[['', 'الكل'], ['new', 'لم أبدأ'], ['done', 'أنجزت'], ['todo', 'أقل من ٣ نجوم']].map(([v, n]) => `<button class="chip ${secFilter.status === v ? 'on' : ''}" data-fst="${v}">${n}</button>`).join('')}</div></div>
  ${s.id === 'games' ? refGamesBlock() : ''}
  <div id="secList"></div>
  <div class="card planned"><h3>قيد الإنتاج</h3><p>المتاح الآن <b>${num(all.length)}</b> نشاطًا نموذجيًا في هذا القسم. الهدف في خطة الإنتاج: <b>${num(s.target)}</b> ${s.unit}، وتُنتج عبر مصنع المحتوى بعد اعتماد جودة المحركات ومراجعة لغوية وتربوية. لا نعرض محتوى غير مكتمل على أنه جاهز.</p></div>`;
}
/* games rebuilt one by one against the reference, in the reference's order (tracker: docs/learn/GAMES_PRODUCTION_TRACKER.json) */
const REF_LIST = [{ g: 'letters-on-bushes', l: 'alef-ba', n: 1, title: 'التعرف على حرفي الألف والباء', group: 'حروف الألف والباء', state: 'بانتظار الاعتماد' }];
function refGamesBlock() {
  const done = S.refDone || {};
  return `<details class="unit" open><summary><span>الألعاب المطابقة للمرجع (${num(REF_LIST.length)})</span><span class="muted">تُبنى لعبةً لعبة</span></summary><div class="lgrid">${REF_LIST.map(r => `<a class="lcard" href="play.html?g=${r.g}&l=${r.l}&back=${encodeURIComponent('index.html#section-games')}"><span class="pill soft">${esc(r.group)} · الدرس ${num(r.n)}</span><b>${esc(r.title)}</b><span class="muted">${done['ref:' + r.g + ':' + r.l] ? '✓ أنجزت' : esc(r.state)}</span></a>`).join('')}</div></details>`;
}
function renderSecList(sid) {
  const f = secFilter, q = norm(f.q);
  const list = inSection(sid).filter(l => (!f.level || l.level === f.level) && (!f.engine || l.engine === f.engine)
    && (!f.status || (f.status === 'new' ? !S.stars[l.id] : f.status === 'done' ? S.stars[l.id] : (S.stars[l.id] || 0) < 3))
    && (!q || norm(l.title + ' ' + (l.letter ? NAMES[l.letter] : '') + ' ' + UNIT_OF(l)).includes(q)));
  const groups = {}; list.forEach(l => (groups[UNIT_OF(l)] = groups[UNIT_OF(l)] || []).push(l));
  const box = $('secList'); if (!box) return;
  box.innerHTML = list.length ? Object.entries(groups).map(([g, ls], gi) => `<details class="unit" ${gi < 3 || q ? 'open' : ''}><summary><span>${esc(g)}</span><span class="muted">${num(ls.filter(l => S.stars[l.id]).length)}/${num(ls.length)}</span></summary><div class="lgrid">${ls.map(l => lessonCard(l, 'section-' + sid)).join('')}</div></details>`).join('')
    : `<div class="empty">${nourSVG('sad')}<p>لا توجد أنشطة تطابق البحث أو المرشحات.</p></div>`;
  if (sid === 'games') { const empty = JOURNEYS.map((j, i) => [j, i]).filter(([, i]) => !inSection('games').some(l => l.group === i)); if (empty.length && !q && !f.engine && !f.status) box.insertAdjacentHTML('beforeend', `<details class="unit"><summary><span>رحلات قيد الإنتاج (${num(empty.length)})</span></summary><ul class="planned-list">${empty.map(([j, i]) => `<li>الرحلة ${num(i + 1)}: ${esc(j[0])} <span class="pill soft">قيد الإنتاج</span></li>`).join('')}</ul></details>`); }
  bindCards();
}
function bindSection(sid) {
  const q = $('secQ'); if (q) q.oninput = () => { secFilter.q = q.value; renderSecList(sid); };
  document.querySelectorAll('[data-flevel]').forEach(b => b.onclick = () => { secFilter.level = +b.dataset.flevel; route(); });
  document.querySelectorAll('[data-feng]').forEach(b => b.onclick = () => { secFilter.engine = b.dataset.feng; route(); });
  document.querySelectorAll('[data-fst]').forEach(b => b.onclick = () => { secFilter.status = b.dataset.fst; route(); });
  renderSecList(sid);
}

/* ---------- letters ---------- */
function viewLetters() {
  const p = secProgress('letters');
  return `<button class="crumb" data-go="home">‹ الرئيسية</button>
  <div class="sec-head" style="--c:#C8174D"><span class="sc-ic">${secArt('letters', 64)}</span><div class="grow"><h1>الحروف</h1><p>المس حرفًا لتسمعه وتفتح دروسه وألعابه.</p><div class="bar big"><i style="width:${p.pct}%"></i></div></div></div>
  <div class="lettergrid">${AR.map(l => { const has = WORDS[l], st = S.stars['lesson-' + l] || 0; return `<button class="letter ${has ? '' : 'soon'}" ${has ? `data-go="letter-${l}"` : `data-say="${NAMES[l]}"`} aria-label="${NAMES[l]}"><b>${l}</b><small>${has ? starRow(st) : 'قيد الإنتاج'}</small></button>`; }).join('')}</div>
  <p class="muted">${num(LETTERS_WITH_CONTENT.length)} حرفًا لها دروس وألعاب كاملة الآن، والباقي قيد الإنتاج بالمحركات نفسها.</p>`;
}
function viewLetter(l) {
  if (!WORDS[l]) return viewLetters();
  const acts = LESSONS.filter(x => x.letter === l), f = forms(l);
  return `<button class="crumb" data-go="section-letters">‹ الحروف</button>
  <div class="letterhero"><div class="lh-big" data-say="${NAMES[l]}">${l}</div><div><h1>حرف ${NAMES[l]}</h1>
    <div class="forms">${[['iso', 'منفصل'], ['ini', 'أول'], ['med', 'وسط'], ['fin', 'آخر']].map(([k, n]) => `<span><b>${f[k]}</b><small>${n}</small></span>`).join('')}</div>
    <div class="row">${WORDS[l].map(w => `<button class="chip" data-say="${w}">${w}</button>`).join('')}</div>
    <div class="row"><button class="gbtn" data-go="sheet-${l}">ورقة عمل للطباعة</button></div></div></div>
  <div class="lgrid">${acts.map(a => lessonCard(a, 'letter-' + l)).join('')}</div>`;
}

/* ---------- worksheets (printable) ---------- */
function worksheetList() { return [...LETTERS_WITH_CONTENT.map(l => ({ id: l, title: `ورقة حرف ${NAMES[l]}`, kind: 'letter' })), ...SIGHT_GROUPS.map((g, i) => ({ id: 'sight' + i, title: `ورقة الكلمات البصرية ${i + 1}`, kind: 'sight' }))]; }
function viewWorksheets() {
  const ws = worksheetList();
  return `<button class="crumb" data-go="home">‹ الرئيسية</button>
  <div class="sec-head" style="--c:#7A3E1D"><span class="sc-ic">${secArt('worksheets', 64)}</span><div class="grow"><h1>أوراق العمل</h1><p>أوراق تُطبع للكتابة باليد: تتبّع، الحرف الأول، تلوين، قراءة.</p></div></div>
  <input class="search" id="wsQ" type="search" placeholder="ابحث في الأوراق…" aria-label="بحث في الأوراق">
  <div class="lgrid" id="wsList">${ws.map(w => `<button class="lcard" data-go="sheet-${w.id}" data-n="${esc(norm(w.title))}" style="--c:#7A3E1D"><span class="lc-art"><b>${w.kind === 'letter' ? w.id : 'ك'}</b></span><span class="lc-body"><span class="lc-t">${esc(w.title)}</span><span class="lc-m"><span class="pill">للطباعة</span></span></span></button>`).join('')}</div>
  <div class="card planned"><h3>قيد الإنتاج</h3><p>متاح الآن ${num(ws.length)} ورقة مولّدة من بيانات الدروس. الهدف ٩٥٦ ورقة. التلوين التفاعلي على الشاشة متاح داخل دروس الكتابة (التتبّع).</p></div>`;
}
function viewSheet(id) {
  const isL = !!WORDS[id], g = !isL && SIGHT_GROUPS[+String(id).replace('sight', '')];
  if (!isL && !g) return viewWorksheets();
  const body = isL ? `<h2>حرف ${NAMES[id]}</h2>
      <h3>١. تتبّع الحرف بقلمك</h3><div class="trace-row">${Array(8).fill(`<span class="dotted">${id}</span>`).join('')}</div>
      <h3>٢. اكتب أشكال الحرف</h3><div class="trace-row">${formSet(id).map(x => `<span class="dotted sm">${x}</span><span class="blank"></span>`).join('')}</div>
      <h3>٣. ضع دائرة حول الكلمة التي تبدأ بحرف ${NAMES[id]}</h3><div class="ws-words">${shuffle([...WORDS[id].slice(0, 3), ...shuffle(wordsNotStarting(id)).slice(0, 3)]).map(w => `<span>${w}</span>`).join('')}</div>
      <h3>٤. لوّن الحرف</h3><div class="color-letter">${id}</div>`
    : `<h2>الكلمات البصرية: المجموعة ${+id.replace('sight', '') + 1}</h2><h3>١. اقرأ الكلمات بصوت عالٍ</h3><div class="ws-words">${g.map(w => `<span>${w}</span>`).join('')}</div>
      <h3>٢. انسخ كل كلمة</h3><div class="copy-grid">${g.map(w => `<span>${w}</span><span class="blank wide"></span>`).join('')}</div>`;
  return `<div class="noprint row"><button class="crumb" data-go="${isL ? 'letter-' + id : 'section-worksheets'}">‹ رجوع</button><button class="gbtn" onclick="print()">اطبع الورقة</button></div>
  <article class="sheet"><header><img src="${LOGO}" alt="" width="44" height="44"><div><b>صلة التعليمية</b><small>الاسم: ................................ التاريخ: ............</small></div></header>${body}<footer>ورقة عمل من صلة · للاستخدام التعليمي</footer></article>`;
}

/* ---------- global search (diacritics-insensitive) ---------- */
function viewSearch(q) {
  const n = norm(q);
  const hits = n ? LESSONS.filter(l => norm([l.title, l.prompt, l.letter && NAMES[l.letter], (l.words || []).join(' '), UNIT_OF(l), ENGINE_LABEL[l.engine]].join(' ')).includes(n)) : [];
  const letters = n ? AR.filter(l => norm(NAMES[l]).includes(n) || l === n) : [];
  return `<button class="crumb" data-go="home">‹ الرئيسية</button><h1>نتائج البحث عن «${esc(q)}»</h1>
  ${letters.length ? `<div class="row">${letters.map(l => `<button class="letter mini ${WORDS[l] ? '' : 'soon'}" ${WORDS[l] ? `data-go="letter-${l}"` : ''}><b>${l}</b></button>`).join('')}</div>` : ''}
  ${hits.length ? `<p class="muted">${num(hits.length)} نشاطًا</p><div class="lgrid">${hits.slice(0, 60).map(l => lessonCard(l, 'search-' + q)).join('')}</div>` : `<div class="empty">${nourSVG('sad')}<p>لم نجد شيئًا. جرّب اسم حرف (مثل «الباء») أو كلمة (مثل «جمل»).</p></div>`}`;
}

/* ---------- parent ---------- */
function viewParent() {
  const recent = Object.entries(S.best).sort((a, b) => b[1].at - a[1].at).slice(0, 8).map(([id, r]) => ({ l: lessonBy(id), r })).filter(x => x.l);
  const locked = shopLocked();
  return `<h1>لوحة وليّ الأمر</h1><p class="muted">بيانات تجريبية لطفل وهمي «${esc(childName())}» محفوظة في هذا المتصفح فقط.</p>
  <div class="kpis"><div class="kpi"><b>${num(Object.values(S.stars).reduce((a, b) => a + b, 0))}</b><span>نجمة</span></div><div class="kpi"><b>${num(Object.keys(S.stars).length)}</b><span>نشاطًا منجزًا</span></div><div class="kpi"><b>${num(S.coins)}</b><span>عملة</span></div><div class="kpi"><b>${num(Math.round(shopUsedSec() / 60))}</b><span>دقيقة لعب في الدكان اليوم</span></div></div>
  <div class="cols2"><div class="card"><h3>التقدم حسب القسم</h3>${SECTIONS.filter(s => !['world', 'worksheets'].includes(s.id)).map(s => { const p = secProgress(s.id); return `<div class="prow"><span>${s.name}</span><span class="bar"><i style="width:${p.pct}%;background:${s.color}"></i></span><b>${num(p.pct)}٪</b></div>`; }).join('')}</div>
    <div class="card"><h3>آخر النتائج</h3>${recent.length ? `<ul class="res">${recent.map(({ l, r }) => `<li><span>${esc(l.title)}</span>${starRow(S.stars[l.id] || 0)}<small>صح ${num(r.correct)} · خطأ ${num(r.wrong)}</small></li>`).join('')}</ul>` : '<p class="muted">لا نتائج بعد.</p>'}</div></div>
  <div class="card"><h3>ضبط الدكان</h3>
    <p>${locked ? `🔒 مقفل حتى ${esc(fmtTime(S.shopLockUntil))}` : 'الدكان مفتوح'}</p>
    <div class="row"><button class="gbtn sm" data-lock="60">اقفل ساعة</button><button class="gbtn sm" data-lock="180">اقفل ٣ ساعات</button><button class="gbtn sm" data-lock="tomorrow">اقفل حتى الغد</button><button class="gbtn ghost sm" data-lock="0" ${locked ? '' : 'disabled'}>افتح الآن</button></div>
    <label class="field">حد اللعب اليومي في الدكان <select id="dailyMin">${[[0, 'بلا حد'], [10, '١٠ دقائق'], [20, '٢٠ دقيقة'], [30, '٣٠ دقيقة'], [45, '٤٥ دقيقة']].map(([v, n]) => `<option value="${v}" ${(S.shopDailyMin ?? 20) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" id="allowBuy" ${S.allowBuy === false ? '' : 'checked'}> السماح بفتح ألعاب جديدة بالعملات</label></div>
  <div class="card"><h3>قواعد العملات (لكل نجمة جديدة)</h3><p class="muted">المكافأة = (النجوم الجديدة فوق أفضل نتيجة سابقة) × القيمة. إعادة اللعب لا تمنح عملات مكررة.</p>
    <div class="rules">${RULE_KEYS.map(k => `<label class="field">${(SECTIONS.find(s => s.id === k) || { name: k }).name}<input type="number" min="0" max="5" step="1" data-rule="${k}" value="${S.rules[k]}"></label>`).join('')}</div>
    <p class="muted">في الإنتاج تُقرأ هذه القيم من إعدادات وليّ الأمر وتتحقق منها قواعد Firestore (انظر المراجعة الأمنية). الحد الأعلى ٥ لمنع التضخم.</p></div>
  <div class="card"><h3>الاشتراك</h3><p>الحالة في هذا النموذج: <span class="pill">تجريبي</span>. في الإنتاج يُقرأ من حساب الأسرة في صلة ولا يُخزن في جهاز الطفل.</p></div>
  <div class="card"><h3>وضع الطفل</h3><p class="muted">سؤال الحساب عند الخروج من وضع الطفل يمنع اللمس العرضي فقط، وليس حدًا أمنيًا. الحماية الحقيقية: تسجيل دخول وليّ الأمر في صلة وقواعد الخادم.</p>
    <div class="row"><button class="gbtn red sm" id="kidOn">شغّل وضع الطفل</button><button class="gbtn ghost sm" id="resetAll">امسح بيانات النموذج</button></div></div>`;
}
function bindParent() {
  document.querySelectorAll('[data-lock]').forEach(b => b.onclick = () => { const v = b.dataset.lock; if (v === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); S.shopLockUntil = +d; } else S.shopLockUntil = +v ? Date.now() + +v * 60000 : 0; saveState(); toast(S.shopLockUntil ? 'قُفل الدكان' : 'فُتح الدكان'); route(); });
  $('dailyMin').onchange = e => { S.shopDailyMin = +e.target.value; saveState(); toast('حُفظ حد اللعب'); };
  $('allowBuy').onchange = e => { S.allowBuy = e.target.checked; saveState(); };
  document.querySelectorAll('[data-rule]').forEach(i => i.onchange = () => { S.rules[i.dataset.rule] = Math.max(0, Math.min(5, Math.round(+i.value || 0))); i.value = S.rules[i.dataset.rule]; saveState(); toast('حُفظت قاعدة العملات'); });
  $('kidOn').onclick = () => setRole('child');
  $('resetAll').onclick = () => { resetState(); refreshLessons(); renderWallet(); toast('مُسحت بيانات النموذج'); setRole('parent'); };
}

/* ---------- teacher ---------- */
const CLASS = [{ id: 'mariam', name: 'مريم' }, { id: 's2', name: 'يوسف' }, { id: 's3', name: 'سلمى' }, { id: 's4', name: 'آدم' }];
function weakPoints() {
  const byLetter = {};
  Object.entries(S.best).forEach(([id, r]) => { const l = lessonBy(id); if (!l) return; const k = l.letter ? 'حرف ' + NAMES[l.letter] : UNIT_OF(l); const o = byLetter[k] = byLetter[k] || { c: 0, w: 0 }; o.c += r.correct; o.w += r.wrong; });
  return Object.entries(byLetter).map(([k, o]) => ({ k, acc: o.c / Math.max(1, o.c + o.w), ...o })).filter(x => x.w > 0).sort((a, b) => a.acc - b.acc).slice(0, 6);
}
function viewTeacher() {
  const wp = weakPoints();
  return `<h1>لوحة المعلمة</h1><p class="muted">فصل تجريبي بأسماء وهمية. نتائج «مريم» هي نتائج هذا المتصفح، والباقي أمثلة ثابتة للعرض.</p>
  <div class="cols2"><div class="card"><h3>إسناد نشاط</h3>
    <label class="field">النشاط <select id="asgL">${LESSONS.map(l => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}</select></label>
    <label class="field">إلى <select id="asgTo"><option>كل الفصل</option>${CLASS.map(c => `<option>${c.name}</option>`).join('')}</select></label>
    <label class="field">آخر موعد <input type="date" id="asgDue" value="${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}"></label>
    <button class="gbtn red" id="asgAdd">أسند</button>
    <h3>المهام الحالية</h3><ul class="res">${(S.assignments || []).map((a, i) => { const l = lessonBy(a.lesson); return `<li><span>${esc(l ? l.title : a.lesson)}</span><small>${esc(a.to)} · ${esc(a.due)}</small><button class="iconbtn sm" data-del="${i}" aria-label="حذف">✕</button></li>`; }).join('') || '<li class="muted">لا مهام</li>'}</ul></div>
    <div class="card"><h3>نقاط الضعف</h3>${wp.length ? wp.map(x => `<div class="prow"><span>${esc(x.k)}</span><span class="bar"><i style="width:${Math.round(x.acc * 100)}%;background:${x.acc < .7 ? '#C8174D' : '#C9A24B'}"></i></span><b>${num(Math.round(x.acc * 100))}٪</b></div>`).join('') : '<p class="muted">لا أخطاء مسجلة بعد. تظهر هنا المهارات الأقل دقة.</p>'}
    <h3>الفصل</h3><table class="tbl"><thead><tr><th>الطالب</th><th>نجوم</th><th>آخر نشاط</th></tr></thead><tbody>${CLASS.map((c, i) => `<tr><td>${c.name}</td><td>${num(i === 0 ? Object.values(S.stars).reduce((a, b) => a + b, 0) : [0, 14, 22, 9][i])}</td><td>${i === 0 ? (S.last && lessonBy(S.last) ? esc(lessonBy(S.last).title) : '—') : ['', 'نجوم الباء', 'الهدهد والنخلة', 'تعرّف حرف التاء'][i]}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function bindTeacher() {
  $('asgAdd').onclick = () => { S.assignments = S.assignments || []; S.assignments.push({ lesson: $('asgL').value, to: $('asgTo').value, due: $('asgDue').value }); saveState(); toast('أُسند النشاط'); route(); };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.assignments.splice(+b.dataset.del, 1); saveState(); route(); });
}

/* ---------- certificate (mastery) ---------- */
function viewCert(id) {
  const l = lessonBy(id), st = S.stars[id] || 0;
  if (!l || !l.mastery || st < 2) return `<button class="crumb" data-go="home">‹ الرئيسية</button><div class="empty"><p>الشهادة تظهر بعد اجتياز اختبار الإتقان بنجمتين على الأقل.</p></div>`;
  return `<div class="noprint row"><button class="crumb" data-go="section-${l.section}">‹ رجوع</button><button class="gbtn" onclick="print()">اطبع الشهادة</button></div>
  <article class="cert"><div class="cert-in"><img src="${LOGO}" alt="" width="64" height="64"><p class="eyebrow">صلة التعليمية</p><h1>شهادة إتقان</h1><p>تشهد صلة بأنّ</p><h2>${esc(childName())}</h2><p>أتقن «${esc(l.title)}»</p>
    <div class="bigstars static">${[1, 2, 3].map(i => `<span class="${i <= st ? 'on' : ''}">★</span>`).join('')}</div><p class="muted">${new Date((S.best[id] || {}).at || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p><div class="nour-sm">${nourSVG('cheer')}</div></div></article>`;
}

/* ---------- roles and kid mode ---------- */
function setRole(r) { S.role = r; saveState(); renderTop(); location.hash = r === 'parent' ? 'parent' : r === 'teacher' ? 'teacher' : r === 'admin' ? 'admin' : 'home'; route(); }
function kidGate() {
  const a = 3 + (Math.random() * 6 | 0), b = 4 + (Math.random() * 5 | 0);
  const o = document.createElement('div'); o.className = 'overlay fixed'; o.id = 'gate';
  o.innerHTML = `<div class="panel pop"><h2>للكبار فقط</h2><p>كم يساوي ${num(a)} × ${num(b)}؟</p><input class="search" id="gateA" inputmode="numeric" aria-label="الجواب" autocomplete="off">
    <div class="row center"><button class="gbtn red" data-r="parent">وليّ الأمر</button><button class="gbtn" data-r="teacher">المعلمة</button><button class="gbtn" data-r="admin">المحتوى</button></div><button class="gbtn ghost sm" id="gateX">إلغاء</button>
    <p class="muted">هذا السؤال يمنع اللمس العرضي فقط، وليس حماية أمنية.</p></div>`;
  document.body.appendChild(o); $('gateA').focus();
  $('gateX').onclick = () => o.remove();
  o.querySelectorAll('[data-r]').forEach(btn => btn.onclick = () => { const v = +String($('gateA').value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); if (v === a * b) { o.remove(); setRole(btn.dataset.r); } else { SFX.bad(); const g = $('gateA'); g.classList.add('shake'); setTimeout(() => g.classList.remove('shake'), 400); } });
  window.__gate = a * b;
}
function renderTop() {
  const r = S.role || 'child';
  document.body.dataset.role = r;
  const rb = $('roleBtn'); if (rb) rb.textContent = r === 'child' ? 'للكبار' : 'وضع الطفل';
  const nav = $('adultNav'); if (nav) nav.hidden = r === 'child';
  renderWallet();
}

/* ---------- router ---------- */
let stopWorld = null;
function route() {
  if (stopGame) { stopGame(); stopGame = null; } if (stopWorld) { stopWorld(); stopWorld = null; } hush(); window.__eng = null;
  const h = decodeURIComponent(location.hash.slice(1) || 'home'), v = $('view');
  const adult = ['parent', 'teacher', 'admin'];
  if (adult.some(a => h === a || h.startsWith(a + '-')) && S.role === 'child') { location.hash = 'home'; return; }
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', h === a.dataset.nav || h.startsWith(a.dataset.nav + '-')));
  let after = null;
  if (h.startsWith('play-')) { const l = lessonBy(h.slice(5)); if (!l) { v.innerHTML = '<div class="empty"><p>النشاط غير موجود.</p></div>'; return; } S.last = l.id; saveState(); runLesson(l, { back: playBack && playBack !== h ? playBack : undefined }); return; }
  if (h.startsWith('section-')) { const sid = h.slice(8); if (route.lastSec !== sid) secFilter = { q: '', level: 0, engine: '', status: '' }; route.lastSec = sid; v.innerHTML = viewSection(sid); if (!['letters', 'worksheets'].includes(sid)) after = () => bindSection(sid); if (sid === 'worksheets') after = () => { $('wsQ').oninput = e => { const q = norm(e.target.value); document.querySelectorAll('#wsList .lcard').forEach(c => c.hidden = q && !c.dataset.n.includes(q)); }; }; }
  else if (h.startsWith('letter-')) v.innerHTML = viewLetter(h.slice(7));
  else if (h.startsWith('sheet-')) v.innerHTML = viewSheet(h.slice(6));
  else if (h.startsWith('search-')) { v.innerHTML = viewSearch(h.slice(7)); }
  else if (h.startsWith('cert-')) v.innerHTML = viewCert(h.slice(5));
  else if (h === 'world') { v.innerHTML = viewWorld(); after = () => { stopWorld = startWorld(); }; }
  else if (h === 'shop') { v.innerHTML = viewShop(); after = bindShop; }
  else if (h === 'parent') { v.innerHTML = viewParent(); after = bindParent; }
  else if (h === 'teacher') { v.innerHTML = viewTeacher(); after = bindTeacher; }
  else if (h === 'admin' || h.startsWith('admin-')) { v.innerHTML = viewFactory(); after = bindFactory; }
  else v.innerHTML = viewHome();
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  bindNav(); bindCards(); after && after(); renderWallet();
  window.scrollTo(0, 0);
}

/* ---------- boot ---------- */
function boot() {
  refreshLessons(); renderTop();
  const sb = $('searchBox'); if (sb) sb.addEventListener('keydown', e => { if (e.key === 'Enter' && sb.value.trim()) { location.hash = 'search-' + sb.value.trim(); sb.blur(); } });
  $('roleBtn').onclick = () => S.role === 'child' ? kidGate() : setRole('child');
  addEventListener('hashchange', route);
  route();
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { };
}
