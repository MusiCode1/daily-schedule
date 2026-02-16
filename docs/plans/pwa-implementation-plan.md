# תוכנית מפורטת: הפיכת האפליקציה ל-PWA מלא (Installable + Offline)

תאריך: 2026-02-16  
סטטוס: בתכנון

מסמך זה מגדיר תוכנית יישום מדורגת להפיכת אפליקציית `daily-schedule` ל־PWA אמיתי, עם דגש על:

1. התקנה נוחה על טאבלטים/מכשירים ייעודיים.
2. עבודה יציבה גם במצב רשת חלשה/מנותקת.
3. תאימות לארכיטקטורה הקיימת (SvelteKit + Cloudflare + localStorage/IndexedDB + Drive Sync).

---

## TODO לביצוע (Checklist)

- [ ] שלב 0: איסוף Baseline (Lighthouse + DevTools Application audit).
- [ ] שלב 1: `manifest.webmanifest` + אייקונים + meta tags.
- [ ] שלב 2: Service Worker בסיסי (App Shell + precache).
- [ ] שלב 3: Runtime caching מבוקר (תמונות/סאונד/ניווט) + Offline fallback route.
- [ ] שלב 4: UX התקנה ועדכון גרסה (Install prompt + update handling).
- [ ] שלב 5: בדיקות E2E/ידניות ותיעוד הפעלה.
- [ ] שלב 6: Rollout מדורג עם rollback plan.

---

## 1) מצב קיים (Gap Analysis)

### ממצאים מהקוד הנוכחי

1. אין `manifest.webmanifest` תחת `static/`.
2. אין `service-worker` תחת `src/` (אין כרגע SW פעיל).
3. אין חבילת אייקונים להתקנה (`192x192`, `512x512`, `maskable`).
4. ב-`src/routes/+layout.svelte` יש favicon בלבד, ללא `<link rel="manifest">`.
5. בתיקיית `static/` יש כרגע `robots.txt` בלבד.
6. הפונט הראשי נטען מ־Google Fonts (דורש רשת; יכול להשפיע על חוויית אופליין).

### השלכה

האפליקציה כרגע יכולה לעבוד כ־Web App רגיל, אבל לא עומדת בתנאי PWA מלאים של התקנה/אופליין/Service Worker.

---

## 2) מטרות (Goals)

1. לאפשר התקנת האפליקציה כמסך בית בטאבלט/אנדרואיד/דסקטופ.
2. להבטיח טעינה של מעטפת האפליקציה גם ללא רשת.
3. לשמור על זמינות נכסי UI קריטיים (תמונות/סאונד חיוניים) במצב אופליין.
4. למנוע cache בעייתי לנתוני Drive/OAuth/סנכרון.
5. לשמור על התאמה לכללי הארכיטקטורה (לוגיקה בשירותים/Controllers, לא בקומפוננטות).

## 3) לא-מטרות (Non-Goals) לשלב הראשון

1. Push Notifications.
2. Background Sync מתקדם.
3. Offline-first מלא לגיבוי Google Drive.
4. הרחבת יכולות PWA מעבר ל־MVP (למשל Shortcuts דינמיים לפי משתמש).

---

## 4) החלטת ארכיטקטורה מומלצת

### גישה נבחרת: `@vite-pwa/sveltekit` במצב `injectManifest`

נשתמש ב־`@vite-pwa/sveltekit` עם `injectManifest`, כך ש:

1. נשמור `service-worker` מותאם אישית לשליטה מלאה באסטרטגיות cache.
2. נצמצם boilerplate של אינטגרציה וניהול precache.
3. נקבל גמישות לגדול בהמשך בלי לעבור rework מלא.

### עקרונות caching מוצעים

| סוג תוכן | אסטרטגיה | הערות |
|---|---|---|
| App Shell (`build` + `files`) | Cache First עם versioned cache | מהיר, יציב, נשלט בגרסה |
| ניווט (`request.mode === 'navigate'`) | Network First + Offline fallback | תוכן עדכני כשיש רשת, דף fallback כשאין |
| `/images/*`, `/sounds/*` | Stale While Revalidate | זמינות גבוהה + רענון ברקע |
| קריאות ל־Google APIs/OAuth | No Cache (pass-through) | למנוע סיכוני אבטחה/מידע מיושן |
| קבצי CDN חיצוניים (Fonts) | בהתחלה pass-through | לשקול self-host לפונט בשלב קשיחות |

---

## 5) קבצים מתוכננים לשינוי

### קבצים חדשים

1. `sveltekit-version/static/manifest.webmanifest`
2. `sveltekit-version/static/icons/icon-192.png`
3. `sveltekit-version/static/icons/icon-512.png`
4. `sveltekit-version/static/icons/icon-maskable-512.png`
5. `sveltekit-version/src/service-worker.ts`
6. `sveltekit-version/src/routes/offline/+page.svelte`
7. `docs/plans/pwa-implementation-plan.md` (מסמך זה)

### קבצים לעדכון

1. `sveltekit-version/src/routes/+layout.svelte`  
   הוספת `manifest`, `theme-color`, `apple-touch-icon`, meta ל־PWA.
2. `sveltekit-version/src/lib/data/texts.ts`  
   הוספת טקסטים ל־UI של התקנה/מצב אופליין (לפי SSOT טקסטים).
3. `sveltekit-version/src/lib/logic/...` או `src/lib/services/...`  
   הוספת לוגיקה מרוכזת של Install prompt/update prompt (לא בתוך קומפוננטות תצוגה).
4. `docs/features-status.md`  
   מעקב תכנון/יישום.
5. `docs/walkthrough.md`  
   תיעוד התקדמות לפי שלבים.

---

## 6) תוכנית יישום שלבית

## שלב 0: Baseline ומדידת פערים

1. להריץ Lighthouse על סביבת preview.
2. לתעד מה נכשל בקטגוריית PWA.
3. לשמור נקודת התחלה להשוואת שיפור.

תוצר: דוח baseline קצר במסמך/Walkthrough.

## שלב 1: Manifest + נכסי התקנה

1. יצירת `manifest.webmanifest` עם:
   - `name`, `short_name`
   - `lang: "he"`
   - `dir: "rtl"`
   - `start_url` (ברירת מחדל מוצעת: `/`)
   - `display: "standalone"`
   - `theme_color`, `background_color`
   - `icons` כולל `maskable`
2. יצירת סט אייקונים תקין.
3. חיבור ב־`+layout.svelte`.

תוצר: אפליקציה installable (לפחות ברמת manifest).

## שלב 2: Service Worker בסיסי

1. יצירת `src/service-worker.ts` עם:
   - cache versioning לפי `version` של SvelteKit.
   - precache ל־`build`, `files`, נתיבי shell מרכזיים.
2. טיפול ב־`install`/`activate` לניקוי cache ישנים.
3. `fetch` בסיסי ל־cache serving.

תוצר: טעינה חוזרת יציבה ומהירה גם בלי רשת לחלקי shell.

## שלב 3: Runtime caching + Offline fallback

1. הוספת fallback route: `/offline`.
2. ניווטים: Network First, ובכשל להחזיר offline page.
3. משאבים סטטיים (`/images`, `/sounds`): Stale While Revalidate.
4. החרגה מפורשת של קריאות Google Drive/OAuth מ־SW cache.

תוצר: חוויית אופליין נשלטת במקום שגיאות רשת גולמיות.

## שלב 4: UX התקנה ועדכון

1. Service/Controller ללכידת `beforeinstallprompt`.
2. חשיפת CTA להתקנה בממשק מתאים (למשל Settings).
3. מנגנון עדכון גרסה (כאשר SW חדש זמין):
   - הודעת “גרסה חדשה זמינה”.
   - רענון בטוח למשתמש.

תוצר: תהליך התקנה ידידותי ועדכון עקבי.

## שלב 5: בדיקות ותאימות

1. בדיקות ידניות:
   - Android Chrome install.
   - Desktop Chrome install.
   - תרחישי offline/online.
2. E2E בסיסי (Playwright):
   - כניסה לאפליקציה במצב אופליין לאחר טעינה ראשונית.
   - ניווט ל־`/tasks` במצב אופליין.
3. Lighthouse חוזר ואימות שיפור.

תוצר: חבילת ולידציה לפני rollout.

## שלב 6: Rollout מבוקר

1. פריסה לסביבת dev branch.
2. בדיקות smoke על מכשירי יעד.
3. פריסה ל־production.
4. ניטור שבוע ראשון + מסמך rollback.

תוצר: עלייה מבוקרת עם יכולת תגובה מהירה.

---

## 7) קריטריוני הצלחה (Definition of Done)

1. קיימים `manifest` ואייקונים תקינים (כולל `maskable`).
2. `Service Worker` רשום ופעיל בסביבת production.
3. האפליקציה ניתנת להתקנה לפחות ב־Chrome Android + Desktop.
4. מסכי shell עיקריים נטענים גם ללא רשת.
5. אין caching לתעבורת OAuth/Drive API.
6. Lighthouse PWA ללא שגיאות קריטיות.
7. התיעוד (`walkthrough` + `features-status`) מעודכן.

---

## 8) סיכונים ומענה

1. **Cache stale לאחר deploy**  
   מענה: cache versioning + cleanup ב־`activate`.
2. **נפח cache גדל מדי (תמונות/סאונד)**  
   מענה: הגבלת scope לנכסים נדרשים בלבד בשלב ראשון.
3. **פגיעה בזרימת Drive Sync**  
   מענה: החרגה מפורשת של endpointים ותעבורת auth.
4. **פונטים לא זמינים אופליין**  
   מענה: שלב שני אופציונלי של self-host לפונט Heebo.

---

## 9) החלטות פתוחות לאישור לפני יישום

1. `start_url` סופי: `/` (מומלץ) או `/tasks`.
2. האם לכלול כבר ב־MVP גם `apple-touch-icon` מותאם.
3. האם לשלב כפתור התקנה במסך הראשי או רק תחת Settings.
4. האם להכניס בשלב הראשון גם self-host לפונטים.

---

## 10) אומדן מאמץ

1. MVP PWA (שלבים 1-3): יום עד יום וחצי.
2. UX התקנה + עדכון (שלב 4): חצי יום עד יום.
3. בדיקות וייצוב (שלבים 5-6): חצי יום עד יום.

סה"כ משוער: 2-3 ימי עבודה, תלוי בכמות ההתאמות ל־offline UX.
