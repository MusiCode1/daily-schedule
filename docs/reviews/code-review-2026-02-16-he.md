# ממצאי סקירה - 16/02/2026

תוכנית פעולה מפורטת: `docs/plans/review-remediation-plan-2026-02-16.md`

בסיס הקוד כרגע עדיין לא עומד במלואו בכללי הפרויקט המחייבים:
- במסכים מרכזיים עדיין עוקפים את שכבת ה־UI primitives.
- טקסטים בעברית שמוצגים למשתמש עדיין כתובים ישירות בתוך קומפוננטות במקום ריכוז ב־`texts.ts`.
- בשינוי האחרון של `TaskRow` נוספה כפילות באחריות על עיצוב סטטוסים.

## ממצאים מפורטים

- [P2] להחליף שימוש ישיר במחלקות Design System ב־UI primitives — `D:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/src/routes/(admin)/settings/lists/+page.svelte:122`
  דף ניהול הרשימות עדיין משתמש במחלקות גולמיות כמו `btn-primary`, `action-btn`, ו־`card` על אלמנטים נייטיביים במקום ב־`Button`, `ActionButton`, ו־`Card`. כך נשמר API מקביל ל־UI, ועדכונים עתידיים בהתנהגות primitives (וריאנטים, ברירות מחדל, נגישות, מיפוי themes) לא יחלחלו למסך הזה, מה שמשאיר את הקוד ללא תאימות לכלל “primitives בלבד”.

- [P2] להעביר את בקרות הטופס במודאל ל־shared primitives — `D:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/src/lib/components/ListEditModal.svelte:72`
  המודאל עדיין מרנדר `modal-overlay`/`modal-content` ישירות ומשתמש ב־`input`/`btn` גולמיים במקום `ModalShell`, `TextInput`/`Textarea`, ו־`Button`. השארת התנהגות מודאל וטפסים מחוץ לשכבת primitives מקשה על עקביות ותחזוקה, ומפרה ישירות את כלל הפרויקט לצריכת שכבת primitives משותפת.

- [P2] להעביר טקסט עברי קשיח ל־`texts.ts` — `D:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/src/routes/(admin)/settings/general/+page.svelte:9`
  דף ההגדרות הכלליות כולל מחרוזות עבריות ישירות בתוך הקומפוננטה במקום שימוש ב־`TEXTS`. זה שובר את כלל ה־SSOT לטקסטים המוצגים למשתמש ומעלה סיכון לסטייה (עדכוני ניסוח/תרגום ידרשו חיפוש בקומפוננטות במקום עדכון מרכזי אחד).

- [P3] לרכז טקסטים עבריים גם בדף debug אל שכבת השפה — `D:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/src/routes/(dev)/debug/export/+page.svelte:93`
  דף ה־debug מכיל כמה מחרוזות עבריות קשיחות (כולל הודעת fallback לשגיאה) ישירות בקומפוננטה במקום דרך `TEXTS`. גם אם זה ראוט פיתוח, זה עדיין מפר את כלל הריכוז של טקסטים למשתמש ומגדיל עלות תחזוקה בשינוי ניסוחים.

- [P2] להימנע מהגדרה מקומית מחדש של עיצוב `status-indicator` משותף — `D:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/src/routes/(board)/tasks/_components/TaskRow.svelte:352`
  אינדיקטור הסטטוס החדש מוסיף כללי `.status-indicator*` מקומיים למרות שהמחלקות כבר קיימות ב־stylesheet משותף של מערכת העיצוב. זה יוצר כפילות בבעלות על סגנון ועלול להוציא את התנהגות ה־theme מסנכרון (במיוחד בעדכוני tokens/themes), בניגוד לגישת הריכוז של רכיבי UI חוזרים.
