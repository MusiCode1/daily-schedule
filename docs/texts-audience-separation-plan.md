<!--
מסמך תכנון (Plan Mode)
נושא: הפרדת טקסטים שפונים לילד לעומת טקסטים למבוגר (ממשק ניהול)
מטרה: לאפשר יצירת TTS מוקלט מראש לכל טקסטי הילד, מבלי לפגוע בתאימות לאחור.
-->

# הפרדת טקסטים: ילד (Board/Login/Celebration) מול מבוגר (ניהול/הגדרות)

## מטרת השינוי

כרגע כל הטקסטים מרוכזים ב-`sveltekit-version/src/lib/data/texts.ts` תחת אובייקט יחיד `TEXTS`.
הדרישה היא להבדיל בין:

1. **טקסטים שפונים לילד** (מוצגים בממשק הילד וגם/או מוקראים כחלק מרצפי אודיו)
2. **טקסטים שפונים למבוגר** (ממשק ניהול: הגדרות, רשימות, אנשים, גיבוי, פרטיות, מצבי עריכה)

הסיבה: לממשק הילד רוצים לייצר **TTS מוקלט מראש** (MP3) ולצמצם שימוש ב-TTS דפדפן.

---

## מצב קיים (מחקר קצר)

### איפה טקסטים “ילדיים” מופיעים היום?

- **מסך בחירת משתמש**: `src/lib/components/UserSelector.svelte`
  - `TEXTS.USER_SELECTOR_TITLE`
  - `TEXTS.LOGIN_AS(name)` (ARIA)

- **מסך הלוח הראשי**: `src/routes/+page.svelte`
  - רגיל (ילד): `DEFAULT_GREETING_WITH_COMMA`, `PRAISE_ALUF`, `LOCKED_LIST` וכו’
  - מצב עריכה (מבוגר): `EDIT_MODE_ENTER/EXIT`, `ADVANCED_SETTINGS_TITLE`, כרטיסי פעולות וכו’

- **חגיגה / רצף משוב**:
  - `src/lib/components/CelebrationModal.svelte` מציג: `FINISHED_PREFIX`, `NOW_PREFIX`, `ALL_DONE_MESSAGE`
  - `src/lib/services/language.ts` + `src/lib/services/boosts.ts` מייצרים רצפי אודיו (file/tts)

- **משימות שינוי**:
  - `src/lib/logic/tasksBoard.svelte.ts`:
    - `playChangeAnnouncement()` משתמש ב-`TEXTS.CHANGE_LABEL`, `TEXTS.TODAY_NO` עם `tts`.

### איפה טקסטים “מבוגריים” מופיעים היום?

- **מסכי הגדרות**: `src/routes/settings/**`
- **גיבוי Google Drive**: `src/lib/components/GoogleDriveBackup.svelte`
- **פרטיות**: `src/routes/privacy/+page.svelte`
- **דף בדיקה**: `src/routes/test-board/+page.svelte`

---

## עקרונות עיצוב (Design + Architecture)

1. **לא לשבור תאימות לאחור**: `TEXTS.KEY` חייב להמשיך לעבוד בכל הקוד.
2. **SSOT נשמר**: עדיין הכל יישב בקובץ הטקסטים (או לכל היותר באותו מודול), ללא Hardcoded strings בקומפוננטות.
3. **תוספת metadata**: צריך דרך להפיק רשימת מפתחות “ילד” + אילו מהם דורשים הקלטה מראש.

---

## הצעת סכימת הפרדה (מומלצת)

### 1) חלוקה לשני אובייקטים (Child/Admin) + ייצוא מאוחד

ב-`texts.ts` להגדיר:

- `TEXTS_CHILD` – טקסטים שפונים לילד (Board/Login/Celebration)
- `TEXTS_ADMIN` – טקסטים שמופיעים בממשק ניהול (Settings/Edit mode/Backup/Privacy)

בשלב ראשון מומלץ **לא** ליצור `TEXTS_SHARED`, אלא לתייג מפתחות משותפים במטא-דאטה (ראו סעיף "מפתחות משותפים").

ואז:

```ts
export const TEXTS = {
  ...TEXTS_ADMIN,
  ...TEXTS_CHILD
} as const;
```

כך לא צריך לעדכן שום שימוש קיים.

### 2) Metadata לקיטלוג

להוסיף מפה שמאפשרת “מחקר” ושימוש עתידי:

```ts
export type TextAudience = 'child' | 'admin' | 'shared';

export const TEXTS_META = {
  USER_SELECTOR_TITLE: { audience: 'child', tts: 'preRecorded' },
  SETTINGS_TITLE: { audience: 'admin' },
  // ...
} satisfies Record<keyof typeof TEXTS, { audience: TextAudience; tts?: 'preRecorded' | 'runtimeOk' }>;
```

הערה: לא חייבים להגדיר meta לכל מפתח ביום הראשון; אפשר להתחיל עם כל מפתחות הילד + כל מה שמוקרא, ולהרחיב בהדרגה.

### מפתחות משותפים (Child + Admin) שנמצאו בפועל

בוצעה בדיקה על שימושי `TEXTS.*` בפרויקט ונמצאו **6 מפתחות** שמשמשים גם בהקשר ילד וגם בהקשר מבוגר:

1. `CANCEL`
2. `NEW_PERSON`
3. `NO_PEOPLE_IN_DB`
4. `CLICK_ADD_PERSON_TO_START`
5. `SHOW_LIST`
6. `HIDE_LIST`

מסקנה: יש חפיפה קיימת, אבל היא קטנה, ולכן עדיף להתחיל בלי `TEXTS_SHARED` ולהשתמש ב-`audience: 'shared'` ב-`TEXTS_META`.

### 3) פונקציית עזר להפקת רשימות

```ts
export function getTextKeysByAudience(audience: TextAudience) {
  return (Object.keys(TEXTS_META) as Array<keyof typeof TEXTS_META>)
    .filter((k) => TEXTS_META[k].audience === audience);
}
```

---

## רשימת “טקסטי ילד” התחלתית (המלצה)

> הערה: זו רשימה התחלתית לפי שימושים שנמצאו. אפשר לדייק לפי החלטה האם “Tooltips/ARIA” גם נדרשים להקלטה מראש.

### Child – לוגין/בחירת משתמש

- `APP_TITLE`, `APP_TITLE_PART1`, `APP_TITLE_PART2`
- `LOGIN_PAGE_TITLE` (אופציונלי – כותרת דפדפן)
- `LOADING_APP`
- `USER_SELECTOR_TITLE`
- `LOGIN_AS(name)` (ARIA; לרוב לא צריך הקלטה מראש)

### Child – לוח ראשי (במצב רגיל, לא עריכה)

- `DEFAULT_GREETING_WITH_COMMA`
- `PRAISE_ALUF(gender)`
- `LOCKED_LIST` (אם מוצג לילד)
- `NOW`
- `DONE`

### Child – חגיגה/רצפי דיבור

- `WELL_DONE`
- `ALL_DONE_MESSAGE`
- `FINISHED_PREFIX(gender)`
- `NOW_PREFIX`
- `FINISHED_TASK(gender, taskName)`
- `NOW_NEXT(nextTaskName)`

### Child – משימות שינוי (נאמר בקול)

- `CHANGE_LABEL`
- `TODAY_NO`
- `CHANGE_CANCELLED` / `CHANGE_ADDED` (מוצג במודאל עריכה – בפועל מבוגר)

### Child – לוח תקשורת

- `COMMUNICATION_BOARD`
- `OPEN_COMMUNICATION_BOARD` (Tooltip)
- `CLOSE`
- `FLOATING_WINDOW_TITLE` (כותרת חלון)

---

## מה מוגדר כ-Admin (דוגמאות)

### מסכי Settings

- כל מה שנמצא תחת “הגדרות / בחירת משתמש” ב-`managment` (למעט מה ששייך למסך בחירת משתמש שהוגדר ילד)
- `USER_MANAGEMENT`, `LIST_MANAGEMENT`, `PEOPLE_MANAGEMENT`, `GENERAL_SETTINGS`, וכו’

### לוח ראשי במצב עריכה

- `EDIT_MODE_ENTER`, `EDIT_MODE_EXIT`
- `ADVANCED_SETTINGS_TITLE`
- `LIST_ACTIONS_PANEL_TITLE`
- פעולות: `NEW_LIST_ACTION`, `EDIT_LIST_ACTION`, `DELETE_LIST_ACTION`, `RESET_TASKS_ACTION`, `RESET_TASKS_CONFIRM_BOARD`, `HIDE_LIST`, `SHOW_LIST`, `LOCK_LIST`, `UNLOCK_LIST`, וכו’

### גיבוי/פרטיות/בדיקות

- כל מפתחות Google Drive
- כל מפתחות Privacy
- כל מפתחות Test-board

---

## תכנית מיגרציה (שלבים)

### שלב 1 – ארגון פנימי בלבד (ללא שינוי קוד צרכן)

1. לפצל את התוכן ב-`texts.ts` ל-`TEXTS_CHILD`/`TEXTS_ADMIN`.
2. להשאיר `export const TEXTS = { ... }` באותו שם/חתימה.
3. להוסיף `TEXTS_META` עם `audience` ולפחות לכל מפתחות הילד + כל מפתח שמשמש לדיבור.

### שלב 2 – “רשימת הקלטות” ל-TTS

להוסיף utility שיוצר רשימה קבועה של “משפטים מוקלטים מראש” (למשל עבור `CHANGE_LABEL`, `TODAY_NO`, `ALL_DONE_MESSAGE`).
אפשר לייצא `CHILD_TTS_KEYS`/`CHILD_TTS_PHRASES` כדי להקל על הפקת MP3.

### שלב 3 – הקטנת שימוש ב-TTS דפדפן

1. להחליף במקומות כמו `playChangeAnnouncement()` את `{ type: 'tts' }` ל-`{ type: 'file' }` כאשר נוספו קבצים.
2. להשאיר fallback ל-TTS כאשר קובץ לא קיים (כפי שה-sequencer כבר עושה resolve גם בשגיאה).

---

## הערות חשובות

- משימות (שמות פעילויות) כבר ממופות ל-`ACTIVITIES` ומושמעות כקובץ אם יש התאמה (`LanguageService.findActivityIdByName`). זה כבר כמעט “TTS מוקלט מראש”.
- שמות משתמשים גם ממופים לקבצים (`names/*.mp3`) עם fallback ל-TTS.
- לכן השינוי העיקרי הוא **הפרדת טקסטים “סטטיים” של הילד** + יצירת pipeline להפקת MP3 עבורם.
