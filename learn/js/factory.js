'use strict';
/* Content factory (مصنع المحتوى): build an activity for any engine with forms, no code.
   Preview runs the real engine (no coins). Drafts: create, edit, save, version history + restore, delete, publish, import/export JSON.
   Local only in this prototype (localStorage). Production target: learnDrafts -> review -> learnLessons (see SILAH_LEARN_PLAN.md). */

const SCENES = ['room', 'path', 'lost', 'home', 'thanks', 'oasis', 'wind', 'friends', 'build', 'happy'];
const F_COMMON = [
  { k: 'title', label: 'عنوان النشاط', type: 'text', req: true },
  { k: 'prompt', label: 'التعليمات المسموعة للطفل', type: 'text', req: true },
  { k: 'section', label: 'القسم', type: 'select', opts: RULE_KEYS.map(k => [k, ({ games: 'ألعاب الحروف', letters: 'الحروف', sight: 'الكلمات البصرية', exercises: 'التمارين', listening: 'الاستماع', grammar: 'القواعد', stories: 'القصص', texts: 'النصوص' })[k]]) },
  { k: 'level', label: 'المستوى', type: 'select', opts: [['1', 'سهل'], ['2', 'متوسط'], ['3', 'صعب']] },
];
const TL = { k: 'targets', label: 'الإجابات الصحيحة (افصل بفاصلة)', type: 'list', req: true };
const DL = { k: 'distractors', label: 'المشتتات (افصل بفاصلة)', type: 'list', req: true };
const GOAL = { k: 'goal', label: 'عدد الإصابات للفوز', type: 'number', min: 3, max: 20 };
const FACTORY = {
  catch: { fields: [TL, DL, GOAL], sample: { title: 'نجوم الجيم', prompt: 'اجْمَعِ النُّجُومَ الَّتِي تَحْمِلُ حَرْفَ الجِيم', section: 'games', level: '1', targets: 'ج، جـ، ـجـ، ـج', distractors: 'ح، خ، د، ر', goal: 8 } },
  jump: { fields: [TL, DL, GOAL, { k: 'listen', label: 'وضع الاستماع: الطفل يسمع الكلمة ولا يقرؤها', type: 'check' }], sample: { title: 'قفز الحاء', prompt: 'اقْفِزْ إِلَى كَلِمَةٍ تَبْدَأُ بِحَرْفِ الحَاء', section: 'games', level: '1', targets: 'حِصَان، حَدِيقَة، حَلِيب، حُوت', distractors: 'خُبْز، جَمَل، دِيك، بَاب', goal: 5 } },
  whack: { fields: [TL, DL, GOAL], sample: { title: 'نوافذ الدال', prompt: 'المَسِ الهُدْهُدَ الَّذِي يَحْمِلُ حَرْفَ الدَّال', section: 'games', level: '2', targets: 'د، ـد', distractors: 'ذ، ر، ز، و', goal: 8 } },
  seek: { fields: [{ k: 'mode', label: 'الشكل', type: 'select', opts: [['trees', 'نخيل تتبدل مواقعها'], ['grid', 'شبكة خانات']] }, TL, DL, GOAL], sample: { title: 'ابحث عن الراء', prompt: 'المَسِ النَّخْلَةَ الَّتِي عَلَيْهَا حَرْفُ الرَّاء', section: 'games', level: '1', mode: 'trees', targets: 'ر، ـر', distractors: 'ز، د، و، ذ', goal: 6 } },
  race: { fields: [TL, DL, GOAL], sample: { title: 'سباق السين', prompt: 'قُدِ العَرَبَةَ إِلَى كَلِمَةٍ تَبْدَأُ بِحَرْفِ السِّين', section: 'games', level: '2', targets: 'سَمَكَة، سَمَاء، سَاعَة، سُلَّم', distractors: 'شَمْس، صَقْر، زَيْت، ثَوْب', goal: 6 } },
  drag: { fields: [{ k: 'mode', label: 'النوع', type: 'select', opts: [['sort', 'تصنيف في سلال'], ['build', 'تركيب كلمة من حروف'], ['sentence', 'ترتيب جملة']] },
    { k: 'bins', label: 'السلال (للتصنيف): سطر لكل سلة «الاسم: عنصر، عنصر»', type: 'lines' }, { k: 'words', label: 'الكلمات (للتركيب، بفاصلة)', type: 'list' }, { k: 'sentences', label: 'الجمل (للترتيب): سطر لكل جملة', type: 'lines' }],
    sample: { title: 'صنّف الحاء والخاء', prompt: 'اسْحَبْ كُلَّ شَكْلٍ إِلَى فَانُوسِ حَرْفِهِ', section: 'games', level: '1', mode: 'sort', bins: 'ح: ح، حـ، ـحـ، ـح\nخ: خ، خـ، ـخـ، ـخ', words: 'خُبْز، خَيْمَة', sentences: 'الوَلَدُ يَقْرَأُ' } },
  memory: { fields: [{ k: 'pairs', label: 'الأزواج: سطر لكل زوج «أ = كلمة»', type: 'lines', req: true }], sample: { title: 'ذاكرة الثاء والجيم', prompt: 'طَابِقْ كُلَّ كَلِمَةٍ بِحَرْفِهَا الأَوَّلِ', section: 'games', level: '1', pairs: 'ث = ثَوْب\nث = ثَلْج\nج = جَمَل\nج = جَبَل' } },
  listen: { fields: [{ k: 'mode', label: 'النوع', type: 'select', opts: [['word', 'اسمع الكلمة'], ['letter', 'اسمع الحرف'], ['riddle', 'لغز / فهم مسموع'], ['flash', 'لمحة سريعة']] }, { k: 'items', label: 'الأسئلة: سطر لكل سؤال «المسموع | الجواب | خيار، خيار»', type: 'lines', req: true }],
    sample: { title: 'ماذا تسمع؟', prompt: 'اسْتَمِعْ ثُمَّ اخْتَرْ', section: 'listening', level: '1', mode: 'riddle', items: 'أَنَا أُضِيءُ فِي اللَّيْلِ وَأَنَا فِي السَّمَاءِ | قَمَر | شَمْس، بَيْت\nأَنَا أَطِيرُ وَأُغَرِّدُ | عُصْفُور | سَمَكَة، جَمَل' } },
  lesson: { fields: [{ k: 'letter', label: 'الحرف', type: 'select', opts: AR.map(l => [l, l + ' ' + NAMES[l]]) }, { k: 'words', label: 'كلمات تبدأ بالحرف (بفاصلة)', type: 'list', req: true }], sample: { title: 'تعرّف حرف الصاد', prompt: 'هَيَّا نَتَعَرَّفُ عَلَى حَرْفِ الصَّاد', section: 'letters', level: '1', letter: 'ص', words: 'صَقْر، صَابُون، صُنْدُوق، صَحْن' } },
  exercise: { fields: [{ k: 'passage', label: 'نص للقراءة (اختياري)', type: 'textarea' }, { k: 'items', label: 'الأسئلة: mcq: سؤال | جواب | خيار، خيار — tf: عبارة | صح — trace: ب — cat: فئة١، فئة٢ | كلمة=١، كلمة=٢', type: 'lines', req: true }],
    sample: { title: 'المفرد والجمع', prompt: 'اخْتَرِ الإِجَابَةَ', section: 'grammar', level: '2', passage: '', items: 'mcq: جَمْعُ «قَلَم» | أَقْلَام | قَلَمَان، قَلَمِي\ntf: «أَوْلَاد» جَمْعُ «وَلَد» | صح\ncat: مُفْرَد، جَمْع | بَيْت=١، بُيُوت=٢، كِتَاب=١، كُتُب=٢\ntrace: ج' } },
  story: { fields: [{ k: 'pages', label: 'الصفحات: سطر لكل صفحة «المشهد | النص» — المشاهد: ' + SCENES.join('، '), type: 'lines', req: true }, { k: 'questions', label: 'أسئلة الفهم (بصيغة التمارين)', type: 'lines' }],
    sample: { title: 'نور في الواحة', prompt: 'اقْرَأْ وَاسْتَمِعْ، وَابْحَثْ عَنِ الهِلَالِ', section: 'stories', level: '1', pages: 'oasis | ذَهَبَ نُورٌ إِلَى الوَاحَةِ.\nfriends | لَعِبَ مَعَ أَصْدِقَائِهِ.\nhappy | فَرِحَ الجَمِيعُ.', questions: 'mcq: أَيْنَ ذَهَبَ نُورٌ؟ | إِلَى الوَاحَةِ | إِلَى البَحْرِ، إِلَى السُّوقِ' } },
};
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const toNum = s => +String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
function parseItems(src, errs, where) {
  return lines(src).map((ln, i) => {
    const m = ln.match(/^(mcq|tf|trace|cat)\s*:\s*(.*)$/i); if (!m) { errs.push(`${where} سطر ${i + 1}: ابدأ بـ mcq أو tf أو trace أو cat`); return null; }
    const t = m[1].toLowerCase(), parts = m[2].split('|').map(x => x.trim());
    if (t === 'trace') { if (!AR.includes(parts[0])) errs.push(`${where} سطر ${i + 1}: حرف غير معروف`); return { type: 'trace', letter: parts[0] }; }
    if (t === 'tf') { if (parts.length < 2) errs.push(`${where} سطر ${i + 1}: أضف | صح أو | خطأ`); return { type: 'tf', q: parts[0], answer: /^(صح|صحيح|true|نعم)$/i.test(parts[1] || '') }; }
    if (t === 'cat') { const cats = splitList(parts[0]), words = splitList(parts[1]).map(w => { const [a, b] = w.split('='); return [a.trim(), toNum(b) - 1]; }); if (cats.length < 2 || words.some(w => !(w[1] >= 0 && w[1] < cats.length))) errs.push(`${where} سطر ${i + 1}: فئتان على الأقل، وكل كلمة = رقم فئتها`); return { type: 'cat', cats, words }; }
    const opts = splitList(parts[2]); if (!parts[1] || !opts.length) errs.push(`${where} سطر ${i + 1}: سؤال | جواب | خيارات`);
    return { type: 'mcq', q: parts[0], answer: parts[1], options: shuffle([parts[1], ...opts]) };
  }).filter(Boolean);
}
function toLesson(engine, v) {
  const errs = [], F = FACTORY[engine];
  [...F_COMMON, ...F.fields].forEach(f => { if (f.req && !String(v[f.k] ?? '').trim()) errs.push(`الحقل «${f.label.split('(')[0].split(':')[0].trim()}» مطلوب`); });
  const l = { engine, title: v.title, prompt: v.prompt, section: v.section || 'games', level: +v.level || 1 };
  if (['catch', 'jump', 'whack', 'seek', 'race'].includes(engine)) {
    l.targets = splitList(v.targets); l.distractors = splitList(v.distractors); l.goal = Math.max(3, Math.min(20, toNum(v.goal) || 8));
    if (engine === 'seek') l.mode = v.mode || 'trees'; if (engine === 'jump' && v.listen) { l.listen = true; l.distractors = [...new Set([...l.targets, ...l.distractors])]; }
    if (l.targets.length && l.distractors.length < 2 && !l.listen) errs.push('أضف مشتتين على الأقل');
    if (l.targets.some(t => l.distractors.includes(t)) && !l.listen) errs.push('لا تضع الإجابة نفسها في المشتتات');
  }
  if (engine === 'drag') {
    l.mode = v.mode || 'sort';
    if (l.mode === 'sort') { l.bins = lines(v.bins).map(b => { const [lab, rest] = b.split(/[:：]/); return { label: (lab || '').trim(), accept: splitList(rest) }; }); if (l.bins.length < 2 || l.bins.some(b => !b.label || !b.accept.length)) errs.push('التصنيف يحتاج سلتين على الأقل، كل سلة «الاسم: عناصر»'); }
    if (l.mode === 'build') { l.words = splitList(v.words); if (!l.words.length) errs.push('أضف كلمة واحدة على الأقل للتركيب'); }
    if (l.mode === 'sentence') { l.sentences = lines(v.sentences); if (!l.sentences.length || l.sentences.some(s => s.split(/\s+/).length < 2)) errs.push('كل جملة تحتاج كلمتين على الأقل'); }
  }
  if (engine === 'memory') { l.pairs = lines(v.pairs).map(p => p.split('=').map(x => x.trim())); if (l.pairs.length < 2 || l.pairs.some(p => p.length !== 2 || !p[0] || !p[1])) errs.push('زوجان على الأقل بصيغة «أ = كلمة»'); }
  if (engine === 'listen') { l.mode = v.mode || 'word'; l.items = lines(v.items).map((ln, i) => { const [s, a, o] = ln.split('|').map(x => (x || '').trim()); if (!s || !a || !o) errs.push(`سؤال ${i + 1}: المسموع | الجواب | الخيارات`); return { say: s, answer: a, options: shuffle([a, ...splitList(o)]) }; }); }
  if (engine === 'lesson') { l.letter = v.letter || 'ب'; l.words = splitList(v.words); }
  if (engine === 'exercise') { l.items = parseItems(v.items, errs, 'الأسئلة'); if (String(v.passage || '').trim()) l.passage = v.passage.trim(); }
  if (engine === 'story') {
    l.pages = lines(v.pages).map((ln, i) => { const [sc, tx] = ln.split('|').map(x => (x || '').trim()); if (!SCENES.includes(sc) || !tx) errs.push(`صفحة ${i + 1}: «المشهد | النص» والمشهد من القائمة`); return { scene: sc, text: tx }; });
    l.questions = parseItems(v.questions, errs, 'الأسئلة');
  }
  return { lesson: l, errs };
}

let fState = { engine: 'catch', editing: null, values: null };
function viewFactory() {
  const drafts = S.drafts || [];
  const counts = SECTIONS.filter(s => s.target).map(s => ({ s, now: s.id === 'worksheets' ? worksheetList().length : inSection(s.id).filter(l => !l.fromFactory).length, fac: drafts.filter(d => d.lesson.section === s.id).length }));
  return `<h1>مصنع المحتوى</h1><p class="muted">أنشئ نشاطًا لأي محرك بالنماذج دون برمجة، وعاينه بالمحرك الحقيقي. الحفظ هنا محلي في هذا المتصفح فقط.</p>
  <div class="cols2 factory"><div class="card"><div class="row"><label class="field grow">المحرك <select id="fEngine">${Object.keys(FACTORY).map(e => `<option value="${e}" ${fState.engine === e ? 'selected' : ''}>${ENGINES[e].name}</option>`).join('')}</select></label>
      <button class="gbtn ghost sm" id="fSample">املأ بمثال</button><button class="gbtn ghost sm" id="fNew">جديد</button></div>
    ${fState.editing ? `<p class="tag gold">تعديل: ${esc((drafts.find(d => d.id === fState.editing) || {}).lesson?.title || '')}</p>` : ''}
    <form id="fForm" autocomplete="off"></form><div id="fErr" class="errs" role="alert"></div>
    <div class="row"><button class="gbtn red" id="fPreview">معاينة بالمحرك</button><button class="gbtn green" id="fSave">احفظ المسودة</button></div></div>
  <div class="card"><h3>المسودات (${num(drafts.length)})</h3>${drafts.length ? `<ul class="drafts">${drafts.map(d => `<li data-id="${d.id}"><div><b>${esc(d.lesson.title)}</b><small>${ENGINES[d.engine].name} · ${d.status === 'published' ? '<span class="pill">منشور محليًا</span>' : '<span class="pill soft">مسودة</span>'} · نسخة ${num(d.history.length + 1)}</small></div>
      <div class="row"><button class="gbtn sm" data-fa="edit">تعديل</button><button class="gbtn sm" data-fa="run">تشغيل</button><button class="gbtn sm ${d.status === 'published' ? 'ghost' : 'gold'}" data-fa="pub">${d.status === 'published' ? 'إلغاء النشر' : 'انشر محليًا'}</button>${d.history.length ? '<button class="gbtn ghost sm" data-fa="restore">استرجع السابقة</button>' : ''}<button class="gbtn ghost sm" data-fa="del">حذف</button></div></li>`).join('')}</ul>` : '<p class="muted">لا مسودات بعد.</p>'}
    <div class="row"><button class="gbtn ghost sm" id="fExport" ${drafts.length ? '' : 'disabled'}>تصدير JSON</button><button class="gbtn ghost sm" id="fImportBtn">استيراد JSON</button></div>
    <textarea id="fImport" hidden rows="4" placeholder="الصق ملف JSON هنا ثم اضغط استيراد مرة أخرى"></textarea>
    <h3>هيكل الإنتاج</h3><table class="tbl"><thead><tr><th>القسم</th><th>نماذج الآن</th><th>من المصنع</th><th>الهدف</th></tr></thead><tbody>${counts.map(c => `<tr><td>${c.s.name}</td><td>${num(c.now)}</td><td>${num(c.fac)}</td><td>${num(c.s.target)}</td></tr>`).join('')}</tbody></table>
    <p class="muted">الإنتاج الواسع يبدأ بعد اعتماد جودة المحركات. المسار المقترح: مسودة ← مراجعة لغوية وتربوية ← نشر في learnLessons بصلاحية الإدارة فقط.</p></div></div>`;
}
function renderForm() {
  const F = FACTORY[fState.engine], v = fState.values || { ...F.sample, title: '', prompt: '' };
  $('fForm').innerHTML = [...F_COMMON, ...F.fields].map(f => {
    const val = v[f.k] ?? '';
    if (f.type === 'select') return `<label class="field">${f.label}<select name="${f.k}">${f.opts.map(([a, b]) => `<option value="${esc(a)}" ${String(val) === a ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
    if (f.type === 'check') return `<label class="check"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${f.label}</label>`;
    if (f.type === 'lines' || f.type === 'textarea') return `<label class="field">${f.label}<textarea name="${f.k}" rows="${f.type === 'lines' ? 4 : 3}">${esc(val)}</textarea></label>`;
    return `<label class="field">${f.label}<input name="${f.k}" type="${f.type === 'number' ? 'number' : 'text'}" ${f.min ? `min="${f.min}" max="${f.max}"` : ''} value="${esc(val)}"></label>`;
  }).join('');
}
function readForm() { const v = {}; $('fForm').querySelectorAll('[name]').forEach(el => v[el.name] = el.type === 'checkbox' ? el.checked : el.value); return v; }
function bindFactory() {
  renderForm();
  $('fEngine').onchange = e => { fState = { engine: e.target.value, editing: null, values: null }; route(); };
  $('fSample').onclick = () => { fState.values = { ...FACTORY[fState.engine].sample }; renderForm(); };
  $('fNew').onclick = () => { fState = { engine: fState.engine, editing: null, values: null }; route(); };
  const build = () => { const v = readForm(); fState.values = v; const r = toLesson(fState.engine, v); $('fErr').innerHTML = r.errs.map(e => `<p>• ${esc(e)}</p>`).join(''); return r.errs.length ? null : r.lesson; };
  $('fPreview').onclick = () => { const l = build(); if (!l) return SFX.bad(); runLesson({ ...l, id: 'preview', preview: true }, { back: 'admin' }); };
  $('fSave').onclick = () => {
    const l = build(); if (!l) return SFX.bad();
    S.drafts = S.drafts || [];
    let d = fState.editing && S.drafts.find(x => x.id === fState.editing);
    if (d) { d.history.unshift({ at: d.updated, values: d.values, lesson: d.lesson }); d.history = d.history.slice(0, 5); Object.assign(d, { values: fState.values, lesson: l, updated: Date.now() }); }
    else { d = { id: 'f-' + Date.now().toString(36), engine: fState.engine, values: fState.values, lesson: l, status: 'draft', updated: Date.now(), history: [] }; S.drafts.unshift(d); fState.editing = d.id; }
    saveState(); refreshLessons(); SFX.good(); toast('حُفظت المسودة'); route();
  };
  document.querySelectorAll('.drafts li').forEach(li => li.querySelectorAll('[data-fa]').forEach(b => b.onclick = () => {
    const d = S.drafts.find(x => x.id === li.dataset.id); if (!d) return; const a = b.dataset.fa;
    if (a === 'edit') { fState = { engine: d.engine, editing: d.id, values: { ...d.values } }; route(); return; }
    if (a === 'run') { runLesson({ ...d.lesson, id: d.id, preview: true }, { back: 'admin' }); return; }
    if (a === 'pub') d.status = d.status === 'published' ? 'draft' : 'published';
    if (a === 'restore') { const h = d.history.shift(); Object.assign(d, { values: h.values, lesson: h.lesson, updated: Date.now() }); toast('استُرجعت النسخة السابقة'); }
    if (a === 'del') { if (li.dataset.armed !== '1') { li.dataset.armed = '1'; b.textContent = 'تأكيد الحذف'; b.classList.add('red'); return; } S.drafts = S.drafts.filter(x => x !== d); if (fState.editing === d.id) fState.editing = null; }
    saveState(); refreshLessons(); route();
  }));
  $('fExport').onclick = () => { const blob = new Blob([JSON.stringify({ format: 'silah-learn-drafts', version: 1, drafts: S.drafts }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'silah-learn-drafts.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $('fImportBtn').onclick = () => {
    const ta = $('fImport'); if (ta.hidden) { ta.hidden = false; ta.focus(); return; }
    try { const j = JSON.parse(ta.value); if (j.format !== 'silah-learn-drafts' || !Array.isArray(j.drafts)) throw 0; let n = 0;
      j.drafts.forEach(d => { if (!FACTORY[d.engine] || !d.values) return; const r = toLesson(d.engine, d.values); if (r.errs.length) return; S.drafts.push({ id: 'f-' + Math.random().toString(36).slice(2, 9), engine: d.engine, values: d.values, lesson: r.lesson, status: 'draft', updated: Date.now(), history: [] }); n++; });
      saveState(); refreshLessons(); toast(`استُورد ${n} نشاطًا (كمسودات)`); route();
    } catch (e) { $('fErr').innerHTML = '<p>• ملف غير صالح</p>'; }
  };
  window.__factory = { toLesson, FACTORY };
}
