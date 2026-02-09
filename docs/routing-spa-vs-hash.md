# ניתוב ופריסה: SPA (Pathname) מול Hash Routing ב־SvelteKit

תאריך: 2026-02-09  
סטטוס: מסמך החלטה/ידע (חי)

## מטרת המסמך
להשוות בצורה מעשית בין שתי גישות פריסה/ניתוב ב־SvelteKit:
- SPA עם URL רגיל (pathname) ו־fallback בהוסטינג
- Hash routing (`/#/...`) של SvelteKit

המסמך מותאם לפרויקט `daily-schedule`, שבו כרגע:
- המידע נשמר בצד לקוח (localStorage + IndexedDB)
- גיבוי/שחזור ל־Google Drive נעשה בדפדפן (gapi)
- אין “דאטה בשרת” ואין endpoints ייעודיים

## TL;DR (המלצה לפרויקט שלנו)
ברירת מחדל מומלצת: SPA עם pathname + fallback סטטי (ללא Hash routing).

סיבה מרכזית: Hash routing מתנגש אצלנו עם Google OAuth במצב Redirect, שנשען על URL hash (`#access_token=...`).

Hash routing נשאר “תוכנית ב׳” טובה רק אם אנו צפויים לרוץ בסביבה שאין לנו שליטה על הוסטינג/rewrites, ומוכנים להשקיע בהתאמות OAuth.

---

## מצב נוכחי בפרויקט (רלוונטי להחלטה)
### איפה הדאטה באמת נמצא
- localStorage: `sveltekit-version/src/lib/stores/persistence.ts`
- IndexedDB לתמונות (idb:): `sveltekit-version/src/lib/services/db.ts`
- שימוש נרחב ב־`idb:`: `sveltekit-version/src/lib/actions/dbImage.ts`, `sveltekit-version/src/lib/stores/imageStore.svelte.ts`

### Google Drive (טעינה/שחזור/גיבוי)
- שירות Google Auth/Drive: `sveltekit-version/src/lib/services/drive/googleAuthService.ts`
- Controller גיבוי/שחזור: `sveltekit-version/src/lib/logic/backupController.svelte.ts`
- אתחול נעשה רק בדפדפן (onMount): `sveltekit-version/src/routes/+layout.svelte`

### נקודת מפתח: Redirect OAuth משתמש ב־hash
ב־`sveltekit-version/src/lib/services/drive/googleAuthService.ts` פונקציה `checkRedirectCallback()` קוראת `window.location.hash` ומחפשת `access_token`, ואז מנקה את ה־URL.
זה קריטי להחלטת Hash routing.

---

## מה זה בעצם “SPA” בסוולטקיט (Pathname + Fallback)
### ההגדרה
המשתמש רואה URL רגיל כמו `/settings/users`.  
בטעינה ראשונה או רענון על deep-link, ההוסטינג חייב להגיש “מעטפת” (HTML) במקום 404, והאפליקציה משלימה ניווט בצד לקוח.

### איך זה נראה בקונפיג (רמת רעיון)
- `export const ssr = false` ב־root layout כדי לוודא שהכל רץ בדפדפן.
- שימוש ב־`adapter-static` עם `fallback` (למשל `200.html` או `404.html` בהתאם לפלטפורמה).

### יתרונות אצלנו
- URL נקי ונוח לשיתוף (בלי `#`).
- עדיין אפשר (אם רוצים) prerender לחלקים סטטיים מאוד (למשל `/privacy`) בלי להפוך את כל האפליקציה ל־SSR.
- עובד טוב עם Google OAuth Redirect, כי ה־hash נשאר פנוי לשימוש OAuth.

### חסרונות/סיכונים אצלנו
- צריך לוודא deep-link handling בהוסטינג.
- אם JavaScript לא נטען, האפליקציה לא תעבוד (זה נכון לכל SPA).

### הערה ספציפית ל־Cloudflare Pages
ב־Cloudflare Pages יש התנהגות SPA ברירת מחדל: אם אין `404.html` בשורש, Pages מניח SPA וממפה כל נתיב לשורש (`/`).
אם כן מוסיפים `404.html`, Pages יתנהג כ־404 רגיל (עם חיפוש “404 קרוב” בתיקיות).

---

## מה זה Hash routing בסוולטקיט
### ההגדרה
ה־route נקבע לפי `location.hash`, כלומר URL בפועל נראה כמו `/#/settings/users`.

### קונפיג רשמי
ב־SvelteKit: `kit.router.type = 'hash'`.

### יתרונות אצלנו
- אין תלות בהגדרות deep-link של הוסטינג, כי השרת תמיד “רואה” רק `/`.
- מתאים לסביבות שבהן אין לנו שליטה על rewrites, או הוסטינג בעייתי.

### חסרונות/סיכונים אצלנו (חשובים)
- SvelteKit מכבה SSR ו־prerender במצב hash.
- אי אפשר להשתמש בלוגיקה צד־שרת בכלל.
- חייבים לוודא שכל הקישורים באפליקציה מתחילים ב־`#/` אחרת הם לא יעבדו.
- התנגשות משמעותית עם Google OAuth Redirect:
  - OAuth implicit flow מחזיר `#access_token=...`
  - Hash routing “תופס” את ה־hash עבור ניתוב
  - אצלנו בפועל `checkRedirectCallback()` מסתמך על `window.location.hash` עבור התחברות

### מה נצטרך לעשות אם בכל זאת רוצים Hash routing
אחד מהבאים (או שילוב):
- לבטל/להימנע מ־Redirect Mode ולחייב Popup Mode בלבד (אם זה מתאים לקיוסק שלנו).
- לשנות את OAuth flow כך שלא יחזיר token ב־hash (למשל מעבר ל־code flow עם PKCE), ואז להתאים את `googleAuthService`.
- להוסיף שכבת “טיפול בהתחברות” שמריצה `checkRedirectCallback()` לפני שהראוטר “מתלבש” (תלוי במימושים, לא מובטח).

---

## טבלת החלטה (מותאם ל־daily-schedule)

| קריטריון | SPA (pathname + fallback) | Hash routing |
|---|---|---|
| “אין דאטה בשרת” | מתאים | מתאים |
| שליטה בהוסטינג (Cloudflare Pages) | מצוין | לא נדרש |
| URL נקי | כן | לא (`#`) |
| יציבות deep-links בלי קונפיג | תלוי הוסטינג | כן |
| SEO | לא פוקוס אצלנו | לא פוקוס אצלנו |
| prerender למסכים סטטיים | אפשרי חלקית | לא (כבוי) |
| תאימות ל־Google OAuth Redirect (כמו שממומש עכשיו) | כן | בעייתי מאוד (התנגשות hash) |
| “תוכנית ב׳” לסביבות לא נשלטות | אפשר, עם התאמות הוסטינג | מצוין |

---

## החלטה מומלצת כרגע
1. לבחור SPA עם pathname + fallback.
2. לא לבחור Hash routing כרגע, בגלל התנגשות עם Google OAuth Redirect, והפסד prerender.

---

## תרחישי בדיקה (אחרי כל שינוי עתידי)
- כניסה ישירה ל־`/settings/users` עם refresh.
- ניווט פנימי בין כל מסכי settings בלי reload.
- התחברות ל־Google Drive ב־Popup Mode.
- התחברות ל־Google Drive ב־Redirect Mode (אם נשאר), כולל חזרה מההפניה.
- שחזור גיבוי, כתיבה ל־localStorage, ואז `window.location.reload()` וחזרה למסך תקין.
- בדיקת עבודה Offline בסיסית (טעינת state מקומי ותמונות idb).

---

## מקורות (חיצוניים)
```text
SvelteKit configuration (router.type=hash, מגבלות SSR/prerender, קישורים #/):
https://svelte.dev/docs/kit/configuration#router

SvelteKit single-page apps (ssr=false + adapter-static fallback):
https://svelte.dev/docs/kit/single-page-apps

Cloudflare Pages “Serving Pages” (SPA behavior ללא 404.html בשורש):
https://developers.cloudflare.com/pages/configuration/serving-pages/

Issue על אופטימיזציית builds ל-hash router:
https://github.com/sveltejs/kit/issues/13217

דיון קהילתי על Hash routing והשלכות (כולל goto/resolveRoute):
https://www.reddit.com/r/sveltejs/comments/1hkncrd/sveltekit_added_hashbased_routing/
```
