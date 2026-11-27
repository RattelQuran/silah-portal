# قائمة إنتاج الأصول (ASSET_PRODUCTION_LIST)

## ما يوجد الآن وما ينقصه

كل ما في النموذج الحالي **مرسوم بالكود**: Canvas وSVG، وأصوات مركّبة بـ Web Audio، وصوت عربي مؤقت من المتصفح. هذه الرسوم:

- كافية لإثبات المحركات وتجربة اللعب.
- **ليست بمستوى الإنتاج الاحترافي.** لا تتوفر في هذه الجلسة أدوات توليد صور أو تسجيل صوت بشري.

هذه القائمة هي المطلوب إنتاجه لتحل الأصول الاحترافية محل الرسوم البرمجية. **الشرط في كل الأصول:**

- أصلية 100٪ وبهوية SILAH Signature.
- لا تشبه شخصيات أ ب ت ولا رسومها ولا أصواتها.

**الهوية:**

- الألوان: كريمي ‎#FBF7F0، رملي ‎#F2EADC، مريمي ‎#DDEBE3، كحلي ‎#0C2470 / ‎#1236A0، قرمزي ‎#C8174D، ذهبي ‎#C9A24B.
- الزخارف: القوس المدبّب، والخيط الذهبي، ونجمة ثمانية.
- الأسلوب المقترح: رسم مسطح ناعم بظلال داخلية خفيفة (soft flat with subtle inner shading)، وحواف مستديرة، ودون خطوط سوداء سميكة.

**المواصفة العامة:**

- الصيغة: PNG بشفافية للعناصر، وWebP للخلفيات. المصدر SVG أو PSD أو Figma.
- الحركة: Lottie JSON أو Spine أو أوراق إطارات (sprite sheet) بـ 12 إطارًا في الثانية.
- كل أصل بدقتين: ‎@1x و‎@2x.

**صيغة البرومبت:** كل برومبت بالإنجليزية لأدوات التوليد. يُضاف إلى كل برومبت السطر الثابت التالي:

> `original character design, children's educational game, soft flat vector style, warm cream and navy palette with gold accents, no text, no logos, transparent background`

## 1. الشخصيات

| المعرّف | الوصف | المقاس ‎@1x | شفافية | حالات الحركة | البرومبت |
|---|---|---|---|---|---|
| CH-NOUR | **نور**، فانوس صلة (معتمد مبدئيًا، والقرار النهائي بعد النتيجة البصرية) | 512×640 | نعم | idle (تنفس وتوهج)، blink، happy، wow، sad، cheer (ذراعان للأعلى)، jump (squash/stretch: تحضير، قفز، هبوط)، walk 4 اتجاهات، fall/splash، talk (فم 3 مخارج)، point | `a cute friendly Arabic lantern character named Nour, navy body with gold cap and crimson ribbon, glowing warm glass belly with a kind face, tiny arms and legs, pointed-arch window shapes` |
| CH-NOUR-SKINS | ألوان نور: الأصلي، القرمزي، الأخضر، الليلي، وطبقات قابلة للتلوين | 512×640 | نعم | نفس حالات CH-NOUR بطبقات منفصلة: body وglass وcap وtrim وband | `same Nour lantern, separated color layers for body, glass, cap, trim and ribbon, flat fills for recoloring` |
| CH-HOOPOE | **الهدهد** صديق نور، في لعبتي الإصابة والبحث وفي القصص | 384×384 | نعم | peek (يطل من نافذة)، hide، hit-happy، hit-wrong (يهز رأسه)، fly، idle | `a cheerful hoopoe bird with a striped crest in gold and navy, big round eyes, holding a small sign` |
| CH-RABBIT | الأرنب الصغير في قصة نور | 320×320 | نعم | idle، lost (خائف)، happy، hop | `a small shy cream-colored rabbit with sage green scarf` |
| CH-KIDS | 4 أطفال (بنتان وولدان) بملابس محتشمة لقصص الأسرة والمدرسة | 360×540 | نعم | idle، wave، read، talk، happy، sad | `four diverse Arab children, modest clothing, girls with simple headscarves optional, soft friendly proportions` |
| CH-FAMILY | أم وأب وجد وجدة وجيران | 360×540 | نعم | idle، talk، give، hug | `a warm Arab family set, modest clothing, kind expressions` |
| CH-ANIMALS | 28 حيوانًا أو شيئًا للكلمات الأولى، بحرف لكل واحد (أسد، بقرة، تمر، ثعلب…) | 256×256 | نعم | ثابت مع idle بسيط | `simple cute icon of a {word in English}, centered, soft shading` |

## 2. خلفيات العوالم (طبقات للتمرير المتوازي)

كل خلفية من 3 إلى 4 طبقات منفصلة PNG/WebP: سماء، بعيد، متوسط، قريب. المقاس 2048×1152 قابل للتكرار أفقيًا (tileable).

| المعرّف | المحرك | الطبقات | البرومبت |
|---|---|---|---|
| BG-NIGHT-CITY | E1 الالتقاط | سماء ليلية بنجوم، قباب ومآذن بعيدة، أسطح قريبة، هلال | `night skyline of a peaceful Arabic city with domes and minarets, deep navy sky, scattered stars, warm window lights, parallax layers` |
| BG-RIVER | E2 القفز | سماء، نخيل بعيد، ضفة رملية، ماء متحرك | `calm river in an oasis, palm trees on sandy banks, gentle water ripples, daytime` |
| BG-ARCH-WALL | E3 الإصابة | جدار بنوافذ مقوسة 3×3، زخرفة شريط ذهبي | `a decorated wall with pointed arch windows, Andalusian patterns, navy and cream tiles, gold trim` |
| BG-OASIS | E4 البحث | كثبان، نخيل كبير، عشب | `lush oasis with tall palm trees, soft dunes, morning light` |
| BG-DESERT-ROAD | E7 السباق | طريق من الأعلى، رمل، نخيل جانبي، بوابات مقوسة | `top-down desert road with three lanes, palm trees at the sides, pointed arch gates` |
| BG-STAR-SKY | E5 السحب | سماء متدرجة بنجوم | `twilight sky gradient with sparkling stars` |
| BG-BOOK | E11 القصص | 10 مشاهد: غرفة، طريق ليلي، غابة مظلمة، بيت، شكر، واحة، ريح، أصدقاء، بناء عش، احتفال | `storybook illustration of {scene}, warm soft lighting, child-friendly` |
| BG-SILAH-CITY | E12 العالم | خريطة tiles بحجم 64×64: عشب، طريق، ساحة، ماء، جسر | `top-down tileset for a cozy Arabic town: grass, stone path, plaza tiles, water, bridge, seamless` |
| BG-SHOP-SKY | قارب الهلال | سماء ليلية، غيوم بيضاء، غيوم مطر | `dreamy night sky with soft clouds, side view` |

## 3. عناصر المشاهد

| المعرّف | الوصف | المقاس | شفافية | حالات | البرومبت |
|---|---|---|---|---|---|
| EL-STAR-CARD | نجمة تحمل حرفًا (الالتقاط) | 160×160 | نعم | fall-spin، catch-burst، wrong-crack | `golden eight-pointed star badge with blank center` |
| EL-STONE | حجر النهر بثلاث حالات | 300×140 | نعم | idle-bob، land-squash، sink | `flat round river stepping stone, top view slightly angled` |
| EL-WINDOW | نافذة مقوسة مع مصراعين | 220×300 | نعم | open، close | `pointed arch window with wooden shutters` |
| EL-PALM | نخلة كبيرة يختبئ خلفها الهدهد | 300×520 | نعم | sway، shake-reveal | `tall palm tree, lush fronds` |
| EL-GATE | بوابة قوس على الطريق | 260×220 | نعم | pass-glow، crash | `decorative pointed arch gate with a blank sign` |
| EL-LANTERN-BIN | فانوس كبير سلة للتصنيف | 240×280 | نعم | idle-glow، accept، reject-shake | `big glowing lantern as a basket` |
| EL-CARD-BACK | ظهر بطاقة الذاكرة | 240×320 | لا | flip | `card back with navy background and gold eight-point star pattern` |
| EL-CHEST | صندوق كنز | 200×180 | نعم | closed، locked، opening (6 إطارات)، open-glow | `small ornate treasure chest with gold trim and crescent lock` |
| EL-PICKUPS | تمرة وجوهرة ونجمة | 96×96 | نعم | float، collect | `cute collectible icons: a date fruit, a crimson gem, a gold star` |
| EL-PLACES | مسجد ومكتبة ومدرسة وسوق وبيت نور (منظر علوي مائل) | 512×384 | نعم | idle، door-open | `isometric cozy {building} in an Arabic town, inviting door` |
| EL-CITY-PIECES | قطع «ابنِ مدينتك»: بيت، قبة، قوس، نخلة، حديقة، ماء، طريق، فانوس | 128×128 | نعم | place-pop | `top-down game tile of a {piece}, soft flat style` |
| EL-BOAT | قارب الهلال | 260×140 | نعم | bob، hit-flash | `crescent moon shaped boat, gold` |

## 4. الواجهة والمؤثرات

| المعرّف | الوصف | المقاس | الحالات | ملاحظات |
|---|---|---|---|---|
| UI-BTN | أزرار ثلاثية الأبعاد (أحمر، ذهبي، أخضر، كحلي، شبح) | 9-slice | normal، pressed، disabled | حاليًا CSS، ويمكن إبقاؤها برمجية |
| UI-PANEL-ARCH | لوحة النتيجة بقوس مدبب وإطار ذهبي | 9-slice | appear | حاليًا CSS |
| UI-SECTION-ICONS | 10 أيقونات أقسام + الدكان | 256×256 | idle، hover-bounce | تحل محل رسوم SVG الحالية |
| UI-ENGINE-ICONS | 12 أيقونة محرك | 128×128 | — | لبطاقات الأنشطة |
| FX-CONFETTI | قصاصات ونجوم ذهبية | Lottie | play-once | |
| FX-STAR-RATING | ظهور النجوم الثلاث | Lottie | 0..3 | |
| FX-SPARKLE / FX-SPLASH / FX-POOF | لمعان، رذاذ ماء، سحابة | sprite 8 إطارات | play-once | |
| FX-TRANSITION | ستارة قوس تفتح بين الشاشات | Lottie | in، out | |

## 5. الصوت (أهم أصل، ولا يُستبدل بالتوليد)

| المعرّف | المحتوى | العدد التقريبي | المواصفة |
|---|---|---|---|
| VO-LETTERS | اسم كل حرف، وصوته بالحركات الثلاث والسكون | 28 × 5 = 140 | تسجيل معلمة، WAV 48kHz ثم OGG/MP3، دون ضجيج، مع مراجعة لغوية |
| VO-WORDS | كل كلمة في المحتوى بالتشكيل | 400+ في المرحلة الأولى | كما سبق |
| VO-SIGHT | 100 كلمة بصرية | 100 | |
| VO-INSTR | تعليمات كل محرك وكل نشاط | 12 قالبًا + جملة لكل نشاط | نبرة ودودة وبطيئة |
| VO-PRAISE | تشجيع وتصحيح لطيف | 20 تشجيعًا + 10 «حاول مرة أخرى» | دون عبارات مبالغ فيها |
| VO-STORIES | قراءة كل صفحة مع توقيت الكلمات (word timings JSON) لتظليل الكلمة | لكل قصة | يُصدَّر معها ملف توقيت |
| VO-LISTEN | ألغاز وحوارات قسم الاستماع | 100 | صوتان أو ثلاثة للحوار |
| SFX-SET | قفز، هبوط، رذاذ، صح، خطأ، عملة، فتح صندوق، قلب بطاقة، نقرة، فوز | 15 | مكتبة مرخصة تجاريًا أو إنتاج خاص؛ البديل المركّب الحالي يعمل |
| MUS-LOOPS | موسيقى خلفية هادئة لكل عالم، 30 إلى 60 ثانية متكررة | 6 | اختيارية ويمكن إطفاؤها؛ يُراعى رأي الأسر في الموسيقى (إيقاع فقط أو دونها) |

## 6. ترتيب الإنتاج المقترح

1. **نور** بكل حالاته. هو شرط الاعتماد النهائي للشخصية.
2. تسجيلات **VO-LETTERS**، ثم **VO-INSTR** و**VO-PRAISE**.
3. خلفيات المحركات الأكثر استخدامًا: الالتقاط والقفز والإصابة والبحث، ثم الباقي.
4. **مدينة صلة**: tiles والأماكن والصندوق والمقتنيات.
5. مشاهد القصص الأولى.

**طريقة التركيب في الكود:** لكل محرك دالة رسم واحدة (`drawNour` و`drawHoopoe` و`drawScene` وغيرها). تُستبدل كل دالة بـ `ctx.drawImage` من أوراق الإطارات دون تغيير منطق اللعب.
