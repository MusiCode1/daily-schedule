# חוקי ארכיטקטורת CSS - 3 שכבות + @apply + Nested CSS

> **קהל יעד:** עוזר AI  
> **מטרה:** מדריך מהיר ליישום ארכיטקטורת ה-CSS של הפרויקט

---

## מבנה הליבה

```
1. Design Tokens (:root)           → משתני CSS (לא שכבה)
2. Theme Variations (.theme-*)     → משתני CSS (לא שכבה)
3. @layer base, components, theme-overrides;
4. @layer base                     → מבנה בסיסי + איפוסים
5. @layer components               → קומפוננטות לשימוש חוזר (עם @apply)
6. @layer theme-overrides          → דריסות ספציפיות לערכת עיצוב (עם nested CSS)
```

---

## הגדרות PostCSS

**קריטי:** הפרויקט משתמש ב-**PostCSS** עבור Tailwind CSS v4.

### postcss.config.js

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

### תלויות ב-package.json

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.17",
    "postcss": "^8.4.49"
  }
}
```

---

## כללים קריטיים

### שכבות (Layers)

```css
/* תמיד הצהר על סדר השכבות ראשון! */
@layer base, components, utilities, theme-overrides;

/* השכבות מנצחות לפי הסדר, לא לפי ספציפיות */
/* theme-overrides > utilities > components > base */
```

### שימוש ב-@apply

**✅ השתמש ב-@apply עבור:**
- קומפוננטות שחוזרות 3+ פעמים: `.btn`, `.card`, `.avatar`, `.badge`, `.modal`
- קומפוננטות מורכבות עם מצבים (hover, focus, active)

**❌ אל תשתמש ב-@apply עבור:**
- כלי עזר פשוטים: `.flex`, `.grid`, `.gap-2`, `.mt-4`
- פריסות חד-פעמיות
- קוד שמופיע 1-2 פעמים בלבד

**כלל אצבע:** אם זה חוזר 3+ פעמים → @apply. אחרת → Tailwind inline.

### ארגון תכונות

**קריטי:** תכונות CSS חייבות להיות מאורגנות בסדר הזה:

1. **מיקום (Positioning)** → `position`, `top`, `right`, `z-index`, `display`, `flex`, `grid`
2. **מודל קופסה (Box Model)** → `width`, `height`, `padding`, `margin`, `border`
3. **טיפוגרפיה (Typography)** → `font-*`, `text-*`, `line-height`, `letter-spacing`
4. **ויזואלי (Visual)** → `color`, `background`, `opacity`
5. **אפקטים (Effects)** → `transform`, `transition`, `animation`, `cursor`

**תהליך עבודה:**
- **שלב הפיתוח:** התמקד בפונקציונליות, אל תדאג לסדר
- **מעבר ארגון:** לאחר השלמת פיצ'ר, הרץ "מעבר ארגון CSS" ייעודי לסידור מחדש של התכונות

**דוגמה:**

```css
.my-component {
  /* Positioning */
  position: relative;
  @apply flex items-center justify-center;
  
  /* Box Model */
  @apply w-full h-20 p-4;
  border: 2px solid;
  @apply border-slate-200 rounded-lg;
  
  /* Typography */
  font-size: 1rem;
  font-weight: 600;
  
  /* Visual */
  @apply bg-white;
  color: var(--text-main);
  
  /* Effects */
  cursor: pointer;
  @apply transition-all;
}
```

### קינון (Nesting)

**✅ השתמש ב-nested CSS עבור:**
- דריסות ערכת עיצוב (כל הדריסות בבלוק אחד)
- בוררי פסאודו עם `&` (`:hover`, `:active`, `:focus`)
- מקסימום 3 רמות עומק

**❌ אל תקנן:**
- יותר מ-3 רמות
- מחוץ ל-`@layer theme-overrides`

---

## תבניות קוד

### קומפוננטה עם @apply

```css
@layer components {
  .btn {
    @apply px-6 py-3 font-bold transition-all cursor-pointer;
    background: var(--primary);
    border-radius: var(--border-radius);
    
    &:hover {
      @apply brightness-110;
    }
    
    &:active {
      @apply scale-95;
    }
  }
}
```

### דריסת ערכת עיצוב עם קינון

```css
@layer theme-overrides {
  .theme-playful {
    .btn {
      @apply shadow-lg transform translate-y-0;
      
      &:hover {
        @apply -translate-y-0.5 shadow-xl;
      }
      
      &:active {
        @apply translate-y-1;
        box-shadow: 0 0 0 0;
      }
    }
    
    .card {
      @apply border-b-[6px] border-gray-300;
    }
  }
}
```

### אסימוני עיצוב (Design Tokens)

```css
:root {
  /* צבעים */
  --primary: #6366f1;
  --secondary: #8b5cf6;
  --success: #10b981;
  --danger: #ef4444;
  
  /* טיפוגרפיה */
  --text-main: #334155;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  
  /* מרווחים */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  
  /* גבולות וצללים */
  --border-radius: 16px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}
```

### וריאציית ערכת עיצוב

```css
.theme-playful {
  --primary: #f59e0b;
  --border-radius: 24px;
  --bg-main: #fff7ed;
  background-image: radial-gradient(#fbbf24 2px, transparent 2px);
  background-size: 32px 32px;
}
```

---

## מבנה קבצים (עתידי)

```
src/styles/
├── tokens/
│   └── design-tokens.css          ← :root
├── themes/
│   ├── focus.css                  ← .theme-focus
│   ├── playful.css
│   ├── gradient.css
│   └── contrast.css
├── layers/
│   ├── base.css                   ← @layer base
│   ├── components.css             ← @layer components (עם @apply)
│   └── theme-overrides.css        ← @layer theme-overrides (עם nesting)
└── main.css                       ← מייבא הכל + מצהיר על סדר השכבות
```

### main.css

```css
/* 1. הצהר על סדר השכבות תחילה */
@layer base, components, theme-overrides;

/* 2. אסימונים (משתנים) */
@import './tokens/design-tokens.css';

/* 3. ערכות עיצוב (משתנים) */
@import './themes/focus.css';
@import './themes/playful.css';
@import './themes/gradient.css';
@import './themes/contrast.css';

/* 4. שכבות (הסדר לא משנה, הוצהר למעלה) */
@import './layers/base.css';
@import './layers/components.css';
@import './layers/theme-overrides.css';
```

---

## דפוסי שימוש ב-HTML

### ✅ מושלם: קומפוננטה + כלי עזר

```html
<button class="btn flex items-center gap-2">
  <!--     ↑        ↑ inline utilities      -->
  <!--     └ component from @apply          -->
  <span>שמור</span>
</button>
```

### ✅ קומפוננטה בלבד

```html
<div class="card">
  <h3>כותרת</h3>
</div>
```

### ✅ קומפוננטה + וריאנט

```html
<button class="btn btn-secondary">ביטול</button>
<button class="btn btn-danger">מחק</button>
```

---

## רשימת בדיקה לקומפוננטות חדשות

- [ ] האם זה חוזר 5+ פעמים? → השתמש ב-@apply
- [ ] משתמש במשתני CSS לערכים תלויי ערכת עיצוב?
- [ ] בתוך השכבה הנכונה?
- [ ] קינון ≤ 3 רמות?
- [ ] משתמש ב-`&` עבור בוררי פסאודו?
- [ ] דריסות ערכת עיצוב ב-`@layer theme-overrides`?

---

## כן ✅

1. השתמש במשתני CSS לערכים תלויי ערכת עיצוב
2. הצהר על סדר `@layer` בראש
3. השתמש ב-@apply רק עבור קומפוננטות חוזרות (5+)
4. שמור על קינון ≤ 3 רמות
5. כל דריסות ערכת העיצוב ב-`@layer theme-overrides`
6. השתמש ב-nested CSS עבור דריסות ערכת עיצוב
7. שלב מחלקות קומפוננטה + כלי עזר inline

---

## לא ❌

1. אל תשתמש ב-`!important` (אלא אם זה הכרחי לחלוטין)
2. אל תערבב שכבות (שמור כל דבר במקום שלו)
3. אל תכתוב CSS מחוץ לשכבות (מלבד אסימונים/ערכות עיצוב)
4. אל תשכפל משתנים (מקור אמת יחיד)
5. אל תשתמש בערכים קשיחים במקום משתנים
6. אל תשתמש ב-@apply עבור כל כלי עזר קטן
7. אל תקנן יותר מ-3 רמות
8. אל תכתוב דריסות ערכת עיצוב מחוץ ל-`@layer theme-overrides`

---

## מדריך מהיר: מתי להשתמש במה

| תרחיש | פתרון |
|----------|----------|
| קומפוננטה חוזרת 5+ פעמים | `@layer components { .btn { @apply ... } }` |
| קומפוננטה חוזרת 1-4 פעמים | מחלקות Tailwind inline |
| עיצוב ספציפי לערכת עיצוב | `@layer theme-overrides { .theme-x { .btn { } } }` |
| בורר פסאודו | `&:hover`, `&:active`, `&:focus` |
| ערך תלוי ערכת עיצוב | משתנה CSS: `var(--primary)` |
| ערך קבוע (זהה בכל ערכות העיצוב) | Inline או Tailwind |

---

## פילוסופיה

> **"מחלקות קומפוננטה לבסיס, כלי עזר של Tailwind לגמישות, דריסות ערכת עיצוב לייחודיות"**

---


### ירושה עם @utility
מידע שלקח לנו הרבה זמן לגלות.
ככל הנראה לא נשמש בו בפרוייקט הזה.

**ירושה של קומפוננטות:** הגדר utilities לשימוש חוזר ב-`components.css`:


**שגיאה בדוגמא!! @utility אינו יכול להיות מקונן**
```css
/* components.css */
@layer utilities {
  @utility card-base {
    @apply bg-white border border-slate-200 rounded-2xl p-6 
           flex flex-col items-center gap-4
           transition-all duration-300 ease-in-out shadow-md;
  }
  
  @utility btn-icon {
    @apply w-10 h-10 p-0 border border-slate-200 rounded-lg
           flex items-center justify-center bg-slate-50;
  }
}
```

**שימוש בקומפוננטות עם ירושה בשורה נפרדת:**

```svelte
<style>
  @reference "tailwindcss";
  
  .list-card {
    @apply card-base;  /* ירושה - שורה נפרדת! */
    @apply border-2 p-5 gap-3 duration-200;
  }
  
  .user-actions {
    @apply btn-icon;  /* ירושה */
    @apply flex gap-3 mt-2;  /* Tailwind */
  }
</style>
```

**כלל קריטי:** utilities מותאמים אישית חייבים להיות מיושמים בשורה נפרדת כדי להבדיל אותם מ-utilities מובנים של Tailwind.

**קריטי:** תמיד הוסף `@reference "tailwindcss";` בעת שימוש ב-@apply בבלוקים של `<style>`!

## גרסה

- **נוצר:** 2026-01-20
- **גרסה:** 1.0
- **מבוסס על:** docs/css-architecture-guide.md v2.0
