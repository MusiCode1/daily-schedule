# מדריך פורמטים של כללי AI (AI Rules Guide)

מדריך זה סוקר את הפורמטים השונים של קבצי כללים (Rules) עבור כלי פיתוח מבוססי AI כגון Cursor, Qoder ועוד.

## 1. Cursor AI (`.mdc`)

Cursor משתמש בקבצי `.mdc` בתיקיית `.cursor/rules`.

### מבנה הקובץ

קובץ Markdown עם Frontmatter (כותרת מטא-דאטה).

```markdown
---
description: תיאור מתי הכלל רלוונטי (למשל: "כתיבת קוד ב-Svelte")
globs: src/**/*.svelte, src/**/*.ts
alwaysApply: false
---

# תוכן הכלל

הנחיות, דוגמאות קוד, וכו'.
```

### שדות Frontmatter

- **`description`** (חובה): טקסט קצר המסביר למודל מתי להחיל את הכלל. אם `alwaysApply` הוא `false`, המודל מסתמך על התיאור הזה.
- **`globs`** (אופציונלי): רשימת תבניות קבצים מופרדת בפסיקים. הכלל יחול אוטומטית כשהמשתמש עובד על קבצים תואמים.
- **`alwaysApply`** (אופציונלי): `true` / `false`.
  - `true`: הכלל נטען **תמיד** לכל צ'אט (Global Context).
  - `false`: (ברירת מחדל) נטען רק אם יש התאמה ב-`globs` או שהמודל מחליט שהוא רלוונטי לפי ה-`description`.

---

## 2. Qoder AI (`.md` ב-`.qoder/rules`)

Qoder מנהל כללים בתיקיית `.qoder/rules`.

### סוגי כללים וטריגרים

Qoder תומך בהגדרות דומות, ולעיתים משתמש במינוחים שונים ב-Frontmatter או בממשק.

- **Always Apply** (`trigger: always_on`): הכלל תמיד פעיל.
- **Specific Files** (`globs`): חל על קבצים מסוימים.
- **Manual** (`trigger: manual`): חל רק כשמבקשים אותו ידנית (למשל `@ruleName`). ב-Cursor זה מקביל ל-`alwaysApply: false` ללא `globs`.

### דוגמה (Qoder / Agent)

```markdown
---
trigger: always_on
# או
trigger: manual
---

תוכן הכלל...
```

---

## 3. General AI Agents (`AGENTS.md`, `.agent/rules`)

פורמטים גנריים המשמשים סוכנים שונים (כמו ה-Agent הנוכחי).

### מיפוי נפוץ

הסקריפט שלנו (`scripts/sync-rules.ts`) מבצע מיפוי בין הפורמטים:

| תכונה         | Cursor (`.mdc`)      | Qoder / Agent (`.md`)              | הערות                        |
| :------------ | :------------------- | :--------------------------------- | :--------------------------- |
| **תמיד פעיל** | `alwaysApply: true`  | `trigger: always_on`               | נטען תמיד לקונטקסט.          |
| **ידני בלבד** | `alwaysApply: false` | `trigger: manual`                  | נטען רק לפי דרישה/זיהוי חכם. |
| **לפי קובץ**  | `globs: *.ts`        | `globs: *.ts` (או `trigger: glob`) | נטען בעריכת קבצים תואמים.    |

## סיכום

- השתמש ב-**`alwaysApply: true`** (Cursor) או **`trigger: always_on`** (Qoder) לכללים שצריכים להיות תמיד ברקע (כגון חוקי פרויקט בסיסיים, סגנון קידוד).
- השתמש ב-**`description`** חזק לכללים ספציפיים, כדי שהמודל ידע למשוך אותם כשצריך (למשל "שימוש ב-Tailwind").
- השתמש ב-**`globs`** לכללים שקשורים לטכנולוגיה ספציפית שנמצאת בקבצים מסוימים (למשל כללי SQL רק בקבצי `.sql`).
