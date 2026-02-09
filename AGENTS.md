# הנחיות קבועות לסוכן (Codex) בפרויקט daily-schedule

המטרה של הקובץ הזה היא להבטיח שבכל משימה אתה עובד לפי מערכת החוקים של הפרויקט, שמנוהלת ב-`.cursor/rules`.

## מקור האמת לחוקים

בכל תחילת משימה (או כשעולה ספק), יש לקרוא ולהחיל את החוקים הרלוונטיים מתוך:

- `.cursor/rules/agent-guide.mdc` (מדריך ראשי, מקוצר)
- `.cursor/rules/agent-guide-extended.mdc` (הרחבה: דוגמאות/פרטים טכניים)
- `.cursor/rules/architecture.mdc` (חוקי ארכיטקטורה והפרדת שכבות)
- `.cursor/rules/project-rules.mdc` (שפה, טקסטים, Git, כללי עבודה)
- `.cursor/rules/css-architecture-rules.mdc` (CSS/Tailwind/PostCSS שכבות ועקרונות)
- `.cursor/rules/feature-tracking.mdc` (חובת עדכון `docs/features-status.md`)
- `.cursor/rules/svelte-mcp.mdc` (שימוש ב-Svelte MCP)
- `.cursor/rules/svelte-code-writer.mdc` (כללים וכלים לכתיבת/עריכת קוד Svelte)

## איך ליישם בפועל (כלל אצבע)

- אם משימה נוגעת לקוד Svelte (`.svelte`, `.svelte.ts`, `.svelte.js`): קרא לפחות את `svelte-mcp.mdc` ו-`svelte-code-writer.mdc` לפני שינויים.
- אם משימה נוגעת למבנה/לוגיקה/Stores/Controllers: קרא לפחות את `architecture.mdc` ו-`agent-guide.mdc`.
- אם משימה נוגעת לעיצוב: קרא לפחות את `css-architecture-rules.mdc`.
- אם יושם פיצ'ר/תוקן באג: עדכן את `docs/features-status.md` לפי `feature-tracking.mdc` (וגם את `docs/walkthrough.md` אם זה חלק מהתהליך הרגיל בפרויקט).

## הבהרה

החוקים ב-`.cursor/rules` הם מקור האמת. אם יש סתירה בין זיכרון/הרגלים לבין קבצי החוקים, יש לפעול לפי קבצי החוקים.

