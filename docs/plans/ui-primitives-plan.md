# תכנית פרימיטיבים (UI Primitives) + אימוץ הדרגתי + החלה מלאה

## תקציר
ניצור סט פרימיטיבים דקים ב־`sveltekit-version/src/lib/components/ui` שממפים 1:1 ל־classes הקיימות ב־`sveltekit-version/src/routes/components.css`, בלי `<style>` בתוך הפרימיטיבים. הפרימיטיבים יספקו API "היברידי קשיח": props ל־variants/sizes כמסלול ברירת מחדל, ועדיין `class` חיצוני + `...rest` לכל מה שצריך.

אחר כך נבדוק/נמפה את הצריכה בפרויקט הקיים ונרפקטור בהדרגה עד שממש אין שימוש ישיר ב־classes הללו מחוץ לפרימיטיבים.

## החלטות שננעלו
1. מיקום: `sveltekit-version/src/lib/components/ui`.
2. API: Hybrid strict (variant/size props מועדפים; `class` נשאר להרחבות).
3. Tailwind בפרימיטיבים: בשלב 1 אין `<style>`, ואין Tailwind utilities פנימיים. Tailwind (אם צריך) יישב אצל הצרכן.

---

## שלב 1: יצירת פרימיטיבים (הגדרה החלטית של הסט + APIs)

### 1) תשתית משותפת
1. ליצור `sveltekit-version/src/lib/components/ui/cx.ts`
1. פונקציה `cx(...parts: Array<string | false | null | undefined>) => string` שמחברת classes.
1. ליצור `sveltekit-version/src/lib/components/ui/index.ts`
1. Barrel exports לכל הפרימיטיבים.
1. ליצור `sveltekit-version/src/lib/components/ui/types.ts`
1. טיפוסים מרכזיים ל־variants/sizes כדי לא לשכפל.

### 2) Button
קובץ: `sveltekit-version/src/lib/components/ui/Button.svelte`

API:
1. `variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'edit' | 'outline' | 'text'` (ברירת מחדל `default`)
1. `size?: 'md' | 'sm' | 'xs'` (ברירת מחדל `md`)
1. `type?: 'button' | 'submit' | 'reset'` (ברירת מחדל `button` כדי לא לשבור טפסים)
1. `class?: string` (מוסף לבסיס)
1. `...rest`: כל HTML attrs כולל `disabled`, `title`, `aria-*`, `onclick`, וכו'

מיפוי CSS:
1. תמיד: `btn`
1. variant:
1. `default` => ללא תוספת
1. `primary` => `btn-primary`
1. `secondary` => `btn-secondary`
1. `danger` => `btn-danger`
1. `warning` => `btn-warning`
1. `edit` => `btn-edit`
1. `outline` => `btn-outline`
1. `text` => `btn-text`
1. size:
1. `sm` => `btn-sm`
1. `xs` => `btn-xs`

כלל "קשיחות היברידית" (תיעודי בשלב 1):
1. לא מעבירים ידנית `btn-*` ב־`class` חיצוני בקוד חדש. משתמשים ב־`variant`/`size`.
1. `class` נשמר ל־layout נקודתי (Tailwind utilities, grid, spacing) או "תיקון אחרון".

דוגמת שימוש:
```svelte
<Button variant="danger" onclick={onDelete}>מחק</Button>
<Button variant="outline" size="sm" class="mt-4">עוד</Button>
<Button type="submit" variant="primary">שמור</Button>
```

### 3) IconButton
קובץ: `sveltekit-version/src/lib/components/ui/IconButton.svelte`

API:
1. `tone?: 'default' | 'danger'` (ברירת מחדל `default`)
1. `type?: 'button' | 'submit' | 'reset'` (ברירת מחדל `button`)
1. `class?: string`
1. `...rest` (כולל `aria-label`, `title`, `onclick`)

מיפוי CSS:
1. תמיד: `btn-icon`
1. `tone === 'danger'` מוסיף `btn-icon-danger`

דוגמת שימוש:
```svelte
<IconButton title={TEXTS.DELETE_ACTION} tone="danger" onclick={handleDelete}>✕</IconButton>
```

### 4) FabButton
קובץ: `sveltekit-version/src/lib/components/ui/FabButton.svelte`

API:
1. `type?: 'button' | 'submit' | 'reset'` (ברירת מחדל `button`)
1. `class?: string`
1. `...rest`

מיפוי CSS:
1. תמיד: `btn-fab`

### 5) ActionButton
קובץ: `sveltekit-version/src/lib/components/ui/ActionButton.svelte`

API:
1. `tone?: 'default' | 'danger'` (ברירת מחדל `default`)
1. `type?: 'button' | 'submit' | 'reset'` (ברירת מחדל `button`)
1. `class?: string`
1. `...rest`

מיפוי CSS:
1. תמיד: `action-btn`
1. `tone === 'danger'` מוסיף `action-btn-danger`

### 6) Card
קובץ: `sveltekit-version/src/lib/components/ui/Card.svelte`

API:
1. `as?: 'div' | 'section' | 'article'` (ברירת מחדל `div`)
1. `class?: string`
1. `...rest`

מיפוי CSS:
1. תמיד: `card`

### 7) Badge
קובץ: `sveltekit-version/src/lib/components/ui/Badge.svelte`

API:
1. `tone?: 'neutral' | 'success' | 'warning' | 'danger'` (ברירת מחדל `neutral`)
1. `as?: 'span' | 'div'` (ברירת מחדל `span`)
1. `class?: string`
1. `...rest`

מיפוי CSS:
1. תמיד: `badge`
1. `success` => `badge-success`
1. `warning` => `badge-warning`
1. `danger` => `badge-danger`

### 8) TextInput / Textarea / Select
קבצים:
1. `sveltekit-version/src/lib/components/ui/TextInput.svelte`
1. `sveltekit-version/src/lib/components/ui/Textarea.svelte`
1. `sveltekit-version/src/lib/components/ui/Select.svelte`

API משותף:
1. `class?: string`
1. `...rest` (כולל `bind:value`, `placeholder`, `required`, `oninput`, `onchange` וכו')

מיפוי CSS:
1. תמיד: `input` (כלומר class `input`)

הערה חשובה לשימוש:
1. ב־Svelte, ה־events יעברו כ־props (`onclick`, `oninput`, `onchange`) דרך `...rest`, לכן הצריכה תהיה `onclick={...}` ולא `on:click` על הקומפוננטה.

### 9) ModalShell
קובץ: `sveltekit-version/src/lib/components/ui/ModalShell.svelte`

מטרה:
1. לתת "מעטפת" אחידה למודאלים: overlay + content, שימוש ב־`.modal-overlay` ו־`.modal-content`.

API:
1. `open: boolean`
1. `onClose?: () => void`
1. `closeOnOverlayClick?: boolean` (ברירת מחדל `true`)
1. `contentClass?: string` (תוספת ל־`.modal-content`)
1. `overlayClass?: string` (תוספת ל־`.modal-overlay`)
1. Slot ברירת מחדל: תוכן המודאל

התנהגות:
1. אם `open === false` לא מרנדרים כלום.
1. קליק על overlay יסגור רק אם `closeOnOverlayClick` וגם `target===currentTarget`.
1. `role="dialog" aria-modal="true"` על content.

---

## שלב 2: בדיקת צריכה בפרויקט הקיים (מיפוי + סדר אימוץ)
מטרה: לא לשבור UI, להחליף נקודתית שימוש ב־classes לפרימיטיבים, ולזהות התנגשויות שמפריעות ליעד "אין שימוש ישיר".

1. להפיק "מפת שימוש" (מוכוון קבצים).
1. זיהוי שימוש ישיר ב־`.btn`, `.input`, `.badge`, `.card`, `.modal-overlay`, `.modal-content`, `.btn-icon`, `.action-btn`, `.btn-fab`.
1. זיהוי מחלקות עם שם זהה שמוגדרות גם גלובלית וגם לוקלית (למשל ב־`TaskRow.svelte` יש `.action-btn`/`.now-indicator` מקומיים מול גלובלי).

2. סדר אימוץ מומלץ (מקטין סיכוי רגרסיות).
1. `ListEditModal.svelte`
1. `GoogleDriveBackup.svelte`
1. `AddModal.svelte`
1. מסכי `routes/settings/*`
1. `TaskRow.svelte` (בשלב מאוחר יותר בגלל התנגשויות class names ועיצוב ייחודי)

3. "כלל זמני" בזמן האימוץ.
1. מותר להשאיר CSS מקומי ייחודי למסך.
1. אסור להוסיף שימוש חדש ישיר ב־classes של הפרימיטיבים על אלמנטים רגילים. משתמשים בפרימיטיבים.

---

## שלב 3: יישום מלא על כל הפרויקט (אפס שימוש ישיר מחוץ ל־ui)
מטרה: להגיע למצב שבו כל שימוש ב־classes של "מערכת הקומפוננטות" מופיע רק בתוך `src/lib/components/ui` (או בקומפוננטות UI יותר גבוהות שמבוססות על הפרימיטיבים).

1. רפקטור מלא לפי "משפחות".
1. Buttons: להחליף כל `<button class="btn...">` ל־`<Button ...>`.
1. Inputs: להחליף `<input class="input">` ל־`<TextInput>`, וכן הלאה.
1. Badges/Cards/Modals: להחליף למקבילות.

2. טיפול בהתנגשויות שמונעות עקביות.
1. בכל מקום שיש class מקומי בשם שמוגדר גם ב־`components.css`, לבחור אחד:
1. לאמץ את הגלובלי ולהסיר את הלוקלי.
1. או לשנות את הלוקלי לשם חדש כדי לא "לדרוס" את Design System.

3. אכיפה אוטומטית (כדי להבטיח "אין מקום שלא משתמש").
1. להוסיף סקריפט בדיקה שמריץ `rg` על `.svelte` ומכשיל אם מוצא שימוש ישיר ב־`class="...btn..."` וכו' מחוץ ל־`src/lib/components/ui`.
1. החרגות נקודתיות יוגדרו במפורש (למשל קבצים שנמצאים בתהליך רפקטור).

---

## שינויים/ממשקים ציבוריים
קומפוננטות חדשות תחת `$lib/components/ui`:
1. `Button`, `IconButton`, `FabButton`, `ActionButton`
1. `Card`, `Badge`
1. `TextInput`, `Textarea`, `Select`
1. `ModalShell`
1. `cx` ו־`types` ו־`index` לייצוא

הנחיית שימוש מרכזית:
1. מאז שלב 1, אירועי DOM יעברו כ־props (`onclick`, `oninput`, `onchange`) דרך `...rest`.

---

## בדיקות וקבלה
1. `npm run check` ב־`sveltekit-version`.
1. `npm run lint` ב־`sveltekit-version` אחרי כל גל אימוץ.
1. בדיקות UI ידניות:
1. מעבר בין themes (`theme-focus`, `theme-playful`, `theme-gradient`, `theme-contrast`) ולוודא שהפרימיטיבים משתנים בהתאם.
1. פתיחה/סגירה של מודאלים מרכזיים, כולל קליק על overlay.
1. טפסים: לוודא שכפתורים לא עושים submit בטעות (ברירת מחדל `type="button"`), ובמקומות שצריך submit להעביר `type="submit"`.

---

## תיעוד
1. כאשר נתחיל ליישם בפועל (לא בשלב התכנון), לעדכן `docs/features-status.md` בהתאם לכלל ב־`.cursor/rules/feature-tracking.mdc`.
1. לעדכן `docs/walkthrough.md` בסיום כל משימת יישום, לפי הכללים ב־`agent-guide.mdc`.

---

## הנחות ברירת מחדל (אם יתגלו חריגים בזמן יישום)
1. `Button` ברירת מחדל `type="button"`.
1. `class` חיצוני תמיד מותר לצרכי layout, אבל לא למטרות variant של מערכת הכפתורים.
1. `components.css` נשאר מקור העיצוב המרכזי בשלב הראשון; אין פיצול CSS לקומפוננטות עדיין.

