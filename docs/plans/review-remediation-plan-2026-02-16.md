# תוכנית פעולה לתיקון ממצאי סקירה (16/02/2026)

## צ'קליסט ביצוע (לסימון במהלך היישום)

- [ ] לפתוח `worktree` חדש תחת `/.worktrees/` על branch ייעודי לתיקון הסקירה.
- [ ] למגר שימוש ישיר ב־classes במסך `settings/lists` ולעבור ל־`Button`/`ActionButton`/`Card`.
- [ ] למגר שימוש ישיר ב־classes במודאל `ListEditModal` ולעבור ל־`ModalShell`/`TextInput`/`Textarea`/`Button`.
- [ ] לרכז טקסטים עבריים קשיחים ב־`texts.ts` עבור `settings/general/+page.svelte`.
- [ ] לרכז טקסטים עבריים קשיחים ב־`texts.ts` עבור `dev/debug/export/+page.svelte`.
- [ ] להסיר כפילות עיצוב `status-indicator` מתוך `TaskRow.svelte` ולהשתמש בשכבת העיצוב המשותפת.
- [ ] להריץ `svelte-autofixer` על כל קבצי Svelte ששונו.
- [ ] להריץ `bun run check` מתוך `sveltekit-version` ולוודא `0 errors / 0 warnings`.
- [ ] לבצע QA ידני קצר למסכים שהשתנו (רשימות, מודאל, משימות, דף debug).
- [ ] לעדכן `docs/features-status.md` ו־`docs/walkthrough.md`.
- [ ] לבצע קומיטים אטומיים לפי שלבים, ולמזג ל־`main`.

---

## מטרת התוכנית

להביא את הקוד לתאימות מלאה עם כללי הפרויקט בנושאים הבאים:
1. שימוש עקבי ב־UI primitives (ללא API מקביל של classes).
2. ריכוז כל הטקסטים בעברית תחת מקור אמת יחיד (`src/lib/data/texts.ts`).
3. הסרת כפילות עיצובית ושמירה על בעלות מרכזית ל־styles משותפים.

---

## היקף התיקון (קבצים עיקריים)

1. `sveltekit-version/src/routes/(admin)/settings/lists/+page.svelte`
2. `sveltekit-version/src/lib/components/ListEditModal.svelte`
3. `sveltekit-version/src/routes/(admin)/settings/general/+page.svelte`
4. `sveltekit-version/src/routes/(dev)/debug/export/+page.svelte`
5. `sveltekit-version/src/routes/(board)/tasks/_components/TaskRow.svelte`
6. `sveltekit-version/src/lib/data/texts.ts`
7. `docs/features-status.md`
8. `docs/walkthrough.md`

---

## שלב 1: יישור primitives במסך רשימות ומודאל (Priority: P2)

### 1.1 `settings/lists/+page.svelte`

1. להחליף אלמנטים עם `btn-primary`/`action-btn`/`card` לרכיבי primitives:
   - `Button`
   - `ActionButton`
   - `Card`
2. להסיר classes שאמורות להיות בבעלות primitives ולהשאיר רק classes ל־layout מקומי.
3. לוודא שההתנהגות נשמרת:
   - לחיצה
   - disabled
   - aria/title

### 1.2 `ListEditModal.svelte`

1. להחליף `modal-overlay`/`modal-content` ב־`ModalShell`.
2. להחליף שדות קלט:
   - `input` -> `TextInput`
   - `textarea` -> `Textarea`
3. להחליף כפתורים ל־`Button`.
4. לוודא סגירה ב־overlay ו־Escape (אם רלוונטי), ושמירת `type="button"` לכפתורים שאינם submit.

קריטריון קבלה לשלב:
- אין שימוש חדש/ישיר ב־classes של מערכת ה־UI באותם קבצים במקום שבו יש primitive מתאים.

---

## שלב 2: ריכוז טקסטים בעברית ל־SSOT (Priority: P2 + P3)

### 2.1 `settings/general/+page.svelte`

1. לאתר את כל הטקסטים העבריים הקשיחים בקומפוננטה.
2. להוסיף מפתחות מתאימים ב־`src/lib/data/texts.ts`.
3. לצרוך אותם דרך `TEXTS` בקומפוננטה.

### 2.2 `dev/debug/export/+page.svelte`

1. לאתר את כל הטקסטים העבריים הקשיחים כולל הודעות fallback.
2. להעביר ל־`texts.ts` במפתחות ברורים (למשל קבוצת `DEBUG_EXPORT_*`).
3. לעדכן את הדף לצרוך דרך `TEXTS`.

קריטריון קבלה לשלב:
- לא נשארות מחרוזות עבריות קשיחות בקבצים הנ"ל.

---

## שלב 3: הסרת כפילות עיצוב `status-indicator` (Priority: P2)

### `TaskRow.svelte`

1. להסיר הגדרות `.status-indicator*` מקומיות שהן שכפול של עיצוב משותף.
2. להשתמש במחלקות המשותפות שכבר קיימות ב־stylesheet הגלובלי.
3. אם חסר וריאנט ספציפי, להוסיף אותו במקום המרכזי (ולא לוקלית ב־`TaskRow`).
4. לשמור על התנהגות ה־UI שהוגדרה:
   - משימה שהושלמה: סימון "וי" (`✓`)
   - משימה נוכחית: עיגול פעיל
   - משימה לא הושלמה: עיגול ריק

קריטריון קבלה לשלב:
- בעלות העיצוב של סטטוסים חוזרת לשכבה המשותפת בלבד.

---

## שלב 4: בדיקות ואימות

1. להריץ `npx @sveltejs/mcp svelte-autofixer` על כל קבצי `.svelte` ששונו.
2. להריץ `bun run check` מתוך `sveltekit-version`.
3. QA ידני קצר:
   - דף `settings/lists`
   - מודאל עריכת רשימה
   - דף `settings/general`
   - דף `dev/debug/export`
   - מסך משימות (`TaskRow` סטטוסים)

קריטריון קבלה לשלב:
- `svelte-check found 0 errors and 0 warnings`
- ללא רגרסיות UI תפקודיות במסכים שנבדקו.

---

## שלב 5: תיעוד, קומיטים ומיזוג

1. לעדכן `docs/features-status.md` בהתאם לתיקונים שהושלמו.
2. לעדכן `docs/walkthrough.md` עם פירוט הביצוע בפועל.
3. לבצע קומיטים אטומיים מוצעים:
   - קומיט A: מעבר ל־primitives (`settings/lists`, `ListEditModal`)
   - קומיט B: ריכוז טקסטים (`settings/general`, `debug/export`, `texts.ts`)
   - קומיט C: תיקון בעלות עיצוב `status-indicator`
   - קומיט D (אם נדרש): עדכוני תיעוד בלבד
4. לבצע merge ל־`main` לאחר בדיקות ירוקות.

---

## סיכונים ונקודות בקרה

1. שבירת UI עקב מעבר ל־primitives:
   - בקרה: QA ידני אחרי כל קומיט אטומי.
2. שינויי ניסוח לא מכוונים בטקסטים:
   - בקרה: להעביר טקסטים as-is בלי שינוי תוכן.
3. סטייה ב־theme behavior ב־`TaskRow`:
   - בקרה: בדיקה בכל ה־themes הפעילים.
