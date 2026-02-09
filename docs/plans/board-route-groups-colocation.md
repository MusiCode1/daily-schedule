# תכנית: ארגון Routes לקבוצות + הצמדת קומפוננטות לדף הלוח (Colocation)

## מטרות
1. מסך הלוח יהיה בכתובת `/tasks`.
2. דף השורש `/` יפנה אוטומטית:
   - אם יש משתמש נוכחי (Session) → `/tasks`
   - אחרת → `/login`
3. Routes יאורגנו לקבוצות (Route Groups) כדי להבהיר דומיינים:
   - `(board)` ללוח
   - `(admin)` לניהול
   - `(dev)` לניסויים/מסכים זמניים
4. קומפוננטות *ייעודיות לדף ספציפי* יהיו ליד הדף תחת `src/routes/**` (ולא ב־`src/lib/components`).
5. קומפוננטות *משותפות* יישארו תחת `sveltekit-version/src/lib/components/**` (כולל `ui/**`).

## רקע: מה זה Route Group ב־SvelteKit
תיקייה בשם בסוגריים, למשל `src/routes/(board)/...`, היא תיקיית ארגון בלבד:
- השם בסוגריים **לא נכנס ל־URL**.
- ניתן לשים בה `+layout.svelte` כדי ליצור Layout נפרד לקבוצה.

דוגמה:
- `src/routes/(board)/tasks/+page.svelte` → URL: `/tasks`
- `src/routes/(admin)/settings/+layout.svelte` → URL: `/settings/...`

## החלטות שננעלו
1. דף השורש נשאר בשורש: `sveltekit-version/src/routes/+page.svelte`.
2. דף הלוח יהיה תחת קבוצת `(board)` ויוגש ב־`/tasks`.
3. קבוצת הניהול תיקרא `(admin)`.
4. קומפוננטה משותפת נשארת ב־`src/lib/components/**`.
5. קומפוננטה של דף ספציפי תועבר ל־`src/routes/.../_components/**` ליד הדף.
6. `src/routes/test-board` נחשב דף dev זמני (לא “מוצר”). כרגע נשאיר אותו, אבל נארגן תחת `(dev)`. מחיקה עתידית אפשרית בלי שינוי עקרוני בתכנית.

## אילוץ טכני חשוב: Redirect בשורש הוא Client-only
מצב “משתמש נוכחי” נמצא ב־Local State (דרך `globalState`), ולכן **אי אפשר** לעשות redirect “אמיתי” בצד שרת לפי זה.
הפניה מ־`/` תיעשה בצד לקוח (SvelteKit `goto`) על בסיס `SessionController.currentUser`.

## מיפוי שימושים (אימות בלעדיות/שיתופיות)
הסיווג כאן מבוסס על בדיקה בפועל של imports בתוך `sveltekit-version/src`.

### קומפוננטות בלעדיות למסך הלוח (מותר להצמיד ליד `/tasks`)
כרגע מיובאות רק מתוך מסך הלוח:
- `AddModal.svelte`
- `CelebrationModal.svelte`
- `TaskRow.svelte`
- `ListSwitcher.svelte`
- `ListHeader.svelte`
- `PeopleDisplay.svelte`
- `SplashScreen.svelte`
- `BoardIconButton.svelte`
- `BoardActionCard.svelte`
- `BoardFabAddButton.svelte`

### קומפוננטות משותפות (נשארות ב־`src/lib/components/**`)
מזוהות כמשותפות לפי שימוש במסכים נוספים:
- `FloatingIframe.svelte` (גם `test-board`)
- `ListEditModal.svelte` (גם `settings/lists`)
- `ImageDisplay.svelte` (רב־שימושי)
- `ImageUploader.svelte` (גם `settings/users`)
- `PersonForm.svelte` (גם `settings/people`)
- `UserSelector.svelte` (login)
- `UserPickerModal.svelte` (settings/lists)
- `GoogleDriveBackup.svelte` (settings/general)
- `SyncOverlay.svelte` (layout)

## יעד: מבנה Routes ותיקיות
### שורש
- `sveltekit-version/src/routes/+page.svelte`
  - יהפוך ל־Redirector קטן בלבד (`/tasks` או `/login`).

### לוח
- `sveltekit-version/src/routes/(board)/tasks/+page.svelte`
  - יהיה דף הלוח (מעבר של הקוד הקיים מ־`src/routes/+page.svelte`).
- `sveltekit-version/src/routes/(board)/tasks/_components/**`
  - כל קומפוננטה בלעדית ללוח תעבור לכאן.

### ניהול
- `sveltekit-version/src/routes/(admin)/settings/**`
  - מעבר של כל `sveltekit-version/src/routes/settings/**` לכאן (בלי שינוי URL).

### פיתוח/ניסויים
- `sveltekit-version/src/routes/(dev)/test-board/+page.svelte`
  - מעבר של `sveltekit-version/src/routes/test-board/+page.svelte` לכאן (בלי שינוי URL).

## יעד: מיקום קומפוננטות (Colocation)
### קומפוננטות ייעודיות לדף הלוח: העברה ליד הדף
מעבירים מ:
- `sveltekit-version/src/lib/components/AddModal.svelte`
- `sveltekit-version/src/lib/components/CelebrationModal.svelte`
- `sveltekit-version/src/lib/components/TaskRow.svelte`
- `sveltekit-version/src/lib/components/ListSwitcher.svelte`
- `sveltekit-version/src/lib/components/ListHeader.svelte`
- `sveltekit-version/src/lib/components/PeopleDisplay.svelte`
- `sveltekit-version/src/lib/components/SplashScreen.svelte`
- `sveltekit-version/src/lib/components/board/BoardIconButton.svelte`
- `sveltekit-version/src/lib/components/board/BoardActionCard.svelte`
- `sveltekit-version/src/lib/components/board/BoardFabAddButton.svelte`

אל:
- `sveltekit-version/src/routes/(board)/tasks/_components/AddModal.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/CelebrationModal.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/TaskRow.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/ListSwitcher.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/ListHeader.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/PeopleDisplay.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/SplashScreen.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/BoardIconButton.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/BoardActionCard.svelte`
- `sveltekit-version/src/routes/(board)/tasks/_components/BoardFabAddButton.svelte`

הערה: בשלב ההעברה נעדכן גם imports פנימיים כדי שלא יהיו תלויים בנתיבים יחסיים שבירים.

### קומפוננטות משותפות: נשארות ב־`src/lib/components/**`
במיוחד:
- `sveltekit-version/src/lib/components/FloatingIframe.svelte` נשאר משותף (גם ללוח וגם ל־dev).
- `sveltekit-version/src/lib/components/ui/**` נשאר פרימיטיבים משותפים.

## שינויי קוד נדרשים (Decision-complete)
### 1) מעבר מסך הלוח ל־`/tasks`
1. להעביר את תוכן `sveltekit-version/src/routes/+page.svelte` ל:
   - `sveltekit-version/src/routes/(board)/tasks/+page.svelte`
2. לעדכן imports בתוך `tasks/+page.svelte` לקומפוננטות החדשות תחת:
   - `./_components/...` (או `$lib/...` אם נחליט לאחד סגנון imports; ההמלצה כאן: יחסי מקומי בתוך ה־route כדי להישאר “צמוד לדף”).

### 2) Redirector בשורש `/`
לעדכן את `sveltekit-version/src/routes/+page.svelte` כך שיעשה:
- אם `SessionController().currentUser` קיים → `goto('/tasks', { replaceState: true })`
- אחרת → `goto('/login', { replaceState: true })`

כללי זהירות:
- בלי טקסטים חדשים בעברית בקובץ. אם צריך טקסטים, להשתמש ב־`TEXTS`.
- לא להכניס לוגיקה עסקית; רק הפניה.

### 3) עדכון ניווט “חזרה ללוח”
לעדכן הפניות “ללוח” כך שיצביעו ל־`/tasks` במקום `/`:
- `sveltekit-version/src/routes/(board)/login/+page.svelte`
  - `goto('/')` → `goto('/tasks')`
- `sveltekit-version/src/routes/settings/+layout.svelte` (אחרי המעבר: `sveltekit-version/src/routes/(admin)/settings/+layout.svelte`)
  - `goto('/')` → `goto('/tasks')`
- חיפוש נוסף של `goto('/')` שמייצג “חזרה ללוח” ולעדכן ל־`/tasks`.

### 4) מעבר ניהול לקבוצת `(admin)`
להעביר:
- `sveltekit-version/src/routes/settings/**`
אל:
- `sveltekit-version/src/routes/(admin)/settings/**`

אין שינויי URL, אבל:
- צריך לוודא שכל imports בתוך `settings/**` עדיין תקינים.
- `handleBack()` יפנה ל־`/tasks`.

### 5) מעבר dev לקבוצת `(dev)`
להעביר:
- `sveltekit-version/src/routes/test-board/+page.svelte`
אל:
- `sveltekit-version/src/routes/(dev)/test-board/+page.svelte`

אין שינויי URL.

## בדיקות קבלה
### ניווט
1. ללא משתמש נוכחי: כניסה ל־`/` מגיעה ל־`/login`.
2. עם משתמש נוכחי: כניסה ל־`/` מגיעה ל־`/tasks`.
3. חזרה מהגדרות: כפתור “חזרה ללוח” חוזר ל־`/tasks`.

### ויזואלי/מבנה
1. `/tasks` נראה ומתנהג כמו לפני המעבר (אותו markup עיקרי; רק מיקומי קבצים/imports השתנו).
2. אין רגרסיה ב־CelebrationModal/AddModal/TaskRow.

### איכות
1. להריץ `svelte-autofixer` על קבצי Svelte שנגעו בהם (במיוחד route חדש וקומפוננטות שהועברו).
2. להריץ `npm run check` בתוך `sveltekit-version` לפי `.cursor/commands/check.md`.

## סדר ביצוע מומלץ (להקטין סיכון)
1. להעביר routes (tasks, admin, dev) לפני העברת קומפוננטות, ולהגיע למצב שהאפליקציה עולה.
2. להעביר קומפוננטות הבלעדיות אחת־אחת ל־`tasks/_components` ולעדכן imports בכל צעד.
3. חיפוש `goto('/')` ולהחליף “חזרה ללוח” ל־`/tasks`.
4. בדיקות (`npm run check`) + בדיקה בדפדפן.
5. תיעוד: עדכון `docs/walkthrough.md`.
6. קומיט אחד נקי (נפרד מנושאים אחרים) לפי כללי Git בפרויקט.

## הערות/סיכונים ידועים
1. Scoped styles: מסך הלוח משתמש ב־`:global(...)` כדי לעקוף scoping. בהעברה נזהר לא לפצל CSS בין קבצים כדי לא לשבור את זה.
2. `test-board` זמני: גם אם ימחק בעתיד, `FloatingIframe.svelte` יישאר shared ב־`src/lib/components` ולכן לא יוצר תלות מחייבת ב־dev.
