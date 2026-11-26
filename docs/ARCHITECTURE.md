# ARCHITECTURE — صلة

## نظرة عامة
```
[الموقع العام silah]  --addDoc-->  Firestore: registrations
                                         ^
[البوابة silah-portal] <--Auth+Firestore-+--> بقية المجموعات
        GitHub Pages (مجاني)          Firebase project: silah-portal (Spark)
```
لا خادم خاص ولا خطوة بناء. التكلفة التشغيلية الحالية: صفر (ضمن الحدود المجانية).

## البوابة: الملفات
| الملف | المسؤولية |
|---|---|
| `index.html` | الهيكل والتنسيق كاملًا (CSS داخلي) |
| `config.js` | اسم الأكاديمية، بريد المالك، إعدادات Firebase العامة |
| `data.js` | طبقة البيانات: Firebase أو ذاكرة تجريبية بنفس الواجهة (`get/list/set/add/del/batch/loadProfile`) |
| `backup.js` | تحويل ملفات النسخ والنقل إلى عمليات كتابة، وخطة الجديد والموجود (بلا DOM) |
| `util.js` | تواريخ، مناطق زمنية، باقات، عملات، `esc()` للهروب، `safeLink/waLink` |
| `app.js` | الواجهات والأحداث (تفويض نقرات عبر `data-act`) |

Firebase SDK ‏10.12.2 يُحمَّل من `gstatic.com` كوحدات ES.

## مجموعات Firestore
`teachers` · `students` · `billing` (معرّف = معرّف الطالب) · `attendance` و`reports` (معرّف = `YYYY-MM-DD_studentId`) · `payments` · `expenses` · `payouts` · `settings/main` و`settings/rates` · `teacherRates` · `users` (معرّف = uid) · `invites` (معرّف = البريد بأحرف صغيرة) · `registrations` · `monthlyReports` (معرّف = `YYYY-MM_studentId`) · `makeups` · `contacts` · `payAdj` · `payroll`.

## المصادقة والصلاحيات
1. الدخول بـ Google أو رابط البريد.
2. `loadProfile`: إن وُجد `users/{uid}` يُستخدم. وإلا يُنشأ من `invites/{email}` أو يُمنح دور admin إن طابق البريد `ownerEmail`.
3. الواجهة تخفي التبويبات حسب الدور، لكن **الحماية الفعلية مسؤولية قواعد Firestore**.

### حالة قواعد Firestore
- منشورة فعليًا: فحص 2026-11-25 بطلبات REST غير مصادقة على 8 مجموعات (`students`, `users`, `invites`, `registrations`, `payments`, `settings`, `teachers`, `attendance`) أعاد **403 PERMISSION_DENIED** لكلها. القراءة المجهولة مغلقة.
- القواعد المنشورة غير موجودة في أي مستودع.
- **المرحلة 02:** `firestore.rules` في الجذر مقترحة ومختبرة في المحاكي (26 اختبارًا) وغير منشورة. المصفوفة والضمانات في [SECURITY.md](SECURITY.md).

## المناطق الزمنية
- مفاتيح الحضور والتقارير بتاريخ الأكاديمية (القاهرة) عبر `ACAD_TZ`.
- العرض بتوقيت جهاز المستخدم (`VIEW_TZ`).
- `U.today()` يعيد تاريخ القاهرة منذ المرحلة 02، فيطابق مفاتيح الحضور أيًا كان توقيت الجهاز.

## الاختبارات
`tests/` فيها: unit (منطق النسخ)، وrules (القواعد في محاكي Firestore)، وemulator (البوابة الحقيقية مع محاكي Auth وFirestore، والدخول برابط البريد)، وe2e (Playwright في الوضع التجريبي). الأمر: `cd tests && npm install && npm test`.

## النشر والاستعادة
- الدمج في `main` ينشر تلقائيًا على GitHub Pages، فهو نشر للإنتاج ويتطلب موافقة المالك.
- نقاط الاستعادة: فرع `restore/2026-11-25-pre-web4d` في المستودعات الثلاثة. للعودة: `git checkout main && git reset --hard origin/restore/2026-11-25-pre-web4d` ثم دفع بموافقة المالك.
- النسخ الاحتياطي للبيانات: زر في البوابة للمدير (المرحلة 02). التفاصيل في [BACKUP.md](BACKUP.md).

## الأداء
- البوابة: نحو 140KB غير مضغوطة (JS + HTML) + Firebase SDK + خط Tajawal.
- الموقع: نحو 62KB غير مضغوطة، وFirebase لا يُحمَّل إلا عند الإرسال.
- عند كل `reload()` تُعاد قراءة كل المجموعات المسموح بها. مناسب لأكاديمية صغيرة (عشرات الطلاب)، ويحتاج تقسيمًا بالشهر عند تجاوز بضع مئات من الطلاب أو آلاف سجلات الحضور، حفاظًا على حصة القراءات المجانية (50 ألف قراءة يوميًا).
