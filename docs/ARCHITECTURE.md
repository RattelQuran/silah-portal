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
- **غير موجودة في أي مستودع.** `config.js` يشير إلى `firestore.rules` و`اقرأني.md` ولم يُرفعا. لذلك لا يمكن مراجعة: منع المستخدم من رفع دوره بنفسه عند إنشاء `users/{uid}`، وحصر كتابة `registrations` في الإنشاء بحقول محددة، وحصر المعلم في طلابه وولي الأمر في أبنائه. هذا أعلى خطر مفتوح (انظر QA_REPORT.md › S-1).

## المناطق الزمنية
- مفاتيح الحضور والتقارير بتاريخ الأكاديمية (القاهرة) عبر `ACAD_TZ`.
- العرض بتوقيت جهاز المستخدم (`VIEW_TZ`).
- **ملاحظة:** `U.today()` يستخدم تاريخ الجهاز المحلي لا تاريخ القاهرة (QA_REPORT.md › F-1).

## النشر والاستعادة
- الدمج في `main` ينشر تلقائيًا على GitHub Pages، فهو نشر للإنتاج ويتطلب موافقة المالك.
- نقاط الاستعادة: فرع `restore/2026-11-25-pre-web4d` في المستودعات الثلاثة. للعودة: `git checkout main && git reset --hard origin/restore/2026-11-25-pre-web4d` ثم دفع بموافقة المالك.
- النسخ الاحتياطي للبيانات: غير مُعدّ. خطة Spark لا تدعم التصدير المجدول (يتطلب خطة Blaze المدفوعة)، والبديل المجاني المقترح زر «تصدير JSON» من البوابة للمدير.

## الأداء
- البوابة: نحو 140KB غير مضغوطة (JS + HTML) + Firebase SDK + خط Tajawal.
- الموقع: نحو 62KB غير مضغوطة، وFirebase لا يُحمَّل إلا عند الإرسال.
- عند كل `reload()` تُعاد قراءة كل المجموعات المسموح بها. مناسب لأكاديمية صغيرة (عشرات الطلاب)، ويحتاج تقسيمًا بالشهر عند تجاوز بضع مئات من الطلاب أو آلاف سجلات الحضور، حفاظًا على حصة القراءات المجانية (50 ألف قراءة يوميًا).
