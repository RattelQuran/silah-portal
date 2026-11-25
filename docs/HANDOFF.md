# HANDOFF — صلة

**آخر تحديث:** 2026-11-25 · **الجلسة:** WEB-4D المرحلة 02

## نقطة التوقف
- PR #1 **مدموج** في `main` (منشور على GitHub Pages).
- فرع `web4d/phase-02` فيه كل عمل المرحلة 02، وطلب دمج مفتوح **لم يُدمج** (الدمج = نشر للبوابة، أما القواعد فلا تُنشر بالدمج).
- `firestore.rules` في المستودع **مقترحة وغير منشورة**.

## الملفات المعدلة في المرحلة 02
- `firestore.rules` و`firebase.json`: جديدان.
- `backup.js`: جديد (منطق ملفات النسخ والاستيراد).
- `app.js`: النسخ والاستعادة والمعاينة، ونمط التبويبات، و`ACAD_TZ` من util، وتاريخ طلب التسجيل بتوقيت القاهرة.
- `util.js`: `ACAD_TZ` و`today()` بتاريخ القاهرة.
- `data.js`: ربط المحاكي على localhost فقط.
- `tests/`: أربع مجموعات اختبار (53).
- `docs/`: SECURITY وBACKUP وCHANGELOG وdesign-directions، وتحديث QA وPROGRESS وDECISION_LOG وHANDOFF.

## الاختبارات
```sh
cd tests && npm install
npm test     # unit + rules + emulator + e2e = 53/53
```
يحتاج Java للمحاكي، ويستخدم Chromium من `CHROMIUM_PATH` أو `/opt/pw-browsers/chromium` إن وُجد.

## بانتظار المالك
1. اعتماد دمج PR المرحلة 02.
2. نسخ نص قواعد Firestore المنشورة (SECURITY.md › المطلوب من المالك).

## الخطوة التالية المأذونة
- التصميم الحالي باقٍ بقرار المالك (D-11). لا تغيير بصري دون طلب جديد.
- بعد وصول القواعد المنشورة: المقارنة وكتابة الفروق، ثم انتظار موافقة النشر.

## للاستئناف
اقرأ `docs/MASTER_CONTEXT.md` ثم هذا الملف ثم `docs/DECISION_LOG.md` (القسم المعلق).
