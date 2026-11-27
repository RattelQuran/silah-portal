'use strict';
/* Silah curriculum data. Written for Silah; every text here needs a human linguistic + pedagogical review before publishing.
   Lessons are plain data. The same shape is produced by the content factory. */

const AR = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' ');
const NAMES = { 'ا': 'الأَلِف', 'ب': 'البَاء', 'ت': 'التَّاء', 'ث': 'الثَّاء', 'ج': 'الجِيم', 'ح': 'الحَاء', 'خ': 'الخَاء', 'د': 'الدَّال', 'ذ': 'الذَّال', 'ر': 'الرَّاء', 'ز': 'الزَّاي', 'س': 'السِّين', 'ش': 'الشِّين', 'ص': 'الصَّاد', 'ض': 'الضَّاد', 'ط': 'الطَّاء', 'ظ': 'الظَّاء', 'ع': 'العَيْن', 'غ': 'الغَيْن', 'ف': 'الفَاء', 'ق': 'القَاف', 'ك': 'الكَاف', 'ل': 'اللَّام', 'م': 'المِيم', 'ن': 'النُّون', 'ه': 'الهَاء', 'و': 'الوَاو', 'ي': 'اليَاء' };
const NONJOIN = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و']);
const forms = l => NONJOIN.has(l) ? { iso: l, ini: l, med: 'ـ' + l, fin: 'ـ' + l } : { iso: l, ini: l + 'ـ', med: 'ـ' + l + 'ـ', fin: 'ـ' + l };
const formSet = l => [...new Set(Object.values(forms(l)))];
const HARAKAT = [['َ', 'فَتْحَة'], ['ُ', 'ضَمَّة'], ['ِ', 'كَسْرَة'], ['ْ', 'سُكُون']];

const WORDS = {
  'ا': ['أَسَد', 'أَرْنَب', 'أُمّ', 'إِبْرِيق'], 'ب': ['بَاب', 'بَيْت', 'بَحْر', 'بَقَرَة'], 'ت': ['تَمْر', 'تُفَّاح', 'تَاج', 'تِين'],
  'ث': ['ثَوْب', 'ثَلْج', 'ثَعْلَب', 'ثُوم'], 'ج': ['جَمَل', 'جَبَل', 'جَزَر', 'جَرَس'], 'ح': ['حِصَان', 'حَدِيقَة', 'حَلِيب', 'حُوت'],
  'خ': ['خُبْز', 'خَرُوف', 'خَيْمَة', 'خِيَار'], 'د': ['دُبّ', 'دَار', 'دِيك', 'دَفْتَر'], 'ذ': ['ذِئْب', 'ذَهَب', 'ذُرَة', 'ذَيْل'],
  'ر': ['رُمَّان', 'رِيشَة', 'رَأْس', 'رَمْل'], 'ز': ['زَيْت', 'زَهْرَة', 'زَرَافَة', 'زَيْتُون'], 'س': ['سَمَكَة', 'سَمَاء', 'سَاعَة', 'سُلَّم'],
  'ش': ['شَمْس', 'شَجَرَة', 'شَاي', 'شُبَّاك'],
};
const LETTERS_WITH_CONTENT = Object.keys(WORDS);
const ALL_WORDS = Object.values(WORDS).flat().concat(['قَمَر', 'وَرْدَة', 'نَهْر', 'كِتَاب', 'فِيل', 'لَيْمُون', 'مَسْجِد', 'نَخْلَة', 'غَيْمَة', 'عُصْفُور', 'فَرَاشَة', 'قَلَم', 'مِفْتَاح', 'يَد', 'وَلَد', 'هِلَال']);
const firstLetter = w => { const c = stripHarakat(w)[0]; return c; };
const wordsStarting = l => ALL_WORDS.filter(w => firstLetter(w) === l);
const wordsNotStarting = l => ALL_WORDS.filter(w => firstLetter(w) !== l);

const SIGHT_GROUPS = [
  ['فِي', 'مِنْ', 'عَلَى', 'إِلَى', 'هُوَ', 'هِيَ', 'أَنَا', 'أَنْتَ', 'هَذَا', 'هَذِهِ'],
  ['قَالَ', 'كَانَ', 'ذَهَبَ', 'جَاءَ', 'لَا', 'نَعَمْ', 'مَعَ', 'عِنْدَ', 'ثُمَّ', 'كُلُّ'],
  ['كَبِير', 'صَغِير', 'جَمِيل', 'بَيْت', 'يَوْم', 'أُمّ', 'أَب', 'مَاء', 'اسْم', 'وَلَد'],
  ['الَّذِي', 'الَّتِي', 'لِمَاذَا', 'مَاذَا', 'أَيْنَ', 'مَتَى', 'كَيْفَ', 'هُنَا', 'هُنَاكَ', 'الآنَ'],
];
const SIGHT_TARGET = 100;

/* journeys of the games section: 21, the first six carry playable lessons */
const JOURNEYS = [
  ['الأَلِف وَالبَاء', ['ا', 'ب']], ['التَّاء وَالثَّاء', ['ت', 'ث']], ['الجِيم وَالحَاء وَالخَاء', ['ج', 'ح', 'خ']], ['الدَّال وَالذَّال', ['د', 'ذ']],
  ['الرَّاء وَالزَّاي', ['ر', 'ز']], ['السِّين وَالشِّين', ['س', 'ش']], ['الصَّاد وَالضَّاد', ['ص', 'ض']], ['الطَّاء وَالظَّاء', ['ط', 'ظ']],
  ['العَيْن وَالغَيْن', ['ع', 'غ']], ['الفَاء وَالقَاف', ['ف', 'ق']], ['الكَاف وَاللَّام', ['ك', 'ل']], ['المِيم وَالنُّون', ['م', 'ن']],
  ['الهَاء وَالوَاو وَاليَاء', ['ه', 'و', 'ي']], ['الهَمْزَة وَالتَّاء المَرْبُوطَة', []], ['مُرَاجَعَة الحُرُوف', []], ['بَيْتِي وَأُسْرَتِي', []],
  ['فِي المَسْجِد', []], ['طَعَامِي', []], ['الطَّبِيعَة حَوْلِي', []], ['مَدْرَسَتِي', []], ['جُمَل قَصِيرَة', []],
];

const RIDDLES = [
  ['أَنَا فِي السَّمَاءِ نَهَارًا، أُضِيءُ وَأُدَفِّئُ الأَرْضَ. مَنْ أَنَا؟', 'الشَّمْس', ['القَمَر', 'الغَيْمَة']],
  ['أَعِيشُ فِي المَاءِ، وَلِي زَعَانِفُ. مَنْ أَنَا؟', 'السَّمَكَة', ['الجَمَل', 'العُصْفُور']],
  ['أَنَا حَيَوَانٌ صَبُورٌ، أَحْمِلُ النَّاسَ فِي الصَّحْرَاءِ. مَنْ أَنَا؟', 'الجَمَل', ['الأَرْنَب', 'السَّمَكَة']],
  ['أَنَا ثَمَرٌ حُلْوٌ، أَنْمُو عَلَى النَّخْلَةِ. مَنْ أَنَا؟', 'التَّمْر', ['التُّفَّاح', 'الجَزَر']],
  ['أَظْهَرُ فِي اللَّيْلِ، وَأَكُونُ هِلَالًا ثُمَّ بَدْرًا. مَنْ أَنَا؟', 'القَمَر', ['الشَّمْس', 'النَّجْمَة']],
  ['فِيَّ صَفَحَاتٌ كَثِيرَةٌ، وَتَقْرَأُ فِيَّ القِصَصَ. مَنْ أَنَا؟', 'الكِتَاب', ['القَلَم', 'البَاب']],
];
const PLACES = [
  ['أَنَا فِي مَكَانٍ فِيهِ كُتُبٌ كَثِيرَةٌ وَهُدُوءٌ. أَيْنَ أَنَا؟', 'المَكْتَبَة', ['السُّوق', 'البَحْر']],
  ['أَنَا فِي مَكَانٍ نُصَلِّي فِيهِ. أَيْنَ أَنَا؟', 'المَسْجِد', ['المَطْبَخ', 'الحَدِيقَة']],
  ['أَنَا فِي مَكَانٍ فِيهِ مُعَلِّمَةٌ وَسَبُّورَةٌ. أَيْنَ أَنَا؟', 'المَدْرَسَة', ['السُّوق', 'المَسْجِد']],
  ['أَنَا فِي مَكَانٍ نَشْتَرِي مِنْهُ الخُضَارَ وَالفَاكِهَةَ. أَيْنَ أَنَا؟', 'السُّوق', ['المَكْتَبَة', 'المَدْرَسَة']],
];
const DIALOGUES = [
  ['قَالَتْ سَارَةُ: صَبَاحُ الخَيْرِ. بِمَاذَا تَرُدُّ؟', 'صَبَاحُ النُّور', ['مَعَ السَّلَامَة', 'شُكْرًا']],
  ['قَالَ الضَّيْفُ: السَّلَامُ عَلَيْكُمْ. بِمَاذَا تَرُدُّ؟', 'وَعَلَيْكُمُ السَّلَام', ['صَبَاحُ الخَيْرِ', 'عَفْوًا']],
  ['قَالَ صَدِيقُكَ: شُكْرًا لَكَ. بِمَاذَا تَرُدُّ؟', 'عَفْوًا', ['أَهْلًا', 'تُصْبِحُ عَلَى خَيْر']],
];

const STORIES = [
  { id: 'story-nour-rabbit', title: 'نُورٌ وَالأَرْنَبُ الصَّغِيرُ', level: 1, pages: [
    { text: 'نُورٌ فَانُوسٌ صَغِيرٌ.', scene: 'room' },
    { text: 'يُحِبُّ نُورٌ أَنْ يُضِيءَ الطَّرِيقَ لِأَصْدِقَائِهِ.', scene: 'path' },
    { text: 'فِي لَيْلَةٍ مُظْلِمَةٍ، ضَلَّ أَرْنَبٌ صَغِيرٌ طَرِيقَهُ.', scene: 'lost' },
    { text: 'أَضَاءَ نُورٌ، فَرَأَى الأَرْنَبُ بَيْتَهُ.', scene: 'home' },
    { text: 'قَالَ الأَرْنَبُ: «شُكْرًا يَا نُورُ!»', scene: 'thanks' }],
    questions: [{ type: 'mcq', q: 'مَنْ ضَلَّ طَرِيقَهُ؟', answer: 'الأَرْنَبُ', options: ['الأَرْنَبُ', 'نُورٌ', 'البَيْتُ'] },
      { type: 'mcq', q: 'مَاذَا فَعَلَ نُورٌ؟', answer: 'أَضَاءَ الطَّرِيقَ', options: ['أَضَاءَ الطَّرِيقَ', 'نَامَ', 'رَكَضَ بَعِيدًا'] },
      { type: 'tf', q: 'قَالَ الأَرْنَبُ: شُكْرًا يَا نُورُ.', answer: true }] },
  { id: 'story-hoopoe-palm', title: 'الهُدْهُدُ وَالنَّخْلَةُ', level: 2, pages: [
    { text: 'فِي الوَاحَةِ نَخْلَةٌ عَالِيَةٌ، وَعَلَيْهَا عُشُّ هُدْهُدٍ.', scene: 'oasis' },
    { text: 'هَبَّتْ رِيحٌ قَوِيَّةٌ، فَسَقَطَ العُشُّ عَلَى الرَّمْلِ.', scene: 'wind' },
    { text: 'حَزِنَ الهُدْهُدُ، فَجَاءَ أَصْدِقَاؤُهُ يُسَاعِدُونَهُ.', scene: 'friends' },
    { text: 'جَمَعُوا القَشَّ وَالرِّيشَ، وَبَنَوْا عُشًّا جَدِيدًا.', scene: 'build' },
    { text: 'قَالَ الهُدْهُدُ: «مَا أَجْمَلَ التَّعَاوُنَ!»', scene: 'happy' }],
    questions: [{ type: 'mcq', q: 'أَيْنَ كَانَ العُشُّ؟', answer: 'عَلَى النَّخْلَةِ', options: ['عَلَى النَّخْلَةِ', 'فِي البَيْتِ', 'تَحْتَ الجَبَلِ'] },
      { type: 'mcq', q: 'لِمَاذَا سَقَطَ العُشُّ؟', answer: 'هَبَّتْ رِيحٌ قَوِيَّةٌ', options: ['هَبَّتْ رِيحٌ قَوِيَّةٌ', 'نَزَلَ مَطَرٌ', 'جَاءَ قِطٌّ'] },
      { type: 'tf', q: 'بَنَى الأَصْدِقَاءُ عُشًّا جَدِيدًا.', answer: true }] },
];

const TEXTS = [
  { id: 'text-drop', title: 'قَطْرَةُ مَاءٍ', level: 1, topic: 'طبيعة',
    passage: 'أَنَا قَطْرَةُ مَاءٍ صَغِيرَةٌ. كُنْتُ فِي البَحْرِ، ثُمَّ سَخَّنَتْنِي الشَّمْسُ فَصَعِدْتُ إِلَى السَّمَاءِ. صِرْتُ جُزْءًا مِنْ غَيْمَةٍ كَبِيرَةٍ. وَعِنْدَمَا بَرَدَ الجَوُّ، نَزَلْتُ مَطَرًا عَلَى حَقْلٍ أَخْضَرَ، فَشَرِبَتْ مِنِّي زَهْرَةٌ جَمِيلَةٌ.',
    items: [{ type: 'tf', q: 'كَانَتِ القَطْرَةُ فِي البَحْرِ.', answer: true }, { type: 'tf', q: 'صَعِدَتِ القَطْرَةُ بِسَبَبِ الرِّيحِ.', answer: false },
      { type: 'tf', q: 'نَزَلَتِ القَطْرَةُ عَلَى حَقْلٍ.', answer: true }, { type: 'mcq', q: 'مَنْ شَرِبَ مِنَ القَطْرَةِ؟', answer: 'زَهْرَةٌ', options: ['زَهْرَةٌ', 'عُصْفُورٌ', 'قِطَّةٌ'] }] },
  { id: 'text-neighbour', title: 'جَارُنَا الجَدِيدُ', level: 2, topic: 'أسرة ومجتمع',
    passage: 'انْتَقَلَتْ أُسْرَةٌ جَدِيدَةٌ إِلَى بَيْتٍ قُرْبَ بَيْتِنَا. حَمَلَتْ أُمِّي طَبَقًا مِنَ الكَعْكِ، وَذَهَبْنَا نُرَحِّبُ بِهِمْ. فَرِحَ الجِيرَانُ كَثِيرًا، وَعَرَفْتُ أَنَّ لَهُمْ وَلَدًا فِي مِثْلِ عُمْرِي اسْمُهُ يُوسُفُ. صَارَ يُوسُفُ صَدِيقِي، وَنَلْعَبُ مَعًا كُلَّ يَوْمٍ.',
    items: [{ type: 'tf', q: 'سَكَنَتِ الأُسْرَةُ الجَدِيدَةُ بَعِيدًا عَنَّا.', answer: false }, { type: 'tf', q: 'حَمَلَتِ الأُمُّ طَبَقًا مِنَ الكَعْكِ.', answer: true },
      { type: 'mcq', q: 'مَا اسْمُ ابْنِ الجِيرَانِ؟', answer: 'يُوسُفُ', options: ['يُوسُفُ', 'أَحْمَدُ', 'عُمَرُ'] }] },
];

/* exercise sets (E10) */
const EXERCISE_SETS = [
  { id: 'ex-trace-1', section: 'exercises', unit: 'كتابة الحروف', title: 'تَتَبَّعِ الحُرُوفَ: ا ب ت', items: ['ا', 'ب', 'ت'].map(l => ({ type: 'trace', letter: l })) },
  { id: 'ex-trace-2', section: 'exercises', unit: 'كتابة الحروف', title: 'تَتَبَّعِ الحُرُوفَ: ث ج ح', items: ['ث', 'ج', 'ح'].map(l => ({ type: 'trace', letter: l })) },
  { id: 'ex-first-1', section: 'exercises', unit: 'الحرف الأول', title: 'بِأَيِّ حَرْفٍ تَبْدَأُ الكَلِمَةُ؟', items: ['بَيْت', 'تَمْر', 'جَمَل', 'خُبْز', 'دِيك', 'شَمْس'].map(w => { const a = firstLetter(w); return { type: 'mcq', q: `بِأَيِّ حَرْفٍ تَبْدَأُ كَلِمَةُ «${w}»؟`, say: w, answer: a, options: shuffle([a, ...shuffle(AR.filter(x => x !== a)).slice(0, 2)]) }; }) },
  { id: 'ex-similar-1', section: 'exercises', unit: 'الحروف المتشابهة نطقًا', title: 'أَيُّ كَلِمَةٍ مَكْتُوبَةٌ صَحِيحَةً؟', items: [['سَمَكَة', 'صَمَكَة'], ['طَاوِلَة', 'تَاوِلَة'], ['ذَهَب', 'زَهَب'], ['زَيْت', 'ذَيْت'], ['صَقْر', 'سَقْر'], ['تُفَّاح', 'طُفَّاح']].map(([ok, no]) => ({ type: 'mcq', q: 'اخْتَرِ الكَلِمَةَ المَكْتُوبَةَ صَحِيحَةً', say: ok, answer: ok, options: shuffle([ok, no]) })) },
  { id: 'ex-gender-1', section: 'exercises', unit: 'المذكر والمؤنث', title: 'صَنِّفْ: مُذَكَّرٌ أَمْ مُؤَنَّثٌ؟', items: [{ type: 'cat', cats: ['مُذَكَّر', 'مُؤَنَّث'], words: [['وَلَد', 0], ['بِنْت', 1], ['قِطَّة', 1], ['جَمَل', 0], ['شَجَرَة', 1], ['بَاب', 0], ['سَيَّارَة', 1], ['قَلَم', 0]] }] },
  { id: 'gr-definite-1', section: 'grammar', unit: 'النكرة والمعرفة', title: 'نَكِرَةٌ أَمْ مَعْرِفَةٌ؟', items: [{ type: 'cat', cats: ['نَكِرَة', 'مَعْرِفَة'], words: [['كِتَاب', 0], ['الكِتَاب', 1], ['قَلَم', 0], ['القَمَر', 1], ['بَيْت', 0], ['الشَّمْس', 1], ['وَرْدَة', 0], ['البَحْر', 1]] }, { type: 'tf', q: 'كَلِمَةُ «الشَّجَرَة» مَعْرِفَةٌ.', answer: true }, { type: 'tf', q: 'كَلِمَةُ «بَيْت» مَعْرِفَةٌ.', answer: false }] },
  { id: 'gr-prep-1', section: 'grammar', unit: 'حروف الجر', title: 'اخْتَرْ حَرْفَ الجَرِّ المُنَاسِبَ', items: [['الكِتَابُ ___ الطَّاوِلَةِ.', 'عَلَى'], ['خَرَجَ الوَلَدُ ___ البَيْتِ.', 'مِنْ'], ['السَّمَكُ ___ المَاءِ.', 'فِي'], ['ذَهَبْتُ ___ المَدْرَسَةِ.', 'إِلَى']].map(([q, a]) => ({ type: 'mcq', q, answer: a, options: shuffle(['عَلَى', 'مِنْ', 'فِي', 'إِلَى']) })) },
  { id: 'gr-nominal-1', section: 'grammar', unit: 'المبتدأ والخبر', title: 'المُبْتَدَأُ وَالخَبَرُ', items: [{ type: 'mcq', q: 'فِي جُمْلَةِ «الشَّمْسُ مُشْرِقَةٌ»، مَا الخَبَرُ؟', answer: 'مُشْرِقَةٌ', options: ['الشَّمْسُ', 'مُشْرِقَةٌ'] }, { type: 'mcq', q: 'فِي جُمْلَةِ «البَيْتُ كَبِيرٌ»، مَا المُبْتَدَأُ؟', answer: 'البَيْتُ', options: ['البَيْتُ', 'كَبِيرٌ'] }, { type: 'mcq', q: 'أَكْمِلْ: «الوَرْدَةُ ___»', answer: 'جَمِيلَةٌ', options: ['جَمِيلَةٌ', 'جَمِيلٌ'] }] },
];

/* build all lessons from data */
function buildLessons() {
  const L = [];
  const lv = i => i < 2 ? 1 : i < 4 ? 2 : 3;
  JOURNEYS.forEach(([jname, letters], ji) => {
    letters.filter(l => WORDS[l]).forEach(l => {
      const n = NAMES[l], level = lv(ji), base = { section: 'games', group: ji, letter: l, level };
      const near = shuffle(AR.filter(x => x !== l)).slice(0, 6);
      L.push({ ...base, section: 'letters', id: `lesson-${l}`, engine: 'lesson', title: `تَعَرَّفْ حَرْفَ ${n}`, prompt: `هَيَّا نَتَعَرَّفُ عَلَى حَرْفِ ${n}`, words: WORDS[l] });
      L.push({ ...base, id: `catch-${l}`, engine: 'catch', title: `نُجُومُ ${n}`, prompt: `اجْمَعِ النُّجُومَ الَّتِي تَحْمِلُ حَرْفَ ${n}`, targets: formSet(l), distractors: near, goal: 10 });
      L.push({ ...base, id: `whack-${l}`, engine: 'whack', title: `نَوَافِذُ ${n}`, prompt: `المَسِ الهُدْهُدَ الَّذِي يَحْمِلُ حَرْفَ ${n}`, targets: formSet(l), distractors: near, goal: 10 });
      L.push({ ...base, id: `jump-${l}`, engine: 'jump', title: `حِجَارَةُ النَّهْرِ: ${n}`, prompt: `اقْفِزْ إِلَى كَلِمَةٍ تَبْدَأُ بِحَرْفِ ${n}`, targets: wordsStarting(l), distractors: wordsNotStarting(l), goal: 6 });
      L.push({ ...base, id: `seek-${l}`, engine: 'seek', mode: 'trees', title: `نَخِيلُ الوَاحَةِ: ${n}`, prompt: `أَيْنَ يَخْتَبِئُ الهُدْهُدُ؟ المَسِ النَّخْلَةَ الَّتِي عَلَيْهَا حَرْفُ ${n}`, targets: formSet(l), distractors: near, goal: 8 });
      L.push({ ...base, id: `grid-${l}`, engine: 'seek', mode: 'grid', title: `شَبَكَةُ ${n}`, prompt: `ابْحَثْ عَنْ كُلِّ أَشْكَالِ حَرْفِ ${n}`, targets: formSet(l), distractors: near, goal: 6 });
      L.push({ ...base, id: `race-${l}`, engine: 'race', title: `عَرَبَةُ الوَاحَةِ: ${n}`, prompt: `قُدِ العَرَبَةَ إِلَى بَوَّابَةِ كَلِمَةٍ تَبْدَأُ بِحَرْفِ ${n}`, targets: wordsStarting(l), distractors: wordsNotStarting(l), goal: 8 });
      L.push({ ...base, id: `listen-${l}`, engine: 'listen', mode: 'word', title: `اسْمَعْ وَاخْتَرْ: ${n}`, prompt: 'اسْتَمِعْ ثُمَّ اخْتَرِ الكَلِمَةَ', items: WORDS[l].map(w => ({ say: w, answer: w, options: [w, ...shuffle(wordsNotStarting(l)).slice(0, 2)] })) });
      L.push({ ...base, id: `build-${l}`, engine: 'drag', mode: 'build', title: `رَكِّبِ الكَلِمَةَ: ${n}`, prompt: 'اسْحَبِ الحُرُوفَ لِتُرَكِّبَ الكَلِمَةَ', words: WORDS[l].slice(0, 3) });
    });
    if (letters.length >= 2 && letters.every(l => WORDS[l])) {
      const ln = letters.map(l => NAMES[l]).join(' وَ');
      L.push({ section: 'games', group: ji, level: lv(ji), id: `sort-${ji}`, engine: 'drag', mode: 'sort', title: `صَنِّفِ الأَشْكَالَ: ${ln}`, prompt: 'اسْحَبْ كُلَّ شَكْلٍ إِلَى فَانُوسِ حَرْفِهِ', bins: letters.map(l => ({ label: l, accept: formSet(l) })) });
      L.push({ section: 'games', group: ji, level: lv(ji), id: `mem-${ji}`, engine: 'memory', title: `ذَاكِرَةُ ${ln}`, prompt: 'اقْلِبِ البِطَاقَاتِ وَطَابِقْ كُلَّ كَلِمَةٍ بِحَرْفِهَا الأَوَّلِ', pairs: letters.flatMap(l => WORDS[l].slice(0, letters.length > 2 ? 2 : 3).map(w => [l, w])) });
    }
  });
  // sentence journey (21)
  L.push({ section: 'games', group: 20, level: 3, id: 'sentence-1', engine: 'drag', mode: 'sentence', title: 'رَتِّبِ الجُمْلَةَ', prompt: 'اسْحَبِ الكَلِمَاتِ لِتُرَتِّبَ الجُمْلَةَ', sentences: ['ذَهَبَ أَحْمَدُ إِلَى المَسْجِدِ', 'الشَّمْسُ مُشْرِقَةٌ', 'تَقْرَأُ مَرْيَمُ قِصَّةً جَمِيلَةً'] });
  // sight words
  SIGHT_GROUPS.forEach((g, i) => {
    const b = { section: 'sight', group: i, level: 1 };
    L.push({ ...b, id: `sight-listen-${i}`, engine: 'listen', mode: 'word', title: `اسْمَعْ وَاقْرَأْ: المَجْمُوعَة ${i + 1}`, prompt: 'اسْتَمِعْ ثُمَّ اخْتَرِ الكَلِمَةَ', items: g.map(w => ({ say: w, answer: w, options: [w, ...shuffle(g.filter(x => x !== w)).slice(0, 2)] })) });
    L.push({ ...b, id: `sight-flash-${i}`, engine: 'listen', mode: 'flash', title: `لَمْحَةٌ سَرِيعَة: المَجْمُوعَة ${i + 1}`, prompt: 'انْظُرْ جَيِّدًا، سَتَخْتَفِي الكَلِمَةُ! ثُمَّ اخْتَرْهَا', items: g.map(w => ({ say: w, answer: w, options: [w, ...shuffle(g.filter(x => x !== w)).slice(0, 3)] })) });
    L.push({ ...b, id: `sight-jump-${i}`, engine: 'jump', title: `قَفْزُ الكَلِمَات: المَجْمُوعَة ${i + 1}`, prompt: 'اقْفِزْ إِلَى الكَلِمَةِ الَّتِي تَسْمَعُهَا', listen: true, targets: g, distractors: g, goal: 6 });
    L.push({ ...b, id: `sight-test-${i}`, engine: 'exercise', mastery: true, title: `اخْتِبَارُ الإِتْقَان: المَجْمُوعَة ${i + 1}`, prompt: 'اخْتِبَارٌ قَصِيرٌ: اسْتَمِعْ وَاخْتَرْ', items: shuffle(g).slice(0, 8).map(w => ({ type: 'mcq', q: 'أَيُّ كَلِمَةٍ تَسْمَعُ؟', say: w, answer: w, options: shuffle([w, ...shuffle(g.filter(x => x !== w)).slice(0, 2)]) })) });
  });
  // listening patterns
  const lp = (id, mode, title, prompt, list) => L.push({ section: 'listening', id, engine: 'listen', mode, level: 1, title, prompt, items: list.map(([s, a, o]) => ({ say: s, answer: a, options: [a, ...o] })) });
  lp('listen-riddles', 'riddle', 'مَنْ أَنَا؟', 'اسْتَمِعْ إِلَى اللُّغْزِ ثُمَّ اخْتَرِ الجَوَاب', RIDDLES);
  lp('listen-places', 'riddle', 'أَيْنَ أَنَا؟', 'اسْتَمِعْ ثُمَّ اخْتَرِ المَكَان', PLACES);
  lp('listen-dialogue', 'riddle', 'مَاذَا نَقُولُ؟', 'اسْتَمِعْ ثُمَّ اخْتَرِ الرَّدَّ المُنَاسِب', DIALOGUES);
  L.push({ section: 'listening', id: 'listen-letters', engine: 'listen', mode: 'letter', level: 1, title: 'اسْمَعِ اسْمَ الحَرْف', prompt: 'اسْتَمِعْ إِلَى اسْمِ الحَرْفِ ثُمَّ اخْتَرْهُ', items: ['ب', 'ت', 'ج', 'د', 'س', 'ش'].map(l => ({ say: 'حَرْفُ ' + NAMES[l], answer: l, options: [l, ...shuffle(AR.filter(x => x !== l)).slice(0, 3)] })) });
  // exercises + grammar
  EXERCISE_SETS.forEach(x => L.push({ ...x, engine: 'exercise', level: 1, prompt: x.title }));
  // stories + texts
  STORIES.forEach(s => L.push({ section: 'stories', engine: 'story', id: s.id, title: s.title, level: s.level, prompt: 'اقْرَأْ وَاسْتَمِعْ، وَابْحَثْ عَنِ الهِلَالِ المُخْتَبِئِ فِي كُلِّ صَفْحَةٍ', pages: s.pages, questions: s.questions, weight: 1 }));
  TEXTS.forEach(t => L.push({ section: 'texts', engine: 'exercise', id: t.id, title: t.title, level: t.level, topic: t.topic, passage: t.passage, prompt: 'اقْرَأِ النَّصَّ ثُمَّ أَجِبْ', items: t.items }));
  return L;
}
let LESSONS = [];
function refreshLessons() {
  LESSONS = buildLessons();
  // published factory lessons join the catalogue
  (S.drafts || []).filter(d => d.status === 'published').forEach(d => LESSONS.push({ ...d.lesson, id: d.id, fromFactory: true }));
}
