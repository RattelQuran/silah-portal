# HANDOFF — صلة

**آخر تحديث:** 2026-11-25 · **الجلسة:** WEB-4D، جولة الصقل النهائية للاتجاه D

## نقطة التوقف
- PR #1 **مدموج** في `main` (منشور على GitHub Pages).
- PR #2 (`web4d/phase-02`): الأمن والنسخ والتوقيت. مفتوح، **لم يُدمج**، وينتظر موافقة المالك. الدمج ينشر الواجهة، ولا ينشر القواعد.
- `web4d/signature-preview`: مبني على `web4d/phase-02`. فيه الاتجاه D «صلة المميزة»، **المعتمد فنيًا** من المالك (D-11)، وجولة الصقل النهائية. **لا يُدمج ولا يُنشر قبل اعتماد المالك.**
- `firestore.rules` في المستودع **مقترحة وغير منشورة**.

## الملفات التي غيّرها الاتجاه D (مقارنة بـ `web4d/phase-02`)
- `index.html`: كل CSS (رموز الألوان والخطوط والأحجام والمسافات) و22 أيقونة SVG، وبنية الرأس (شريط العلامة وشريط التبويبات).
- `app.js`: طبقة العرض فقط، وهي `viewDash` و`viewAcc` و`viewMine` و`viewKids` و`renderLogin` و`alertsBlock` و`alertRows`، وأيقونات التبويبات، والإجراءان `go` و`rnf`، وأسماء a11y. **لم يتغير** منطق المال أو الحضور أو الصلاحيات أو تحميل البيانات.
- `tests/e2e.test.mjs`: 9 اختبارات جديدة.
- `docs/`: QA_REPORT وDESIGN_SYSTEM وCHANGELOG وSECURITY وDECISION_LOG وPROGRESS وهذا الملف، وRELEASE_READINESS جديد.
- لم تتغير: `firestore.rules` و`data.js` و`util.js` و`backup.js` و`config.js`.

## الاختبارات
```sh
cd tests && npm install
npm test     # unit 5 + rules 18 + emulator 8 + e2e 31 = 62/62
```
يحتاج Java للمحاكي، ويستخدم Chromium من `CHROMIUM_PATH` أو `/opt/pw-browsers/chromium`.
اللقطات: `node /home/user/design/shoot-d.mjs <dir> <prefix>` للشاشات الخمس، و`node /home/user/design/shoot-tabs.mjs <width>` لكل تبويب. فحص axe: سكربت في مسودة الجلسة، ويحتاج `axe-core@4.10.2`.

## بانتظار المالك
1. اعتماد النسخة المصقولة من الاتجاه D، أو طلب تعديلات محددة.
2. **D-16:** درجة أغمق لأرقام الأيام فوق «حضر» و«تأخر» فقط، أو قبول التباين الحالي.
3. اعتماد دمج PR #2.
4. **D-12:** نص قواعد Firestore المنشورة (SECURITY.md › المطلوب من المالك).
5. **D-15:** تفعيل App Check.

## الخطوة التالية المأذونة
- لا اتجاهات بصرية جديدة. التعديلات على D تكون بطلب محدد من المالك فقط.
- بعد وصول القواعد المنشورة: المقارنة وكتابة الفروق، ثم انتظار موافقة النشر.
- ترتيب النشر في RELEASE_READINESS.md.

## للاستئناف
اقرأ `docs/MASTER_CONTEXT.md` ثم هذا الملف ثم `docs/DECISION_LOG.md` ثم `docs/RELEASE_READINESS.md`.
