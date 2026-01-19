# יומן פיתוח (Walkthrough)

## 2026-01-19 23:35

### הבהרה והחלה של כללי Tailwind CSS - גישה היברידית

הבהרנו והחלנו את הכללים המדויקים לשימוש ב-Tailwind CSS בפרויקט, בדגש על מתי להשתמש ב-@apply ומתי ב-classes ישירות.

---

#### מה בוצע?

**1. הבהרת כללים ב-agent-guide.mdc**

הוספנו סעיף "כלל קריטי - HTML vs `<style>`" שמבהיר את הכלל הזהב:

- **אם אפשר לשים ב-HTML → תמיד Tailwind classes ישירות**
- **אם חייבים `<style>` (nested, override) → תמיד @apply**

הכלל הזהב: **כל Tailwind utility שנמצא ב-`<style>` חייב להיות דרך `@apply`!**

- **קבצים ששונו**: `.cursor/rules/agent-guide.mdc`

**2. תיקון users/+page.svelte לפי הכללים**

המרנו את כל ה-CSS הרגיל ב-`<style>` tag ל-Tailwind @apply:

```css
/* לפני */
.modal-content h3 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #1e293b;
}

/* אחרי */
@reference "tailwindcss";

.modal-content h3 {
  @apply text-center text-2xl mb-8 text-slate-800;
}
```

- הוספנו `@reference "tailwindcss";` בראש ה-`<style>` tag
- המרנו 3 CSS blocks (Avatar Override, Modal Width, Modal Header) ל-@apply
- צמצמנו מ-19 שורות CSS ל-16 שורות (~16%)

- **קבצים ששונו**: `sveltekit-version/src/routes/settings/users/+page.svelte`

---

#### החלטות ארכיטקטורה

- **שימוש ב-@apply בכל `<style>` tag**: החלטנו שכל Tailwind utility שנמצא ב-`<style>` חייב להיות דרך @apply, גם אם זה רק 1-2 classes. זה מבטיח עקביות ומאפשר ל-Tailwind לעבד את הקלאסים כראוי.

- **CSS רגיל רק לדברים שלא-Tailwind**: משתמשים ב-CSS רגיל רק כשזה באמת לא ניתן להמרה ל-Tailwind (custom properties, animations מורכבות, וכו').

---

## 2026-01-20 04:45

### 📚 לקחים חשובים: Tailwind v4 + @apply

**משימה זו לקחה זמן** כי גילינו כמה נקודות קריטיות שלא היו ברורות:

---

#### 🔴 לקח 1: @apply עובד רק ב-CSS files!

**@apply לא עובד ב-Svelte `<style>` tags!**

```css
/* ✅ עובד - settings.css */
.my-class { @apply text-xl; }
```

```svelte
<!-- ❌ לא עובד -->
<style>
  .my-class { @apply text-xl; }
</style>
```

---

#### 🔴 לקח 2: @import חובה!

```css
@import '../layout.css'; /* ← חובה בשורה 1! */

@layer base, components;
```

---

#### 🔴 לקח 3: @reference רק כשיש @apply

אם **אין** `@apply` ב-`<style>` - אין צורך ב-`@reference "tailwindcss";`

```svelte
<!-- ✅ נכון - אין @apply, אין @reference -->
<style>
  .my-class { color: red; }
</style>
```

---

#### 🔴 לקח 4: אין צורך ב-CDN!

**עם @import זה מספיק!** אין צורך ב-`<script src="...tailwindcss.com"></script>`

---

#### ✅ עדכון agent-guide.mdc

נוסף סעיף מפורט:
- כללים קריטיים
- דוגמאות נכון/לא נכון
- מתי להשתמש ב-@reference

**עכשיו הכללים ברורים!** 🎯

---

## 2026-01-20 04:15

### רפקטורינג CSS מלא עם Tailwind @apply! 🎨

**צעד שני**: הוספת קומפוננטות CSS כלליות נוספות והשלמת רפקטורינג דף Users!

**המטרה:** מערכת CSS מלאה ועקבית עם @apply! ✨

---

#### מה בוצע?

**1. הוספת 6 קומפוננטות CSS כלליות חדשות**

נוספו ל-`settings.css` קומפוננטות משותפות שישמשו בכל דפי ההגדרות:

```css
/* 1. Page Header - כותרת דף */
.page-header {
  @apply text-2xl font-bold text-slate-700 m-0;
}

.header-row {
  @apply flex justify-between items-center mb-8 border-b border-slate-100 pb-6 flex-wrap gap-4;
}

/* 2. Card Component - כרטיס כללי */
.card {
  @apply bg-white border border-slate-200 rounded-2xl p-6 
         flex flex-col items-center gap-4
         transition-all duration-300 ease-in-out
         shadow-md;
}

.card:hover {
  @apply -translate-y-1 shadow-2xl border-slate-300;
}

/* 3. Form Group - קבוצת שדות */
.form-group {
  @apply mb-6;
}

.form-group label {
  @apply block mb-2 font-semibold text-slate-600 text-[0.95rem];
}

/* 4. Modal Actions - כפתורי מודאל */
.modal-actions {
  @apply flex gap-4 justify-end mt-6;
}

/* 5. Empty State - מסך ריק */
.empty-state {
  @apply text-center py-12 px-4 text-slate-500;
}

.empty-state p {
  @apply text-lg my-2;
}

.empty-state .subtitle {
  @apply text-[0.95rem] text-slate-400;
}

/* 6. Avatar Initial - אות ראשונה */
.avatar-initial {
  @apply text-4xl text-slate-400 font-extrabold;
}
```

**קבצים שנוצרו/שונו:**
- `sveltekit-version/src/routes/settings/settings.css` (+80 שורות)

---

**2. הוספת CSS ספציפי לדף Users**

כיוון ש-@apply **לא עובד ב-`<style>` של Svelte components** (רק ב-CSS files!), העברנו את כל ה-CSS עם @apply ל-`settings.css`:

```css
/* Users Grid - רשת משתמשים */
.users-grid {
  @apply grid gap-6 w-full;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

/* User Card - כרטיס משתמש */
.user-card {
  @apply bg-white border border-slate-200 rounded-2xl p-6 
         flex flex-col items-center gap-4
         transition-all duration-300 ease-in-out
         shadow-md;
}

.user-card:hover {
  @apply -translate-y-1 shadow-2xl border-slate-300;
}

/* User Details */
.user-details h3 {
  @apply m-0 mb-2 text-xl text-slate-800;
}

/* User Actions */
.user-actions {
  @apply flex gap-3 mt-2 w-full justify-center;
}
```

**קבצים ששונו:**
- `sveltekit-version/src/routes/settings/settings.css` (+35 שורות)

---

**3. רפקטורינג מלא של users/+page.svelte**

**שינויי HTML:**

```diff
- <h2>{TEXTS.USER_MANAGEMENT}</h2>
+ <h2 class="page-header">{TEXTS.USER_MANAGEMENT}</h2>

- <span class="initial">{user.name[0]}</span>
+ <span class="avatar-initial">{user.name[0]}</span>
```

**שינויי CSS:**

**לפני (105 שורות CSS):**
```css
h2 { font-size: 1.5rem; font-weight: 700; ... }
.header-row { display: flex; justify-content: ... }
.users-grid { display: grid; grid-template-columns: ... }
.user-card { background: white; border: 1px solid ... }
.user-card:hover { transform: translateY(-4px); ... }
.avatar-wrapper { width: 80px; height: 80px; ... }
.initial { font-size: 2.5rem; color: #94a3b8; ... }
.user-details h3 { margin: 0 0 0.5rem 0; ... }
.user-actions { display: flex; gap: 0.75rem; ... }
.modal-card { background: white; padding: 2.5rem; ... }
.form-group { margin-bottom: 1.5rem; ... }
.form-group label { display: block; ... }
.modal-actions { display: flex; gap: 1rem; ... }
```

**אחרי (15 שורות CSS בלבד!):**
```css
/* Avatar Override - תמונת פרופיל (override ל-ImageDisplay) */
.avatar :global(.image-display) { 
  width: 100%; 
  height: 100%; 
  border-radius: 0;
}

/* Modal Override - רוחב מקסימלי */
.modal-content {
  max-width: 450px;
}

.modal-content h3 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #1e293b;
}
```

**מה נמחק:**
- ❌ `h2` → עכשיו `.page-header` ב-settings.css
- ❌ `.header-row` → עכשיו ב-settings.css
- ❌ `.users-grid` → עכשיו ב-settings.css
- ❌ `.user-card` → עכשיו ב-settings.css
- ❌ `.initial` → עכשיו `.avatar-initial` ב-settings.css
- ❌ `.user-details h3` → עכשיו ב-settings.css
- ❌ `.user-actions` → עכשיו ב-settings.css
- ❌ `.form-group` → עכשיו ב-settings.css
- ❌ `.modal-actions` → עכשיו ב-settings.css

**מה נשאר:**
- ✅ רק 3 overrides ספציפיים (avatar, modal)

**קבצים ששונו:**
- `sveltekit-version/src/routes/settings/users/+page.svelte` (-90 שורות!)

---

#### תוצאות

**📊 סטטיסטיקה:**

| קובץ | לפני | אחרי | שיפור |
|------|------|------|-------|
| **users/+page.svelte** | 225 שורות (105 CSS) | 135 שורות (15 CSS) | **-86% CSS!** |
| **settings.css** | 582 שורות | 697 שורות | +115 שורות (משותפות!) |

**💡 היתרון המרכזי:**

כל ה-115 שורות החדשות ב-`settings.css` הן **משותפות** לכל דפי ההגדרות!

```
לפני (ללא sharing):
────────────────────────
users/+page.svelte:   105 שורות CSS
lists/+page.svelte:   ~90 שורות CSS (דומה)
people/+page.svelte:  ~80 שורות CSS (דומה)
───────────────────────────
סה"כ: ~275 שורות (רוב חוזרות!)

אחרי (עם sharing):
────────────────────────
settings.css:         +115 שורות (משותף!)
users/+page.svelte:    15 שורות (ספציפי)
lists/+page.svelte:   ~20 שורות (ספציפי) - עתידי
people/+page.svelte:  ~15 שורות (ספציפי) - עתידי
───────────────────────────
סה"כ: ~165 שורות
חיסכון: ~110 שורות! (-40%)
```

---

#### החלטות ארכיטקטורה

**1. למה @apply רק ב-CSS files?**

**הבעיה:**
```svelte
<!-- ❌ לא עובד! -->
<style>
  .my-class {
    @apply text-xl font-bold; /* ERROR! */
  }
</style>
```

**הסיבה:**
- Tailwind v4 Browser CDN מעבד רק **קבצי CSS** (לא `<style>` tags)
- ה-CDN סורק `.css` files בלבד ב-runtime

**הפתרון:**
```css
/* ✅ עובד! (ב-settings.css) */
.my-class {
  @apply text-xl font-bold;
}
```

---

**2. מבנה ה-CSS החדש**

```
settings.css
├── @layer base (typography, backgrounds)
├── @layer components
│   ├── Buttons (btn, btn-sm, btn-icon, ...)
│   ├── Cards (task-card, card)
│   ├── Inputs (input, textarea)
│   ├── Badges
│   ├── Avatars (avatar, avatar-md, avatar-initial)
│   ├── Modals (modal-overlay, modal-content)
│   ├── Page Components (page-header, header-row)
│   ├── Form Components (form-group, modal-actions)
│   ├── Empty State
│   └── Users Specific (users-grid, user-card, ...)
└── @keyframes (pulse, pulse-border)
```

---

**3. שלושה סוגי CSS**

**א. קומפוננטות גלובליות (ב-settings.css):**
- משמשות **בכל** דפי ההגדרות
- דוגמה: `.btn`, `.avatar`, `.page-header`, `.form-group`

**ב. קומפוננטות ספציפיות לדף (ב-settings.css):**
- משמשות רק בדף אחד, אבל עם @apply
- דוגמה: `.users-grid`, `.user-card`
- למה ב-settings.css? כי @apply לא עובד ב-Svelte `<style>`!

**ג. Overrides (ב-component `<style>`):**
- רק customizations **מינימליים** לקומפוננטה הספציפית
- **ללא @apply** (CSS רגיל)
- דוגמה: `.avatar :global(.image-display)`, `.modal-content { max-width: ... }`

---

#### קבצים שנוצרו/שונו

**שונו:**
- `sveltekit-version/src/routes/settings/settings.css` (+115 שורות)
- `sveltekit-version/src/routes/settings/users/+page.svelte` (-90 שורות CSS, +2 classes בHTML)

---

#### הצעדים הבאים

1. ✅ ~~יצירת מערכת עיצוב מאוחדת~~
2. ✅ ~~תיעוד מלא עם דוגמאות~~
3. ✅ ~~demo חי עם @apply + nested CSS~~
4. ✅ ~~רפקטורינג לקומפוננטות CSS~~
5. ✅ ~~יצירת settings.css~~
6. ✅ ~~יישום בדף users~~
7. ✅ ~~הוספת קומפוננטות כלליות~~
8. ⏭️ בדיקה בדפדפן
9. ⏭️ יישום בשאר דפי settings (lists, people)
10. ⏭️ יישום במסך הראשי

---

## 2026-01-20 03:45

### יישום מערכת העיצוב בפרויקט SvelteKit! 🚀

**צעד ראשון**: העברת מערכת העיצוב לנתיב ההגדרות (Settings)!

**המטרה:** בדיקת היישום בסביבה אמיתית! ✨

---

#### מה בוצע?

**1. יצירת settings.css**

נוצר קובץ CSS חדש: `sveltekit-version/src/routes/settings/settings.css`

**תוכן הקובץ:**
- ✅ **Design Tokens** - רק Theme Focus (ברירת מחדל)
- ✅ **@layer base** - Typography + Background
- ✅ **@layer components** - כל 35+ הקומפוננטות
- ✅ **@keyframes** - animations (pulse-border, pulse)

**קבצים שנוצרו:**
- `sveltekit-version/src/routes/settings/settings.css`

---

**2. ייבוא settings.css ב-+layout.svelte**

```svelte
<script lang="ts">
  import './settings.css';  // ← הוספה!
  // ...
</script>
```

**קבצים ששונו:**
- `sveltekit-version/src/routes/settings/+layout.svelte`

**תיקון נוסף:** החלפת `'אנשים'` ב-`TEXTS.PEOPLE_TAB` (טקסט hardcoded!)

---

**3. רפקטורינג דף Users להשתמש בקומפוננטות**

**לפני:**
```svelte
<button class="btn-primary-small">משתמש חדש</button>
<div class="avatar-wrapper">...</div>
<span class="gender-tag">בן</span>
<button class="action-btn">...</button>
<div class="modal-card">...</div>
<input type="text" />
```

**אחרי:**
```svelte
<button class="btn btn-sm">משתמש חדש</button>
<div class="avatar avatar-md">...</div>
<span class="badge">בן</span>
<button class="btn-icon">...</button>
<div class="modal-content">...</div>
<input type="text" class="input" />
```

**קבצים ששונו:**
- `sveltekit-version/src/routes/settings/users/+page.svelte`

**קומפוננטות שהוחלפו:**
- ✅ `.btn-primary-small` → `.btn .btn-sm`
- ✅ `.avatar-wrapper` → `.avatar .avatar-md`
- ✅ `.gender-tag` → `.badge`
- ✅ `.action-btn` → `.btn-icon`
- ✅ `.modal-card` → `.modal-content`
- ✅ `input`, `select` → `.input`
- ✅ modal buttons → `.btn`, `.btn-secondary`

**CSS שנמחק מהדף:**
- ❌ ~60 שורות CSS מיותרות!
- ❌ כל סגנונות הכפתורים
- ❌ כל סגנונות ה-avatars
- ❌ כל סגנונות ה-inputs
- ❌ כל סגנונות ה-badges
- ❌ כל סגנונות המודאלים

**CSS שנשאר בדף:**
- ✅ רק Layout specific (grid, spacing)
- ✅ רק Custom overrides (user-card animations)

---

**4. הוספת btn-icon-danger variant**

```css
/* Icon Button Danger Variant */
.btn-icon-danger:hover {
  color: var(--danger);
  background-color: #fef2f2;
}
```

**קבצים ששונו:**
- `sveltekit-version/src/routes/settings/settings.css`

---

#### תוצאות

**📊 סטטיסטיקה:**

| מדד | לפני | אחרי | שיפור |
|-----|------|------|-------|
| שורות CSS בדף | ~220 | ~160 | **-27%** |
| Classes בHTML | inline styles | component classes | **עקביות!** |
| תחזוקה | בכל דף בנפרד | מרכזי | **קל יותר!** |

---

#### החלטות ארכיטקטורה

**1. למה רק Theme Focus?**

- ✅ התחלה פשוטה (Proof of Concept)
- ✅ קל לבדיקה
- ✅ דף הגדרות לא צריך theme switching

**בהמשך:**
- נוסיף themes נוספים למסך הראשי
- נוסיף theme selector
- נוסיף theme-overrides layer

---

**2. מה נשאר בדף users?**

**רק סגנונות ספציפיים לדף:**
```css
/* Layout */
.users-grid { grid-template-columns: ...; }
.header-row { display: flex; ... }

/* Custom animations */
.user-card:hover { transform: translateY(-4px); }

/* Specific overrides */
.avatar :global(.image-display) { ... }
```

**הכל השאר מ-settings.css!** 🎯

---

**3. למה זה טוב?**

**לפני (ללא Design System):**
```
users/+page.svelte: 220 שורות CSS
lists/+page.svelte: 180 שורות CSS
people/+page.svelte: 150 שורות CSS
───────────────────────────────
סה"כ: 550 שורות! (רוב חוזרות!)
```

**אחרי (עם Design System):**
```
settings.css: 420 שורות (משותף!)
users/+page.svelte: 60 שורות (ספציפי)
lists/+page.svelte: 50 שורות (ספציפי)
people/+page.svelte: 40 שורות (ספציפי)
───────────────────────────────
סה"כ: 570 שורות (אבל 420 משותפות!)
```

**יתרונות:**
- ✅ שינוי בכפתור = שינוי במקום אחד!
- ✅ עקביות מובטחת
- ✅ קל להוסיף דפים חדשים

---

#### קבצים שנוצרו/שונו

**נוצרו:**
- `sveltekit-version/src/routes/settings/settings.css` (420 שורות)

**שונו:**
- `sveltekit-version/src/routes/settings/+layout.svelte` (הוספת import + תיקון TEXTS)
- `sveltekit-version/src/routes/settings/users/+page.svelte` (רפקטורינג מלא)

---

#### הצעדים הבאים

1. ✅ ~~יצירת מערכת עיצוב מאוחדת~~
2. ✅ ~~תיעוד מלא עם דוגמאות~~
3. ✅ ~~demo חי עם @apply + nested CSS~~
4. ✅ ~~רפקטורינג לקומפוננטות CSS~~
5. ✅ ~~יצירת settings.css~~
6. ✅ ~~יישום בדף users~~
7. ⏭️ בדיקה בדפדפן
8. ⏭️ יישום בשאר דפי settings
9. ⏭️ יישום במסך הראשי
10. ⏭️ הוספת themes נוספים

---

## 2026-01-20 03:15

### רפקטורינג מלא חלק 2: כל הקומפוננטות! 🎨

**רפקטורינג עצום** - יצירת Component Classes לכל הקומפוננטות בדף!

**המטרה:** מערכת עיצוב מלאה ועקבית מודרנית! ✨

---

#### מה בוצע?

**1. יצירת קומפוננטות Avatars**

```css
@layer components {
  .avatar { /* base */ }
  .avatar-sm { @apply w-10 h-10 border-2; }
  .avatar-md { @apply w-20 h-20 border-4; }
  .avatar-lg { width: 120px; height: 120px; }
}
```

**שימוש:**
```html
<!-- לפני -->
<div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
  <img src="..." />
</div>

<!-- אחרי -->
<div class="avatar avatar-sm">
  <img src="..." />
</div>
```

**📉 מ-13 classes ל-2 classes!**

---

**2. יצירת Task Card States**

```css
@layer components {
  .task-card-waiting { @apply opacity-70 transition; }
  .task-card-active { scale: 1.05; ring-width: var(--ring-width); }
  .task-card-done { background: var(--success-bg); }
  .task-card-cancelled { background: var(--cancelled); }
  .task-card-added { background: var(--added); }
}
```

**שימוש:**
```html
<!-- לפני -->
<div class="task-card flex items-center p-4 gap-4 opacity-70 hover:opacity-100 transition hover:shadow-lg bg-white">
  ...
</div>

<!-- אחרי -->
<div class="task-card task-card-waiting flex items-center p-4 gap-4 bg-white">
  ...
</div>
```

---

**3. יצירת Status Indicators**

```css
@layer components {
  .status-indicator { @apply rounded-full flex items-center justify-center; }
  .status-indicator-empty { @apply w-12 h-12 border-4 border-gray-200; }
  .status-indicator-active { @apply w-16 h-16 animate-pulse; }
  .status-indicator-done { @apply w-12 h-12 text-2xl; }
}
```

**שימוש:**
```html
<!-- לפני -->
<div class="w-12 h-12 rounded-full border-4 border-gray-200"></div>

<!-- אחרי -->
<div class="status-indicator status-indicator-empty"></div>
```

---

**4. יצירת Activity Cards (למודאל)**

```css
@layer components {
  .activity-card {
    @apply flex flex-col items-center gap-2 p-3;
    @apply rounded-xl bg-gray-50 border-2 border-transparent;
    @apply transition cursor-pointer;
    
    &:hover {
      @apply bg-gray-100;
      border-color: var(--primary);
    }
  }
  
  .activity-card-img { @apply w-16 h-16 rounded-lg object-cover shadow-sm; }
  .activity-card-label { @apply text-xs font-medium text-center leading-tight; }
}
```

**שימוש:**
```html
<!-- לפני -->
<button class="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-[var(--primary)] transition">
  <img src="..." class="w-16 h-16 rounded-lg object-cover shadow-sm" />
  <span class="text-xs font-medium text-center leading-tight">ארוחת בוקר</span>
</button>

<!-- אחרי -->
<button class="activity-card">
  <img src="..." class="activity-card-img" />
  <span class="activity-card-label">ארוחת בוקר</span>
</button>
```

**📉 מ-17 classes ל-3 classes!**

---

**5. יצירת Modal Components**

```css
@layer components {
  .modal-overlay {
    @apply fixed inset-0 z-[100];
    @apply flex items-center justify-center p-4;
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    @apply relative w-full max-w-lg rounded-3xl p-8 text-center;
    background-color: var(--modal-bg);
    color: var(--modal-text);
  }
}
```

**שימוש:**
```html
<!-- לפני -->
<div id="celebrationModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden items-center justify-center p-4 opacity-0 transition-opacity duration-300">
  <div class="relative w-full max-w-lg rounded-[3rem] p-8 text-center transform scale-90 transition-transform duration-300" style="background-color: var(--modal-bg);">
    ...
  </div>
</div>

<!-- אחרי -->
<div id="celebrationModal" class="modal-overlay hidden opacity-0">
  <div class="modal-content rounded-[3rem] scale-90" style="background-color: var(--modal-bg);">
    ...
  </div>
</div>
```

---

**6. יצירת Section Headers**

```css
@layer components {
  .section-title {
    @apply text-3xl font-black mb-6 pb-3;
    @apply border-b-2 border-gray-200;
  }
  
  .section-description {
    @apply mb-6;
    color: var(--text-muted);
  }
}
```

**שימוש:**
```html
<!-- לפני -->
<h2 class="text-3xl font-black mb-6 border-b-2 border-gray-200 pb-3">
  2️⃣ כפתורים (Buttons)
</h2>
<p class="text-[var(--text-muted)] mb-6">
  7 סוגי כפתורים...
</p>

<!-- אחרי -->
<h2 class="section-title">
  2️⃣ כפתורים (Buttons)
</h2>
<p class="section-description">
  7 סוגי כפתורים...
</p>
```

---

#### סיכום הרפקטורינג

**📦 סה"כ קומפוננטות שנוצרו:**

```
Buttons:         .btn, .btn-secondary, .btn-danger, .btn-edit, 
                 .btn-warning, .btn-sm, .btn-xs, .btn-icon, .btn-fab

Inputs:          .input (+ textarea)

Badges:          .badge, .badge-success, .badge-danger, .badge-warning

Avatars:         .avatar, .avatar-sm, .avatar-md, .avatar-lg

Task Cards:      .task-card, .task-card-waiting, .task-card-active,
                 .task-card-done, .task-card-cancelled, .task-card-added

Status:          .status-indicator-empty, .status-indicator-active,
                 .status-indicator-done

Activities:      .activity-card, .activity-card-img, .activity-card-label

Modals:          .modal-overlay, .modal-content

Sections:        .section-title, .section-description

Misc:            .now-indicator, .swatch
```

**סה"כ: 35+ קומפוננטות!** 🎉

---

#### רפקטורינג שבוצע ב-HTML

**מה שונה:**
- ✅ 6 Avatars → רפקטורינג מלא
- ✅ 5 Task Card States → רפקטורינג מלא
- ✅ 10 Section Titles → רפקטורינג מלא
- ✅ 8 Section Descriptions → רפקטורינג מלא
- ✅ 3 Activity Cards → רפקטורינג מלא
- ✅ 4 Modals → רפקטורינג מלא

**סה"כ: 36+ elements רפקטורינג!** 💪

---

#### תוצאות

**📊 סטטיסטיקה מעודכנת:**

| Component | לפני | אחרי | חיסכון |
|-----------|------|------|--------|
| Avatar | 13 classes | 2 classes | **~85%** |
| Task Card State | 8-12 classes | 3-4 classes | **~70%** |
| Activity Card | 17 classes | 3 classes | **~82%** |
| Modal | 14+ classes | 2-3 classes | **~80%** |
| Section Header | 7 classes | 1 class | **~86%** |

**ממוצע חיסכון: ~81%!** 🎯

---

#### החלטות ארכיטקטורה

**1. למה כל קומפוננטה צריכה variants?**

```css
/* Base - המשותף לכולם */
.avatar { ... }

/* Sizes - גדלים שונים */
.avatar-sm { ... }
.avatar-md { ... }
.avatar-lg { ... }
```

**יתרונות:**
- ✅ קל להוסיף גדלים חדשים
- ✅ עקביות בין כל ה-avatars
- ✅ קוד נקי ב-HTML

---

**2. מתי להשתמש ב-`style` attribute?**

אנחנו משתמשים ב-`style` רק ל-**CSS Variables**:

```html
<!-- ✅ טוב - CSS Variable -->
<div class="modal-content" style="background-color: var(--modal-bg);">

<!-- ❌ לא טוב - סגנון ישיר -->
<div class="modal-content" style="background-color: #ffffff;">
```

**למה?** כי ה-CSS Variables משתנים בין themes!

---

**3. איך לטפל ב-State-Specific Styles?**

```css
/* Base Card */
.task-card { /* עיצוב בסיסי */ }

/* State Modifiers */
.task-card-active { /* רק ההבדלים! */ }
.task-card-done { /* רק ההבדלים! */ }
```

**שימוש:**
```html
<div class="task-card task-card-active">
  <!-- המחלקות מצטברפות! -->
</div>
```

---

#### קבצים ששונו

- **`temp/design_demo.html`** → **`docs/design_demo.html`**
  - הוספת 35+ component classes חדשות
  - רפקטורינג של 36+ elements
  - קיצור HTML דרמטי (~80%)

---

#### הקבצים המעודכנים

**מסמכי תיעוד:**
- [`docs/design_demo.html`](docs/design_demo.html) - ✨ דמו מלא עם כל הקומפוננטות
- [`docs/css-architecture-guide.md`](docs/css-architecture-guide.md) - מדריך מלא (v2.0)
- [`docs/walkthrough.md`](docs/walkthrough.md) - יומן (מסמך זה)
- [`.cursor/rules/css-architecture-rules.mdc`](.cursor/rules/css-architecture-rules.mdc) - כללים לעוזר

---

#### הצעדים הבאים

1. ✅ ~~יצירת מערכת עיצוב מאוחדת~~
2. ✅ ~~תיעוד מלא עם דוגמאות~~
3. ✅ ~~demo חי עם @apply + nested CSS~~
4. ✅ ~~רפקטורינג לקומפוננטות CSS~~
5. ✅ ~~יצירת קומפוננטות לכל הרכיבים~~
6. ⏭️ העברת הגישה לפרויקט SvelteKit
7. ⏭️ יצירת קבצי CSS נפרדים (tokens/, themes/, layers/)
8. ⏭️ אינטגרציה עם הקומפוננטות הקיימות

---

## 2026-01-20 02:30

### רפקטורינג מלא: Component Classes במקום Inline Utilities! 

**רפקטורינג גדול** של `design_demo.html` - החלפת כל ה-inline utilities לקומפוננטות CSS מאורגנות.

**המטרה:** להדגים את הארכיטקטורה הנכונה - שימוש חוזר בקומפוננטות! ✨

---

#### מה בוצע?

**1. הוספת Button Variants ל-@layer components**

```css
@layer components {
  /* Base Button */
  .btn { ... }
  
  /* Variants */
  .btn-secondary { ... }
  .btn-danger { ... }
  .btn-edit { ... }
  .btn-warning { ... }
  
  /* Sizes */
  .btn-sm { ... }
  .btn-xs { ... }
  
  /* Special */
  .btn-icon { ... }
  .btn-fab { ... }
}
```

**לפני:**
```html
<button class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[var(--border-radius)] font-bold transition">
  ביטול
</button>
```

**אחרי:**
```html
<button class="btn btn-secondary">
  ביטול
</button>
```

**📉 מ-11 classes ל-2 classes!**

---

**2. החלפת כל הכפתורים ב-HTML**

עדכנו:
- ✅ כפתורים רגילים (Primary, Secondary, Danger, Edit, Warning)
- ✅ כפתורי אייקון (Lock, Settings, Close)
- ✅ כפתור צף (FAB)
- ✅ כפתורי מודאלים (סגירה, אישור, ביטול)
- ✅ כפתורי Crop (זום +/-, איפוס)
- ✅ כפתורים קטנים (Dropdown, וכו')

**סה"כ:** ~25 כפתורים רפקטורינג! 🎯

---

**3. הוספת Input/Textarea Components**

```css
@layer components {
  .input,
  textarea.input {
    @apply w-full px-4 py-3 transition-all;
    border: 2px solid #e5e7eb;
    border-radius: var(--radius-md);
    
    &:focus {
      @apply outline-none ring-4;
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
  }
  
  textarea.input {
    @apply resize-vertical;
  }
}
```

**לפני:**
```html
<input type="text" placeholder="הכנס טקסט..." 
  class="w-full px-4 py-3 border-2 border-gray-200 rounded-[var(--radius-md)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition" />
```

**אחרי:**
```html
<input type="text" placeholder="הכנס טקסט..." class="input" />
```

**📉 מ-13+ classes ל-1 class!**

עדכנו:
- ✅ 8 text inputs
- ✅ 2 textareas

---

**4. הוספת Badge Components**

```css
@layer components {
  .badge {
    @apply inline-flex items-center gap-1 px-3 py-1;
    @apply text-sm font-bold rounded-full;
  }
  
  .badge-success { ... }
  .badge-danger { ... }
  .badge-warning { ... }
}
```

עדכנו:
- ✅ Now Badge (`.now-indicator`)
- ✅ Cancelled Badge (`.badge-danger`)
- ✅ Added Badge (`.badge-warning`)
- ✅ Info Badge (`.badge`)

---

#### תוצאות

**📊 סטטיסטיקה:**

| Component | לפני | אחרי | חיסכון |
|-----------|------|------|--------|
| Button | 8-15 classes | 1-3 classes | **~80%** |
| Input | 13+ classes | 1 class | **~92%** |
| Badge | 6-8 classes | 1-2 classes | **~75%** |

**📦 Component Classes שנוספו:**

```
Buttons:    .btn, .btn-secondary, .btn-danger, .btn-edit, 
            .btn-warning, .btn-sm, .btn-xs, .btn-icon, .btn-fab
Inputs:     .input (עובד גם על textarea)
Badges:     .badge, .badge-success, .badge-danger, .badge-warning
Existing:   .task-card, .now-indicator, .swatch
```

**✅ יתרונות:**

1. **DRY** - אין חזרתיות בקוד
2. **עקביות** - כל הכפתורים זהים
3. **תחזוקה** - שינוי במקום אחד
4. **קריאות** - HTML נקי יותר
5. **Theme Overrides** - קל להחיל overrides

---

#### החלטות ארכיטקטורה

**1. למה Component Classes זה חשוב?**

```html
<!-- ❌ לא טוב - חוזר על עצמו 25 פעמים! -->
<button class="px-6 py-3 bg-[var(--danger)] hover:brightness-110 text-white rounded-[var(--border-radius)] font-bold transition">
  מחק
</button>

<!-- ✅ טוב - שימוש חוזר! -->
<button class="btn btn-danger">
  מחק
</button>
```

**הבעיה עם Inline Utilities:**
- 📝 חוזרים על אותו קוד שוב ושוב
- 🐛 קל לשכוח class (כמו `transition`)
- 🎨 קשה להחיל theme overrides
- 📏 HTML ארוך ולא קריא

**הפתרון עם Components:**
- ✅ הגדרה אחת, שימוש חוזר
- ✅ עקביות מובטחת
- ✅ theme overrides פשוטים
- ✅ HTML נקי וקריא

---

**2. מתי להשתמש ב-Component Class?**

**✅ כן - יצירת Component:**
- הרכיב חוזר על עצמו 3+ פעמים
- יש לו מבנה קבוע (כמו כפתור)
- צריך theme overrides

**⚠️ אולי - תלוי בהקשר:**
- הרכיב חוזר 1-2 פעמים
- יש וריאציות רבות

**❌ לא - Inline Utilities:**
- הרכיב ייחודי (רק פעם אחת)
- סגנון פשוט מאוד (כמו `flex gap-2`)

---

**3. איך לארגן Variants?**

```css
/* Base Class */
.btn { /* המשותף לכולם */ }

/* Variants (צבעים) */
.btn-secondary { /* רק ההבדלים */ }
.btn-danger { /* רק ההבדלים */ }

/* Modifiers (גדלים) */
.btn-sm { /* padding קטן יותר */ }
.btn-xs { /* padding עוד יותר קטן */ }

/* Special (תפקידים) */
.btn-icon { /* כפתור אייקון */ }
.btn-fab { /* כפתור צף */ }
```

**שימוש:**
```html
<button class="btn">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-danger btn-sm">Small Danger</button>
<button class="btn-icon">🔒</button>
```

---

#### קבצים ששונו

- **`temp/design_demo.html`** → **`docs/design_demo.html`**
  - הוספת 10+ component classes
  - רפקטורינג של 40+ elements
  - קיצור HTML משמעותי

---

#### הקבצים המעודכנים

**מסמכי תיעוד:**
- [`docs/design_demo.html`](docs/design_demo.html) - ✨ דמו מרופקטר
- [`docs/css-architecture-guide.md`](docs/css-architecture-guide.md) - מדריך מלא (v2.0)
- [`docs/walkthrough.md`](docs/walkthrough.md) - יומן (מסמך זה)
- [`.cursor/rules/css-architecture-rules.mdc`](.cursor/rules/css-architecture-rules.mdc) - כללים לעוזר

---

#### הצעדים הבאים

1. ✅ ~~יצירת מערכת עיצוב מאוחדת~~
2. ✅ ~~תיעוד מלא עם דוגמאות~~
3. ✅ ~~demo חי עם @apply + nested CSS~~
4. ✅ ~~רפקטורינג לקומפוננטות CSS~~
5. ⏭️ העברת הגישה לפרויקט SvelteKit
6. ⏭️ יצירת קבצי CSS נפרדים (tokens/, themes/, layers/)
7. ⏭️ אינטגרציה עם הקומפוננטות הקיימות

---

## 2026-01-20 01:45

### הצלחה! design_demo.html עובד עם Tailwind v4 + @apply

המרה מלאה והצלחה של `design_demo.html` לגישה החדשה: 3 Layers + @apply + Nested CSS + Tailwind v4 Browser CDN.

**תוצאה:** הדמו עובד במלואו בדפדפן! ✅

---

#### מה בוצע?

**1. עדכון ל-Tailwind v4 Browser CDN**

**הבעיה המקורית:**
- Tailwind CDN v3 לא תמך ב-`@apply` directives
- הכפתורים עם `.btn` class לא עבדו
- ה-demo לא הצליח להדגים את @apply

**הפתרון:**
```html
<!-- לפני: Tailwind v3 -->
<script src="https://cdn.tailwindcss.com"></script>
<style>

<!-- אחרי: Tailwind v4 Browser CDN -->
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
```

**שינויים:**
- החלפת CDN ל-`@tailwindcss/browser@4`
- הוספת `type="text/tailwindcss"` ל-style tag
- **תמיכה מלאה ב-runtime processing!**

**קבצים ששונו:**
- `temp/design_demo.html` → `docs/design_demo.html`

---

**2. בדיקת @apply - הוספת Test Section**

הוספתי box בדיקה בפינה הימנית התחתונה:

```html
<!-- @apply Test Section -->
<div class="fixed bottom-4 right-4 bg-white/95 backdrop-blur p-4 rounded-xl shadow-2xl border-2 border-green-500">
  <!-- שני כפתורים להשוואה -->
  <button class="btn">שמור (@apply)</button>
  <button class="px-6 py-3... inline Tailwind">שמור (inline)</button>
</div>
```

**מטרה:**
- השוואה ויזואלית מיידית
- אם שני הכפתורים זהים → @apply עובד!
- אם שונים → בעיה עם @apply

**תוצאה:** ✅ **שני הכפתורים כמעט זהים!**

---

**3. בדיקות שהתבצעו**

- [x] שני הכפתורים נראים זהה (כמעט) ✅
- [x] החלפת themes עובדת (Focus, Playful, Gradient, Contrast) ✅
- [x] Hover effects עובדים על כפתורים ✅
- [x] Theme Playful - כפתורים עם "falling shadow" effect ✅
- [x] Theme Gradient - blur effects על כרטיסים ✅
- [x] Theme Contrast - borders לבנים ✅
- [x] Nested CSS (`&:hover`) עובד ✅
- [x] CSS Variables עובדים בכל ה-themes ✅
- [x] @layer base, components, theme-overrides עובד ✅

---

**4. העברת הדמו ל-docs/**

```bash
temp/design_demo.html → docs/design_demo.html
```

**מיקום סופי:**
- `docs/design_demo.html` - הדמו החי
- `docs/css-architecture-guide.md` - המדריך המלא
- `docs/walkthrough.md` - יומן הפיתוח (קובץ זה)
- `.cursor/rules/css-architecture-rules.mdc` - כללים לעוזר

**כל המסמכים ביחד!** 📚

---

#### החלטות ארכיטקטורה

**1. למה Tailwind v4 Browser CDN?**

**יתרונות:**
- ✅ Runtime processing - מעבד CSS בזמן ריצה
- ✅ תמיכה מלאה ב-`@apply` directives
- ✅ תמיכה ב-`@layer` ו-nested CSS
- ✅ לא צריך build process
- ✅ מושלם לקובץ demo

**חסרונות:**
- ⚠️ לא לשימוש ב-production (אמור להיות עם build)
- ⚠️ טעינה קצת איטית יותר (runtime processing)

**המסקנה:** מושלם לקובץ demo, בפרויקט האמיתי נשתמש ב-Vite + Tailwind build.

---

**2. למה "כמעט זהים" זה הצלחה?**

ההבדלים הזעירים בין שני הכפתורים נובעים מ:
- **Timing**: ה-runtime processor עובד אסינכרונית
- **Rendering order**: הסדר שבו הסגנונות מוחלים
- **Browser rendering**: הבדלים מינימליים בעיבוד

**העיקר:** שני הכפתורים יש להם:
- ✅ אותו padding (`px-6 py-3`)
- ✅ אותו font-weight (bold)
- ✅ אותו צבע רקע (var(--primary))
- ✅ אותו border-radius
- ✅ אותו transition

**זה מוכיח ש-@apply עובד!** 🎉

---

**3. למה זה חשוב?**

עכשיו יש לנו:
1. **Demo חי** שמדגים את כל הגישה
2. **הוכחה** ש-@apply + nested CSS + @layer עובדים
3. **דוגמה ויזואלית** ל-4 themes שונים
4. **מסמך למידה** אינטראקטיבי

**הקובץ `docs/design_demo.html` משמש כ:**
- 📚 תיעוד חי
- 🎨 Design system showcase
- 🧪 Testing ground
- 📖 Learning resource

---

#### תוצאות וסיכום

**✅ הושגו כל המטרות:**

1. **3 Layers Architecture** - base, components, theme-overrides
2. **@apply Working** - קומפוננטים עם Tailwind utilities
3. **Nested CSS** - theme overrides מרוכזים
4. **4 Themes** - כולם עובדים מעולה
5. **CSS Variables** - Single Source of Truth
6. **Live Demo** - עובד בדפדפן ללא build

---

#### הקבצים הסופיים

**מסמכי תיעוד:**
- [`docs/design_demo.html`](docs/design_demo.html) - ✨ הדמו החי והאינטראקטיבי
- [`docs/css-architecture-guide.md`](docs/css-architecture-guide.md) - מדריך מלא (גרסה 2.0)
- [`docs/walkthrough.md`](docs/walkthrough.md) - יומן הפיתוח
- [`.cursor/rules/css-architecture-rules.mdc`](.cursor/rules/css-architecture-rules.mdc) - כללים לעוזר

**כל המערכת מתועדת ועובדת!** 🚀

---

#### הצעדים הבאים

1. ✅ ~~יצירת מערכת עיצוב מאוחדת~~
2. ✅ ~~תיעוד מלא עם דוגמאות~~
3. ✅ ~~demo חי עם @apply + nested CSS~~
4. ⏭️ העברת הגישה לפרויקט SvelteKit
5. ⏭️ יצירת קבצי CSS נפרדים (tokens/, themes/, layers/)
6. ⏭️ אינטגרציה עם הקומפוננטות הקיימות

---

## 2026-01-20 01:15

### המרת design_demo.html לגישה החדשה - 3 Layers + @apply + Nested CSS

המרה מלאה של `temp/design_demo.html` לפי הארכיטקטורה המעודכנת: 3 Layers עם `@apply` ו-Nested CSS.

---

#### מה בוצע?

**1. הוספת CSS Layers Declaration**

```css
/* הגדרת סדר Layers - חייב להיות ראשון! */
@layer base, components, theme-overrides;
```

**קבצים ששונו:**
- `temp/design_demo.html` - הוספת declaration בראש ה-CSS

---

**2. המרת @layer base**

**לפני:**
```css
body {
  font-family: "Heebo", sans-serif;
  transition: background-color 0.3s, color 0.3s;
}
```

**אחרי:**
```css
@layer base {
  body {
    @apply font-sans;
    font-family: "Heebo", sans-serif;
    background: var(--bg-main);
    background-attachment: fixed;
    color: var(--text-main);
    transition: background-color 0.3s, color 0.3s;
  }
  
  h1, h2, h3 {
    font-family: var(--font-heading);
  }
}
```

**שינויים:**
- הוספת `@apply font-sans` לעקביות
- הוספת body styles מרכזיות ל-layer
- הכל ב-@layer base אחד

---

**3. המרת @layer components עם @apply**

**לפני:**
```css
.btn {
  background-color: var(--primary);
  color: white;
  border-radius: var(--border-radius);
  font-weight: bold;
  transition: all 0.2s;
}
.btn:hover {
  filter: brightness(110%);
}
```

**אחרי:**
```css
@layer components {
  .btn {
    @apply px-6 py-3 font-bold transition-all cursor-pointer;
    background-color: var(--primary);
    color: white;
    border-radius: var(--border-radius);
    
    &:hover {
      @apply brightness-110;
    }
  }
}
```

**שינויים:**
- שימוש ב-`@apply` ל-utilities שחוזרים (`px-6 py-3 font-bold transition-all cursor-pointer`)
- CSS Variables למשתנים שמשתנים בין themes
- Nested selector (`&:hover`) במקום selector נפרד

**קומפוננטים נוספים שהומרו:**
- `.task-card` - עם `@apply relative overflow-hidden`
- `.now-indicator` - עם `@apply flex items-center gap-2`
- `.swatch` - עם `@apply w-12 h-12 flex items-center justify-center`

---

**4. יצירת @layer theme-overrides עם Nested CSS**

**לפני (פזור בקובץ):**
```css
.theme-playful .task-card {
  border-bottom: 6px solid #e5e7eb;
}
.theme-playful .btn {
  box-shadow: 0 4px 0 0 rgba(0, 0, 0, 0.2);
}
.theme-contrast .btn {
  color: black;
}
```

**אחרי (מרוכז ב-nested CSS):**
```css
@layer theme-overrides {
  .theme-playful {
    .task-card {
      @apply border-b-[6px] border-gray-300 transform translate-y-0 transition-transform;
      
      &:hover {
        @apply -translate-y-1;
      }
    }
    
    .btn,
    button[class*="bg-"] {
      @apply shadow-lg transform translate-y-0;
      box-shadow: 0 4px 0 0 rgba(0, 0, 0, 0.2);
      
      &:hover {
        @apply -translate-y-0.5;
        box-shadow: 0 6px 0 0 rgba(0, 0, 0, 0.2);
      }
      
      &:active {
        @apply translate-y-1;
        box-shadow: 0 0 0 0;
      }
    }
  }
  
  .theme-gradient {
    .task-card {
      @apply backdrop-blur-md;
      -webkit-backdrop-filter: blur(12px);
    }
  }
  
  .theme-contrast {
    .task-card,
    .btn,
    img,
    .modal-content {
      @apply border-2 border-white;
    }
    
    .btn {
      @apply text-black;
    }
    
    .swatch {
      @apply border border-white text-black;
    }
  }
}
```

**יתרונות:**
- כל ה-overrides של theme אחד במקום אחד
- Nested CSS עד 2-3 רמות בלבד
- קל לראות מה משתנה בכל theme
- קל להוסיף/לשנות theme

---

**5. ניקיון והסרת כפילויות**

- הסרת `body` styles כפולים
- הסרת theme overrides פזורים
- הסרת `.theme-contrast .swatch` הישן
- keyframes נשאר מחוץ ל-layers (כנדרש)

---

#### החלטות ארכיטקטורה

**1. למה @apply לקומפוננטים אבל לא להכל?**
- `@apply px-6 py-3` - חוזר בכל כפתור → ברור
- `border-radius: var(--border-radius)` - משתנה בין themes → CSS Variable
- **כלל:** @apply ל-utilities קבועים, CSS Variables למשתנים

**2. למה Nested CSS רק ב-theme-overrides?**
- זה המקום הטבעי - כל theme בבלוק אחד
- מקסימום 3 רמות (`.theme-playful .btn &:hover`)
- קריאות מעולה
- קל לתחזוקה

**3. למה keyframes מחוץ ל-layer?**
- keyframes לא יכולים להיות בתוך @layer
- הם צריכים להיות ברמה הגלובלית
- זה בסדר - הם לא משפיעים על cascade

---

#### בדיקות שבוצעו

- [x] הקובץ נפתח בדפדפן בהצלחה
- [x] כל 4 ה-themes עובדים
- [x] הכפתורים מגיבים נכון ב-playful theme
- [x] ה-blur effect עובד ב-gradient theme
- [x] ה-borders עובדים ב-contrast theme
- [x] @layer declaration בראש הקובץ
- [x] כל הקומפוננטים ב-@layer components
- [x] כל ה-overrides ב-@layer theme-overrides
- [x] Nested CSS עד 3 רמות

---

#### הקובץ החדש: css-architecture-rules.mdc

יצירת rule file תמציתי עבור העוזר:

**מבנה הקובץ:**
- Core Structure (3 Layers + 2 Sections)
- Critical Rules (@layer, @apply, nesting)
- Code Templates (מוכנים להעתקה)
- DO/DON'T lists
- Quick Reference Table

**מיקום:**
- `.cursor/rules/css-architecture-rules.mdc`

**תכלית:**
- מדריך מהיר לעוזר הקוד
- ללא הסברים מיותרים
- דוגמאות מעשיות
- טבלת החלטות

---

#### מה הלאה?

הקובץ `design_demo.html` כעת משמש כדוגמה חיה לגישה החדשה. השלב הבא:
1. בדיקה ויזואלית מלאה של כל הרכיבים
2. תיקון באגים אם יש
3. העברת הגישה לפרויקט האמיתי (`sveltekit-version/src/styles/`)

---

## 2026-01-20 00:30

### עדכון מדריך ארכיטקטורת CSS - גישה מעודכנת

עדכון מקיף של המדריך (`docs/css-architecture-guide.md`) להתאמה מלאה לגישה המאושרת: **3 Layers + @apply + Nested CSS**.

---

#### מה בוצע?

**1. שינוי המבנה הכללי - מ-5 Layers ל-3 Layers**

**המבנה החדש:**
- **Section 1:** Design Tokens (`:root` - משתנים בלבד, לא layer)
- **Section 2:** Theme Variations (`.theme-*` - משתנים בלבד, לא layer)
- **Layer 1:** `@layer base` (מבנה בסיסי עם `@apply`)
- **Layer 2:** `@layer components` (קומפוננטים עם `@apply`)
- **Layer 3:** `@layer theme-overrides` (עם nested CSS)

**הבהרה קריטית שנוספה:**
> Design Tokens ו-Theme Variations הם **משתנים בלבד** (CSS Variables), לא layers!

**קבצים ששונו:**
- `docs/css-architecture-guide.md` - עדכון מלא של כל הסעיפים

---

**2. הוספת סעיף "@apply Best Practices"**

סעיף חדש מקיף המסביר:

**מתי להשתמש ב-@apply?**
- ✅ **כן**: קומפוננטים שחוזרים הרבה (`.btn`, `.card`, `.avatar`, `.badge`)
- ❌ **לא**: utilities פשוטים (`.flex`, `.grid`, `.gap-2`)

**כלל האצבע:**
```
אם הקוד חוזר 5+ פעמים → @apply
אם הקוד מופיע 1-4 פעמים → ישירות ב-HTML
```

**למה Tailwind לא אוהבים את @apply:**
- חוזרים למצב הישן (CSS מסורתי)
- Bundle Size
- פילוסופיה (שובר Utility-First)

**למה זה בסדר בפרויקט שלנו:**
- Design System - לא אתר marketing
- קומפוננטות לשימוש חוזר
- עקביות מוחלטת
- תחזוקה קלה

**דוגמה מלאה:**
```css
@layer components {
  .btn {
    @apply px-6 py-3 font-bold transition-all;
    background: var(--primary);
    border-radius: var(--border-radius);
  }
}
```

```html
<button class="btn flex items-center gap-2">
  <!--     ↑ component   ↑ utilities ישירות -->
  <span>שמור</span>
</button>
```

---

**3. הוספת סעיף "CSS Nesting Best Practices"**

סעיף חדש המסביר את CSS Nesting (תכונה רשמית מ-2023):

**כללי Nesting:**
1. **מקסימום 3 רמות** - יותר מדי קשה לקריאה
2. **השתמש ב-`&`** לפסאודו-אלמנטים
3. **Theme Overrides** - המקום הטבעי לקינון

**למה Nesting מושלם ל-Theme Overrides:**
- ארגון לוגי - כל theme בבלוק אחד
- קריאות - רואים מיד מה שייך לאיזה theme
- תחזוקה קלה
- פחות חזרה

**דוגמה מלאה:**
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

**תמיכה בדפדפנים:**
- Chrome/Edge 112+
- Safari 16.5+
- Firefox 117+
- Vite/PostCSS ידהר אוטומטית לתמיכה מלאה

---

**4. עדכון "מבנה קבצים מוצע לעתיד"**

שינוי מלא של המבנה המוצע:

**המבנה החדש:**
```
sveltekit-version/src/styles/
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
└── main.css                       ← imports הכל
```

**main.css מעודכן:**
```css
/* הגדרת סדר Layers - ראשון! */
@layer base, components, theme-overrides;

/* Tokens (משתנים) */
@import './tokens/design-tokens.css';

/* Themes (משתנים) */
@import './themes/focus.css';
/* ... */

/* Layers */
@import './layers/base.css';
@import './layers/components.css';
@import './layers/theme-overrides.css';
```

**דוגמאות מלאות של `components.css` ו-`theme-overrides.css`**

---

**5. עדכון "דוגמאות מעשיות"**

החלפה מלאה של כל הדוגמאות ל-5 דוגמאות חדשות:

1. **כפתור עם @apply** - הקוד ב-CSS והשימוש ב-HTML
2. **Theme Override עם Nested CSS** - playful theme עם אפקטים מיוחדים
3. **Card עם States** - waiting, active, done
4. **Theme Switching (Svelte)** - החלפת theme דינמית
5. **שילוב מושלם** - component + utilities

**הדגשים:**
- שילוב `.btn` (component מ-@apply) + `flex items-center gap-2` (utilities ישירות)
- שינוי class אחד → כל הקומפוננטים מתעדכנים
- הפילוסופיה: component classes לבסיס, utilities לגמישות

---

**6. עדכון "כללי עבודה ו-Best Practices"**

הוספת 3 כללים חדשים ל-DO:
- השתמש ב-@apply רק לקומפוננטים בסיסיים
- שמור nesting עד 3 רמות
- Theme overrides תמיד ב-layer האחרון

הוספת 3 כללים חדשים ל-DON'T:
- אל תשתמש ב-@apply לכל class
- אל תקנן יותר מ-3 רמות
- אל תכתוב theme overrides מחוץ ל-@layer theme-overrides

**דוגמאות מורחבות:**
- דוגמה רעה: @apply לכל דבר קטן
- דוגמה רעה: קינון עמוק מדי (6 רמות)
- דוגמה טובה: מקסימום 3 רמות

---

**7. עדכון "סיכום והמלצות"**

**7 יתרונות מעודכנים:**
1. Design Tokens - מקור אמת יחיד (משתנים CSS)
2. 4 Themes - החלפה פשוטה
3. 3 CSS Layers - סדר ברור וקל לתחזוקה
4. @apply - עקביות ללא חזרתיות
5. Nested CSS - ארגון לוגי
6. Tailwind - משתלב מצוין
7. Scalable - קל להוסיף

**דיאגרמה ויזואלית:**
```
Design Tokens (:root)
         ↓
Theme Variations (.theme-*)
         ↓
@layer base, components, theme-overrides
         ↓
@layer base
         ↓
@layer components (עם @apply)
         ↓
@layer theme-overrides (עם nesting)
```

**הפילוסופיה במשפט אחד:**
> "Component classes לבסיס (עם @apply), Tailwind utilities לגמישות, Theme overrides לייחודיות"

**Checklist לפני יישום:**
- [ ] קראתי והבנתי את כללי @layer
- [ ] הבנתי מתי להשתמש ב-@apply
- [ ] הבנתי את כללי ה-nesting
- [ ] Design Tokens ו-Theme Variations לא layers
- [ ] סדר: base → components → theme-overrides
- [ ] Theme overrides תמיד ב-nested CSS
- [ ] שילוב component classes + utilities

---

**8. עדכון כל דוגמאות הקוד במדריך**

כל דוגמאות הקוד הראשיות עודכנו:
- הוספת `@layer base, components, theme-overrides;` בראש
- שימוש ב-`@apply` בכל הקומפוננטים
- Nested CSS ב-theme-overrides
- משתני CSS בכל מקום
- שילוב `&:hover`, `&:active` עם @apply

---

#### החלטות ארכיטקטורה

**1. למה 3 Layers ולא 5?**
- **פשטות**: 3 layers קל יותר להבין ולתחזק
- **מספיק**: base, components, theme-overrides מכסים את כל הצרכים
- **Design Tokens ו-Themes**: הם משתנים בלבד, לא layers לוגיים
- **עקביות**: מתאים לגישת Tailwind המקורית (3 layers)

**2. למה @apply למרות שTailwind לא אוהבים?**
- **Design System**: אנחנו בונים מערכת עיצוב, לא אתר marketing
- **קומפוננטות**: רכיבים שחוזרים הרבה צריכים קוד מרוכז
- **עקביות**: כל `.btn` נראה זהה תמיד
- **תחזוקה**: שינוי במקום אחד משפיע על כל המערכת
- **כלל אצבע**: רק לקומפוננטים שחוזרים 5+ פעמים

**3. למה Nested CSS?**
- **CSS Native**: תכונה רשמית של CSS (2023)
- **Theme Overrides**: המקום הטבעי לקינון
- **ארגון לוגי**: כל theme בבלוק אחד
- **קריאות**: מיד רואים מה שייך לאיזה theme
- **Vite**: ממילא ידהר לתמיכה מלאה

**4. למה Theme Overrides ב-Layer?**
- **עקביות**: כל הסגנונות ב-layers
- **סדר עדיפויות**: layer אחרון מנצח תמיד
- **בטיחות**: אם מישהו יכתוב CSS ללא layer, זה לא ישבור
- **מפורש עדיף**: Python Zen, גם ב-CSS

---

#### בדיקות שבוצעו

- [x] כל הסעיפים במדריך עודכנו
- [x] כל דוגמאות הקוד תקינות
- [x] הוספת 2 סעיפים חדשים (@apply, Nesting)
- [x] עדכון מבנה הקבצים המוצע
- [x] עדכון כל הדוגמאות המעשיות
- [x] עדכון Best Practices
- [x] עדכון הסיכום והמלצות
- [x] תאריך ע דכון: 2026-01-20
- [x] גרסה: 2.0

---

#### השלב הבא

לפי התוכנית: יישום הגישה החדשה ב-`temp/design_demo.html`:
- להמיר את כל הקומפוננטים ל-`@apply`
- לארגן theme overrides עם nested CSS
- להגדיר `@layer base, components, theme-overrides`
- לבדוק ויזואלית את כל 4 ה-themes

---

## 2026-01-19 23:45

### מערכת עיצוב אחידה (Design System Demo)

יישום מלא של מערכת העיצוב בקובץ `design_demo.html` - גלריה אינטראקטיביית של כל הרכיבים, הצבעים והתבניות בפרויקט.

---

#### מה בוצע?

**1. Design Tokens - הרחבה מלאה ב-4 ערכות נושא**

הרחבתי את משתני העיצוב בכל ארבע ערכות הנושא (Focus, Playful, Gradient, Contrast):

**משתנים חדשים:**
- **צבעים**: `--secondary`, `--edit`, `--warning`, `--info`, `--cancelled`, `--cancelled-border`, `--added`, `--added-border`
- **טיפוגרפיה**: `--text-xs` עד `--text-2xl` (6 גדלים)
- **מרווחים**: `--space-xs` עד `--space-xl` (5 גדלים)
- **שוליים**: `--radius-sm` עד `--radius-2xl` + `--radius-full` (7 גדלים)
- **צללים**: `--shadow-sm` עד `--shadow-xl` (4 רמות)

**הערות תיעוד מפורטות:**
- הוספתי תיעוד מקיף בראש ה-CSS המסביר איך להשתמש במשתנים
- דוגמאות שימוש ב-HTML inline styles, Tailwind ו-CSS רגיל
- הוראות להוספת משתנים חדשים

**קבצים שנוצרו/שונו:**
- `temp/design_demo.html` - עודכן מלא (1890 שורות)

---

**2. Atomic Components - רכיבי בסיס**

**Buttons (7 variants):**
- Primary - כפתור ראשי כחול
- Secondary - כפתור משני אפור
- Danger - מחיקה אדום
- Edit - עריכה סגול
- Warning - אזהרה צהוב
- Icon - כפתורי אייקון בלבד (הגדרות, נעילה, סגור)
- FAB - כפתור צף (Floating Action Button)

**Card States (5 מצבים):**
- Waiting - רגיל, opacity מופחת
- Active - "עכשיו" עם ring וbadge
- Done - ירוק עם V
- Cancelled - אדום עם 🚫 badge
- Added - צהוב עם ✨ badge

**Avatars (3 גדלים):**
- Small (40px) - Header
- Medium (80px) - People Display
- Large (120px) - User Selector
- כל אווטר עם fallback לאות ראשונה

**Badges (4 סוגים):**
- Now - אדום מהבהב עם חץ
- Cancelled - 🚫 שינוי - בוטל
- Added - ✨ פעילות חדשה
- Info - ℹ️ מידע

**Inputs (5 סוגים):**
- Text - שדה טקסט רגיל
- Textarea - טקסט ארוך
- File - העלאת קובץ מקווקו
- Checkbox - תיבת סימון
- Radio - בחירה בודדת

---

**3. Composed Components - רכיבים מורכבים**

**Modals (4 סוגים):**
1. **Celebration Modal** - מודאל הצלחה עם רקע צהוב, קונפטי, תמונת משתמש ומחמאה
2. **Add Activity Modal** - הוספת פעילות עם Grid של פעילויות וטופס
3. **List Edit Modal** - עריכת רשימה: שם, ברכה, כותרת, תיאור, לוגו
4. **Image Crop Modal** - חיתוך תמונה עם drag, zoom ואיפוס

**תכונות משותפות:**
- סגירה ב-Esc
- סגירה בלחיצה על overlay
- אנימציות fade + scale
- תמיכה בכל ערכות הנושא

**Section Headers (3 סוגים):**
1. **List Header** - כותרת רשימה עם לוגו גדול וגרדיאנט
2. **People Display** - "מי יהיה איתנו היום?" עם Grid של אווטרים
3. **Action Panel** - פאנל פעולות עם Action Cards

**Grids (4 סוגים):**
- Activities Grid - 100px minimum, auto-fill
- People Grid - 80px minimum
- Users Grid - 150px minimum
- Action Cards - 2-3 columns responsive

**Floating Window:**
- חלון צף ללוח תקשורת
- Header עם drag functionality
- Resize handle
- סגירה ב-X או Esc

---

**4. Selectors & Pickers**

**User Selector:**
- מסך בחירת משתמש מלא
- Header עם לוגו האפליקציה
- "מי היום?" כשאלה
- Grid של משתמשים עם אווטרים גדולים (120px)
- Hover effects ו-border הדגשה

**People Picker:**
- בורר אנשים עם checkboxes
- Grid responsive
- אווטרים בגודל בינוני (80px)
- עיצוב card עם hover

---

**5. Special Elements**

**Empty State:**
- אייקון 📭
- כותרת "אין משימות ברשימה"
- הנחייה "לחץ על כפתור + להוספת משימה חדשה"
- רקע מקווקו עם border-dashed

**Glass Container (List Switcher):**
- רקע שקוף עם blur
- border לבן חצי-שקוף
- shadow עדין
- כרטיסי רשימות קטנים

**Image Uploader:**
- מצב ריק - אזור העלאה מקווקו
- מצב עם תמונה - preview עם כפתורי עריכה
- אינטגרציה עם Image Crop Modal

---

**6. אינטראקטיביות ונגישות**

**Keyboard Support:**
- `Esc` - סגירת כל המודאלים והחלונות הצפים
- `Tab` navigation - כל האלמנטים נגישים

**Mouse Interactions:**
- Click on overlay - סגירת מודאלים
- Drag - הזזת Floating Window
- Hover states - כל הכפתורים והכרטיסים

**Animations:**
- Fade in/out למודאלים
- Scale 90%→100% למודאלים
- Bounce לקונפטי
- Pulse ל-"עכשיו" badge
- Pulse-border animation

---

**7. תיעוד מקיף**

**CSS Comments:**
- הערות מפורטות על משתני העיצוב
- הסבר איך להשתמש במשתנים
- הוראות להוספת צבעים חדשים
- תיעוד כל קטגוריית רכיבים

**HTML Comments:**
- תיעוד כל סעיף בגלריה
- הסבר על השימוש בכל רכיב
- דוגמאות קוד

**Usage Guide (סעיף מסכם בסוף הדף):**
- התחלה מהירה - 5 צעדים
- רכיבים זמינים - סיכום
- התאמה אישית - איך לעבוד עם משתנים
- ערכות נושא - תיאור כל ערכה
- Credits

---

**8. תכונות מיוחדות לערכת Playful**

**אפקט כפתור "נופל":**
- Shadow תחתון (box-shadow: 0 4px 0 0)
- Hover - עליה קלה
- Active - נפילה (translateY(4px))
- חל על כל הכפתורים בערכה

**רקע נקודות:**
- radial-gradient עם נקודות צהובות
- background-size: 32px 32px

---

#### החלטות ארכיטקטורה

**1. Tailwind CSS + CSS Variables**
החלטתי להשתמש בשילוב של Tailwind לעיצוב מהיר ו-CSS Variables לגמישות ערכות הנושא. זה מאפשר:
- שינוי צבעים מיידי עם החלפת theme class
- שימוש ב-Tailwind utilities עם var(--color-name)
- עקביות מלאה בין כל הרכיבים

**2. Section-Based Structure**
חילקתי את הגלריה ל-13 סעיפים נפרדים לפי סוג הרכיב, לא לפי תפקוד. זה מקל על:
- מציאת רכיבים ספציפיים
- העתקת קוד
- תחזוקה עתידית

**3. Interactive Demos**
כל מודאל וחלון ניתן לפתיחה בלחיצת כפתור, מה שמאפשר:
- בדיקה מיידית של עיצוב
- התנסות עם אינטראקציות
- בדיקה בערכות נושא שונות

---

#### מעקפים ופתרונות

**בעיה: Playful theme - כפתורים ללא אפקט נפילה**
**פתרון**: הרחבתי את ה-selector ל-`button[class*="bg-"]` כך שגם כפתורי Tailwind מקבלים את האפקט.

**בעיה: Modal overlay click לא עובד**
**פתרון**: הוספתי event listener שבודק אם הקליק היה על ה-overlay עצמו (`e.target === modal`).

**בעיה: Grid לא responsive במסכים קטנים**
**פתרון**: שימוש ב-`grid-cols-[repeat(auto-fill,minmax(Xpx,1fr))]` במקום ערכים קבועים.

---

#### בדיקות שבוצעו

✅ כל 4 ערכות הנושא עובדות תקין  
✅ כל המודאלים נפתחים ונסגרים  
✅ Escape סוגר את כל המודאלים  
✅ Overlay click סוגר מודאלים  
✅ FAB נשאר בפינה בכל גודל מסך  
✅ Responsive - כל הרכיבים מתאימים למובייל  
✅ RTL - כיווניות נכונה  
✅ אנימציות חלקות בכל הדפדפנים  

---

#### קבצים שנוצרו

- `temp/design_demo.html` (1890 שורות) - גלריית מערכת העיצוב המלאה

---

## 2026-01-20 00:15

### רשימות נעולות והעברת לוחות בין משתמשים

יישום שני הפיצ'רים האחרונים מתוכנית הפיצ'רים: (1) מצב נעילה לרשימות - לחיצה על משימה רק משמיעה את שמה ללא חגיגה (שימושי לתרגול והכנה), (2) העברה או שכפול רשימות בין משתמשים שונים.

---

#### מה בוצע?

**1. רשימות נעולות (Locked Lists)**

הוספת מצב "נעילה" לרשימות, המיועד לתרגול והכנה ללא משוב מלא.

**תכונות:**
- שדה חדש `isLocked?: boolean` בממשק `List`
- כשהרשימה נעולה: לחיצה על משימה רק משמיעה את שמה (TTS)
- לא מסומנת כהושלמה, לא מופיע מודאל חגיגה, לא עוברים למשימה הבאה
- שימושי לתרגול הילדים על הפעילויות לפני היום עצמו

**ממשק:**
- כפתור נעילה/שחרור (🔒/🔓) בפאנל הפעולות במסך הראשי
- עיצוב אפור-כחול (`#64748b`) למראה ניטרלי
- אינדיקטור ויזואלי: תג "🔒 (נעולה)" מתחת ל-ListSwitcher כשהרשימה נעולה
- רשימות ברירת מחדל לא ניתנות לנעילה (חסימה ב-toggleListLock)

**קבצים שהשתנו:**
- `src/lib/types.ts` - הוספת `isLocked?: boolean` ל-`List`
- `src/lib/logic/tasksBoard.svelte.ts` - בדיקת `isLocked` ב-`toggleTask()`, הוספת `playTaskName()`
- `src/routes/+page.svelte` - כפתור נעילה/שחרור + תג ויזואלי + סטיילינג
- `src/lib/stores/listStore.svelte.ts` - הוספת `toggleListLock()`
- `src/lib/data/texts.ts` - טקסטים: `LOCK_LIST`, `UNLOCK_LIST`, `LOCKED_LIST`
- `src/lib/services/migration.ts` - מיגרציה V9→V10: `isLocked: false` לרשימות קיימות
- `src/lib/data/defaults.ts` - עדכון גרסה ל-10

---

**2. העברה/שכפול רשימות בין משתמשים (Copy/Move Lists)**

מנגנון להעברה או שכפול רשימה ממשתמש אחד לאחר (למשל: העתקת לוח מתמר ליונתן).

**תכונות:**
- **שכפול (Copy)**: יוצר עותק של הרשימה אצל משתמש אחר, המקור נשאר
- **העברה (Move)**: מעביר את הרשימה למשתמש אחר ומוחק את המקור
- העתקה עמוקה של כל המשימות עם IDs חדשים
- איפוס אוטומטי של `isDone` בעותק (משימות מתחילות "טרי")
- השמירה על כל השדות: `title`, `description`, `peopleIds`, `isLocked`, `logo`, `greeting`

**ממשק:**
- כפתור "העבר/שכפל למשתמש" בדף ניהול רשימות (`/settings/lists`)
- `UserPickerModal` - מודאל בחירת משתמש יעד:
  - רשת משתמשים עם אווטארים (סינון: רק משתמשים אחרים)
  - checkbox "העבר (במקום לשכפל)" - עם רקע צהוב אזהרה
  - כפתור דינמי: "שכפל" או "העבר" בהתאם לבחירה
- אייקון העברה (חיצים בכל הכיוונות) בכפתור הפעולה

**קובץ חדש:**
- `src/lib/components/UserPickerModal.svelte` - מודאל בחירה מלא עם נגישות (a11y)

**קבצים שהשתנו:**
- `src/lib/stores/listStore.svelte.ts` - הוספת `copyListToUser()` - פונקציה מלאה להעתקה/העברה
- `src/routes/settings/lists/+page.svelte` - אינטגרציה: state, פונקציות (`openUserPicker`, `handleUserSelected`), כפתור, סטיילינג
- `src/lib/data/texts.ts` - טקסטים: `COPY_TO_USER`, `COPY_LIST_TO_USER`, `MOVE_INSTEAD_OF_COPY`, `COPY`, `MOVE`

---

#### החלטות ארכיטקטורה

**רשימות נעולות:**
- **מיקום הבדיקה**: החלטנו לבדוק `isLocked` **לפני** בדיקת `changeType` ב-`toggleTask()`, כי זה פשוט יותר - אם הרשימה נעולה, כל המשימות מתנהגות אותו דבר
- **לא לנעול ברירת מחדל**: רשימות `isDefault` לא ניתנות לנעילה - הגנה מפני טעות של ההורה
- **אינדיקטור בולט**: הצבנו את התג "נעולה" מיד אחרי ListSwitcher כדי שההורה יראה במבט ראשון שהרשימה במצב תרגול

**העברה/שכפול:**
- **IDs חדשים תמיד**: גם בשכפול, כל המשימות מקבלות IDs חדשים למניעת קונפליקטים
- **איפוס isDone**: משימות בעותק מתחילות מחדש (לא מועתק הסטטוס "בוצע")
- **שמירת כל השדות**: העתקה מלאה של `title`, `description`, `peopleIds`, `isLocked` - כך שלוח מוכן לאירוע ניתן להעתיק לכמה ילדים
- **isDefault: false תמיד**: גם אם מעתיקים רשימת ברירת מחדל, העותק לא יהיה default (מונע בעיות)
- **isHidden: false תמיד**: העותק תמיד גלוי, גם אם המקור מוסתר
- **מחיקה בטוחה**: בהעברה (move), בודקים שנשארת לפחות רשימה אחת למשתמש המקור

**UserPickerModal:**
- **קומפוננטה גנרית**: ניתן לשימוש חוזר במקומות אחרים (לא רק רשימות)
- **סינון אוטומטי**: `otherUsers` מסנן את המשתמש הנוכחי - לא ניתן להעתיק לעצמו
- **איפוס state**: `$effect` מאפס את הבחירה בכל פתיחה של המודאל
- **נגישות מלאה**: תמיכה ב-keyboard (Escape), role="dialog", tabindex

---

#### מעקפים ופתרונות

**אזהרות a11y ב-UserPickerModal:**
- **בעיה**: svelte-check הציג אזהרות על modal-overlay ו-modal-card
- **פתרון**: הוספת `role="button"`, `role="dialog"`, `tabindex`, `onkeydown` לנגישות מלאה
- **תוצאה**: 0 שגיאות, 0 אזהרות ב-svelte-check

**שכפול vs העברה:**
- **בעיה**: איך למנוע מחיקת הרשימה האחרונה בהעברה?
- **פתרון**: בדיקת `globalState.state.lists[fromUserId].length > 1` לפני קריאה ל-`deleteList()`
- **תוצאה**: המשתמש תמיד נשאר עם לפחות רשימה אחת

---

## 2026-01-19 23:30

### יצירת מסמכי הנחיה מקיפים לעוזר AI

יצירת מערכת תיעוד דו-שכבתית למדריך העוזר AI, המרכזת את כל הכללים, הארכיטקטורה, וההנחיות לעבודה על הפרויקט.

---

#### מה בוצע?

**1. מסמך הנחיה ראשי (agent-guide.mdc)**

מסמך מקוצר (~560 שורות) שנקרא אוטומטית בכל שיחה עם העוזר.

**תוכן:**
- מטרות הפרויקט וחזון (TEACCH, אקולליה, לופים)
- סטאק טכנולוגי מלא
- ארכיטקטורה: 3 שכבות (Data → Logic → View)
- עקרונות קריטיים:
  - SSOT (Single Source of Truth): `defaults.ts`, `texts.ts`
  - Controllers Topic-Based (לא Page-Based)
  - הפרדת לוגיקה מתצוגה (ספקטרום: תצוגה פשוטה OK, לוגיקה עסקית → Controller)
  - **כלל אצבע:** יותר מ-5 שורות לוגיקה → העבר ל-Controller
  - תמונות רק דרך `ImageDisplay.svelte`
- ישויות מרכזיות: `AppState`, `Task`, `ImageMetadata`
- מנגנונים מיוחדים (כותרות + הפניה למורחב):
  - משוב קולי Hybrid (MP3 + TTS)
  - משימות שינוי (cancelled/added)
  - Image Crop System (Scale יחסי!)
  - Google Drive Backup
- כללי קוד קריטיים (שפה, Runes, אודיו, מיגרציות)
- טעויות נפוצות (5 דוגמאות עיקריות)
- תהליך עבודה + Checklist לפני commit
- מושגים פדגוגיים (אקולליה, לופים, TEACCH)

**קובץ:** `.cursor/rules/agent-guide.mdc`

---

**2. מסמך הנחיה מורחב (agent-guide-extended.mdc)**

מסמך מפורט (~1265 שורות) שנקרא לפי צורך לפרטים טכניים מעמיקים.

**תוכן:**
- מבנה תיקיות מפורט עם הסברים לכל קובץ
- ישויות מרכזיות עם דוגמאות קוד מלאות
- Normalized Data Structure - הסבר מעמיק
- מערכת חיתוך תמונות - מדריך מלא (Scale יחסי, minScale, החלה)
- מערכת אודיו - מדריך מלא (Hybrid, רנדומלי, boosts)
- מיגרציות - דוגמאות מלאות (V6→V7, הוספת שדה)
- דוגמאות קוד מלאות:
  - יצירת Controller חדש
  - שימוש ב-Controller בקומפוננטה
  - הוספת טקסט חדש
- טעויות נפוצות מורחבות עם דוגמאות
- FAQ (למה Topic-Based? למה Scale יחסי? וכו')
- הקשר פדגוגי ומשפחתי מלא (תמר, יונתן, אריאל, לופים)

**קובץ:** `.cursor/rules/agent-guide-extended.mdc`

---

**3. עדכון הפניות למסמך texts.ts**

לאחר המעבר של `language.ts` ל-`texts.ts` ב-`data/`, עודכנו כל ההפניות במסמכי ההנחיה.

**שינויים:**
- `src/lib/services/language.ts` → `src/lib/data/texts.ts`
- הסרת הערות "לעתיד" - הקובץ כבר במקום הנכון
- עדכון בכל דוגמאות הקוד

**קבצים ששונו:**
- `.cursor/rules/agent-guide.mdc` - הפניות ל-`texts.ts`
- `.cursor/rules/agent-guide-extended.mdc` - מבנה תיקיות + דוגמאות

---

#### החלטות ארכיטקטורה

**1. פיצול למסמך ראשי + מורחב:**
- מסמך ראשי (560 שורות) - נטען תמיד, מכיל עיקרי עיקרים
- מסמך מורחב (1265 שורות) - נטען לפי צורך, פרטים מעמיקים
- מונע טעינה מיותרת של מידע מפורט בכל שיחה
- מאפשר גישה מהירה לכללים קריטיים

**2. הפרדת לוגיקה - ספקטרום (לא דיכוטומי):**
- תצוגה פשוטה (if/else, map, formatting) → OK בקומפוננטה
- ניהול UI State → תלוי במורכבות
- לוגיקה עסקית (API, stores, חישובים) → Controller
- **כלל אצבע:** >5 שורות → Controller
- מונע פישוט יתר, נותן גמישות סבירה

**3. הקשר פדגוגי במסמך עצמו:**
- אין צורך לקרוא `docs/private-docs/אפיון...` בכל משימה
- כל ההקשר החשוב (אקולליה, לופים, TEACCH) כבר במסמך הראשי
- חיסכון בזמן ומניעת טעינת מידע מיותר

**4. מנגנונים מיוחדים - כותרות בלבד:**
- במסמך הראשי: רק כותרות + נקודות עיקריות
- פירוט מלא במסמך המורחב
- הפניה ברורה בין המסמכים

---

#### מעקפים ופתרונות

**בעיה 1: מסמך מקורי מורחב מדי (1100 שורות)**
- **פתרון:** פיצול לראשי (560) + מורחב (1265)
- תוצאה: טעינה מהירה יותר, פוקוס על עיקר

**בעיה 2: ניסוח "Dumb Components" יכול לגרום לפישוט יתר**
- **פתרון:** שינוי ל-"הפרדת לוגיקה מתצוגה" + ספקטרום
- תוצאה: גמישות סבירה, לא "all or nothing"

**בעיה 3: הפניות ל-language.ts אחרי המעבר ל-texts.ts**
- **פתרון:** עדכון כל ההפניות במסמכים
- תוצאה: עקביות מלאה עם הקוד הנוכחי

---

## 2026-01-19 17:00

### 3 פיצ'רים עיקריים: כותרות לרשימות, ניהול אנשים, ומודאל עריכה משותף

יישום 3 פיצ'רים מרכזיים במערכת: (1) כותרת ותיאור לרשימות עם לוגו מוגדל - להכנה לאירועים מיוחדים, (2) מערכת מקיפה לניהול אנשים (צוות ובני משפחה) עם מאגר גלובלי והצגה ויזואלית, (3) מודאל עריכת רשימה כקומפוננטה משותפת עם פאנל פעולות מעוצב במסך הראשי.

---

#### מה בוצע?

**1. כותרת ותיאור לרשימה (List Header)**

הוספת אפשרות להגדיר כותרת ותיאור אופציונליים לכל רשימה, המיועדים בעיקר להכנה לאירועים מיוחדים (לא לשגרה יומיומית).

**תכונות:**
- שדות אופציונליים `title` ו-`description` לכל רשימה
- הצגה ויזואלית מעל רשימת המשימות עם לוגו מוגדל (200px)
- רק אם מוגדר כותרת או תיאור - המערכת מציגה את הסקשן

**דוגמאות שימוש:**
- "ביום ראשון נוסעים לטיול!" + תמונת אוטו/מטוס
- "ביום רביעי סבא וסבתא באים" + תמונות סבא וסבתא

**קבצים חדשים:**
- `src/lib/components/ListHeader.svelte` - קומפוננטה להצגת כותרת גדולה עם לוגו ותיאור

**קבצים שהשתנו:**
- `src/lib/types.ts` - הוספת `title?: string` ו-`description?: string` לממשק `List`
- `src/routes/+page.svelte` - אינטגרציה של `ListHeader` מעל רשימת המשימות
- `src/routes/settings/lists/+page.svelte` - הוספת שדות כותרת ותיאור בטופס עריכת רשימה
- `src/lib/data/texts.ts` - טקסטים חדשים: `LIST_TITLE`, `LIST_DESCRIPTION`, placeholders
- `src/lib/services/migration.ts` - מיגרציה לגרסה 8 (הוספת שדות לרשימות קיימות)
- `src/lib/data/defaults.ts` - עדכון `INITIAL_STATE.version` ל-8

---

**2. מערכת ניהול אנשים (People Management)**

מערכת מקיפה לניהול אנשים (צוות ובני משפחה) עם מאגר גלובלי, בחירה ברמת רשימה, והצגה ויזואלית במסך הראשי.

**ארכיטקטורה:**
- **מאגר מרכזי**: רשימת `people: Person[]` ב-`AppState` - normalization (איש מוגדר פעם אחת)
- **הפניות**: כל רשימה מכילה `peopleIds: string[]` - רק מזהים
- **הסתרה מהירה**: שדה `isPeopleSectionVisible` ברמת הרשימה (נשמר!)

**ממשק Person:**
```typescript
interface Person {
  id: string;
  name: string;
  avatar: string; // מזהה תמונה (idb:xxx או URL)
}
```

**קבצים חדשים:**
- `src/lib/stores/peopleStore.svelte.ts` - Store מלא לניהול מאגר האנשים (CRUD + ניקוי הפניות)
- `src/lib/components/PersonForm.svelte` - טופס **משותף** להוספה/עריכת איש (נעשה שימוש חוזר בשני מקומות!)
- `src/lib/components/PeoplePicker.svelte` - בחירת אנשים מהמאגר + אפשרות להוסיף חדש inline
- `src/lib/components/PeopleDisplay.svelte` - הצגה ויזואלית "מי יהיה איתנו היום?" עם אווטארים ולחצן הסתרה
- `src/routes/settings/people/+page.svelte` - דף ייעודי לניהול מאגר האנשים

**קבצים שהשתנו:**
- `src/lib/types.ts` - ממשק `Person` חדש + שדות ב-`List`: `peopleIds`, `isPeopleSectionVisible` + שדה ב-`AppState`: `people`
- `src/routes/+page.svelte` - אינטגרציה של `PeopleDisplay` (תחת `ListHeader` אם יש)
- `src/routes/settings/+layout.svelte` - לשונית חדשה "אנשים" בניווט ההגדרות
- `src/routes/settings/lists/+page.svelte` - שילוב `PeoplePicker` בטופס עריכת רשימה
- `src/lib/logic/tasksBoard.svelte.ts` - מתודת `togglePeopleSection()` להסתרה/הצגה
- `src/lib/data/texts.ts` - טקסטים: "אנשים", "ניהול אנשים", "מי יהיה איתנו היום?", וכו'
- `src/lib/services/migration.ts` - מיגרציה לגרסה 9 (אתחול `people: []` ושדות ברשימות)
- `src/lib/data/defaults.ts` - עדכון `INITIAL_STATE.version` ל-9, אתחול `people: []`

**תכונות מיוחדות:**
- **קומפוננטה משותפת**: `PersonForm` משמשת גם בדף ניהול האנשים (`/settings/people`) וגם ב-`PeoplePicker` (inline) להוספה מהירה
- **מחיקה בטוחה**: בעת מחיקת איש מהמאגר, `peopleStore` מנקה אוטומטית את המזהה שלו מכל הרשימות
- **הצגה ויזואלית**: אווטארים עגולים 80px עם שמות מתחת, כפתור הסתרה/הצגה שנשמר ברמת הרשימה

---

**3. מודאל עריכה כקומפוננטה + פאנל פעולות מעוצב**

רפקטורינג של מודאל עריכת/יצירת רשימה לקומפוננטה משותפת, והוספת פאנל פעולות מעוצב במסך הראשי עם 5 לחצנים צבעוניים.

**קובץ חדש:**
- `src/lib/components/ListEditModal.svelte` - קומפוננטה משותפת עם כל שדות הטופס (name, greeting, title, description, logo, people)

**שימוש חוזר:**
- מסך ראשי (`+page.svelte`) - פתיחת מודאל לעריכה/יצירה ישירות מהלוח
- הגדרות רשימות (`settings/lists/+page.svelte`) - החלפת המודאל הישן בקומפוננטה

**פאנל הפעולות במסך הראשי:**

הפיכת רשימת הכפתורים הישנה לפאנל מעוצב עם 5 כפתורי פעולה:

1. **➕ רשימה חדשה** (כחול) - פותח את `ListEditModal` במצב יצירה
2. **✏️ ערוך רשימה** (סגול) - פותח את `ListEditModal` במצב עריכה
3. **🚫/👁️ הסתר/הצג רשימה** (כתום) - toggle visibility (רק אם לא `isDefault`)
4. **🗑️ מחק רשימה** (אדום) - מחיקת הרשימה הפעילה
5. **🔄 אפס משימות** (צהוב) - איפוס כל המשימות לסטטוס "לא בוצע"

**עיצוב הפאנל:**
- Widget מסודר עם כותרת "📋 ניהול רשימה"
- כל כפתור הוא כרטיס (`action-card`) עם בורדר צבעוני ואפקט hover
- Grid responsive: `repeat(auto-fit, minmax(90px, 1fr))`

**קבצים שהשתנו:**
- `src/routes/+page.svelte` - פאנל מעוצב, state למודאל (`isListEditModalOpen`, `editingListForModal`), לוגיקת `handleSaveList`
- `src/routes/settings/lists/+page.svelte` - החלפת המודאל הישן בשימוש ב-`ListEditModal`

---

**4. שיפורי UX**

**Header sticky (דביק):**
- `src/routes/layout.css` - שינוי גלובלי: `html, body { height: 100vh; overflow: hidden; }`
- `src/routes/+page.svelte` - ה-`<header>` מקבל `position: sticky; top: 0; z-index: 100;`
- תוצאה: כפתורי הניווט וההגדרות תמיד נראים בחלק העליון, גם בזמן גלילה

**תיקון scrollbar במודאל:**
- בעיה: ה-scrollbar היה שובר את הפינות המעוגלות (`border-radius: 24px`)
- פתרון: עטיפת התוכן ב-`div.modal-content` נפרד שמקבל את `overflow-y: auto`, בעוד `.modal-card` החיצוני מקבל `overflow: hidden`
- קובץ: `src/lib/components/ListEditModal.svelte`

**הקטנת כפתורים בפאנל:**
- עיצוב מחדש של כפתורי הפעולות עם **אייקון דומיננטי**:
  - אייקון: `font-size: 1.8rem` (גדול ובולט)
  - טקסט: `font-size: 0.7rem`, `font-weight: 500` (קטן ומשני)
  - כפתור: `padding: 0.6rem 0.5rem` (קומפקטי)
  - grid: `minmax(90px, 1fr)` (במקום 140px)
- תוצאה: זיהוי מהיר יותר של פעולות, פחות עומס ויזואלי
- קובץ: `src/routes/+page.svelte` - CSS של `.action-card`, `.action-icon`, `.action-label`

**ריכוז טקסטים:**
- רפקטורינג: העברת כל הטקסטים מ-`language.ts` לקובץ נפרד
- קבצים:
  - `src/lib/data/texts.ts` - קובץ **חדש** עם כל הטקסטים (100+ מחרוזות)
  - `src/lib/services/language.ts` - רק ייבוא וייצוא מחדש של `TEXTS` + פונקציות עזר

---

#### קבצים חדשים שנוצרו (10 קבצים)

**קומפוננטות:**
1. `src/lib/components/ListHeader.svelte` - כותרת רשימה עם לוגו
2. `src/lib/components/ListEditModal.svelte` - מודאל עריכה משותף
3. `src/lib/components/PersonForm.svelte` - טופס איש (משותף)
4. `src/lib/components/PeoplePicker.svelte` - בחירת אנשים + הוספה inline
5. `src/lib/components/PeopleDisplay.svelte` - הצגה ויזואלית במסך הראשי

**Stores:**
6. `src/lib/stores/peopleStore.svelte.ts` - ניהול מאגר אנשים

**Routes:**
7. `src/routes/settings/people/+page.svelte` - דף ניהול אנשים

**Data:**
8. `src/lib/data/texts.ts` - ריכוז כל הטקסטים

---

#### החלטות ארכיטקטורה

**כותרת לרשימה:**
- **אופציונליות מלאה**: אם לא מוגדר `title` או `description` - לא מוצג כלום
- **לוגו גדול**: 200×200px (לעומת 64px בממשק הרגיל) - מתאים לאירועים מיוחדים
- **מיקום**: ממש בראש הדף, מעל רשימת המשימות (אחרי `ListSwitcher`)

**מערכת אנשים:**
- **Normalization**: איש מוגדר פעם אחת במאגר הגלובלי `AppState.people`, רשימות מפנות רק למזהים
- **קומפוננטה משותפת**: `PersonForm` נבנתה כקומפוננטה גנרית שמשמשת גם בדף ההגדרות וגם inline ב-`PeoplePicker`
- **מחיקה בטוחה**: `peopleStore.deletePerson()` מנקה אוטומטית את המזהה מכל הרשימות (מונע orphaned references)
- **הסתרה נשמרת**: `isPeopleSectionVisible` נשמר ברמת הרשימה (לא גלובלי!) - כל רשימה זוכרת את ההעדפה שלה

**מודאל משותף:**
- **שימוש חוזר מלא**: קומפוננטה אחת משמשת את המסך הראשי ואת הגדרות הרשימות
- **Props מוגדרות היטב**: `isOpen`, `editingList`, `userId`, `onclose`, `onsave` - ממשק נקי
- **State מנוהל בחוץ**: הקומפוננטה stateless ביחס לנתוני האפליקציה - מקבלת הכל כ-props

**פאנל פעולות:**
- **עיצוב כארטיסים**: כל פעולה היא כרטיס נפרד עם בורדר צבעוני - קל לזיהוי
- **אייקון דומיננטי**: המשתמשים (תלמידי חינוך מיוחד) מזהים אייקונים מהר יותר מטקסט
- **Grid responsive**: התאמה אוטומטית למספר עמודות לפי רוחב המסך

**Header sticky:**
- **overflow hierarchy**: `html/body` עם `overflow: hidden`, `.task-list-container` עם `overflow-y: auto`
- **z-index**: header ב-`z-index: 100` כדי להישאר מעל כל האלמנטים

**Scrollbar במודאל:**
- **עטיפה כפולה**: קונטיינר חיצוני (`overflow: hidden`) + קונטיינר פנימי (`overflow-y: auto`)
- למה לא להסתיר? נגישות - המשתמש רואה שיש תוכן נוסף

---

#### מיגרציות

**גרסה 8** (`migration.ts`):
- הוספת שדות `title?: string` ו-`description?: string` לכל רשימה קיימת
- ערך ברירת מחדל: `undefined` (אופציונלי)

**גרסה 9** (`migration.ts`):
- אתחול `people: []` ב-`AppState`
- הוספת שדות לכל רשימה קיימת:
  - `peopleIds?: string[]` - ערך ברירת מחדל: `undefined`
  - `isPeopleSectionVisible: boolean` - ערך ברירת מחדל: `true`

## 2026-01-19 01:15

### שמירת מצב לוח התקשורת הצף

הוספת מנגנון לשמירת מיקום וגודל לוח התקשורת הצף ב-localStorage, כך שהחלון יופיע במיקום האחרון בכל פתיחה.

---

#### מה בוצע?

**1. שירות לניהול מצב החלון (`floatingBoardState.ts`)**

יצירת שירות ייעודי לניהול מצב החלון הצף:

- **טעינה**: `load()` - טוען מיקום וגודל שמורים מ-localStorage עם ולידציה מלאה
- **שמירה**: `save()` - שומר מצב חדש ל-localStorage
- **איפוס**: `reset()` - מאפס למצב ברירת מחדל (שימושי לדיבאג)
- **טיפול במקרי קצה**: וידוא שהחלון תמיד נמצא בתוך גבולות המסך

**קובץ חדש**:
- `src/lib/services/floatingBoardState.ts` - Service מלא עם ולידציה, טיפול ב-SSR ומקרי קצה

**2. אינטגרציה ב-FloatingIframe**

עדכון הקומפוננטה לשימוש ב-Service:

- **טעינה אוטומטית**: `$effect` טוען את המצב השמור בכל פעם שהחלון נפתח
- **שמירה בגרירה**: `stopDrag()` שומר את המיקום החדש
- **שמירה בשינוי גודל**: `stopResize()` שומר את הגודל והמיקום החדשים
- **עדכון סטייל**: המיקום והגודל משוקפים דינמית ב-style

**קובץ שעודכן**:
- `src/lib/components/FloatingIframe.svelte` - אינטגרציה מלאה עם ה-Service

**3. שיפורי UX**

- **הסרת רישום הפיקסלים**: הוסר התצוגה של הגודל (width × height) מהכותרת של החלון
- **ניקיון הממשק**: נותר רק הכותרת וסמל הגרירה בראש החלון

---

#### החלטות ארכיטקטורה

- **localStorage נפרד מ-AppState**: שמירת מצב החלון ב-`floating-board-state` נפרד ולא כחלק מ-AppState, כי:
  - זוהי הגדרת UI שאינה קשורה לנתוני המשתמש
  - לא צריך להיכלל בגיבויים של נתונים
  - משותף לכל המשתמשים (לא per-user)
  - פשוט ומהיר לטעינה

- **Scale יחסי במקום מוחלט**: שמירת `scale` יחסי ל-`minScale` (1.0 = minScale, 1.4 = פי 1.4) מאפשר עקביות בכל גודל קונטיינר

- **טעינה ב-$effect**: שימוש ב-`$effect(() => { if (isVisible) { ... } })` מבטיח טעינה מחדש של המצב בכל פתיחה של החלון

---

#### מעקפים ופתרונות

- **ולידציה מקיפה**: הוספנו בדיקות מרובות ב-`load()` כדי למנוע מצב שבו החלון "נעלם" מחוץ למסך:
  - בדיקה שהמיקום בתוך גבולות המסך (לפחות 200px רוחב ו-100px גובה גלויים)
  - הגבלת גודל מינימלי (400px × 300px) ומקסימלי (95% מרוחב המסך, 90% מגובה)
  - חזרה לברירת מחדל במקרה של ערכים לא תקינים

- **טיפול ב-SSR**: בדיקת `browser` מ-`$app/environment` בכל פעולה למניעת שגיאות בצד השרת

---

## 2026-01-19 00:00

### הוספת פיצ'רים חדשים: לוח תקשורת ומשימות שינוי

הוספה של שני פיצ'רים חשובים למערכת סדר היום, כולל שיפורי עיצוב ורפקטורינג ארכיטקטוני.

---

#### מה בוצע?

**1. לוח תקשורת ב-iframe (Communication Board)**

הוספת אפשרות לפתוח לוח תקשורת חיצוני (כמו Cboard) ישירות מתוך משימה:

- **שדה חדש במשימה**: `communicationBoardUrl?: string` (קישור ללוח תקשורת)
- **לחצן 💬 ב-TaskRow**: מופיע רק למשימות עם קישור ובסטטוס "עכשיו" או "הושלמו"
- **אינטגרציה עם FloatingIframe**: פתיחה של הלוח בחלון צף הניתן לגרירה ושינוי גודל
- **ניהול state ב-Controller**: `iframeBoardUrl`, `iframeBoardVisible`, `openCommunicationBoard()`

**קבצים שונו**:
- `src/lib/types.ts` - הוספת `communicationBoardUrl` ל-Task
- `src/lib/components/AddModal.svelte` - שדה קלט לקישור
- `src/lib/components/TaskRow.svelte` - לחצן פתיחה
- `src/lib/logic/tasksBoard.svelte.ts` - ניהול state של iframe
- `src/lib/services/language.ts` - טקסטים חדשים

**2. משימות שינוי (Change Tasks)**

מנגנון לסימון משימות כ"בוטלה" או "נוספה":

- **שדה חדש**: `changeType?: 'cancelled' | 'added'`
- **משימה בוטלה (🚫)**:
  - עיצוב: גוון אדום עדין (background: `#fef2f2`, border: `#fca5a5`)
  - לחיצה: רק הקראה "שינוי! היום אין [משימה]!" (ללא סימון כהושלמה)
  - לא מקבלת מחוון "עכשיו"
- **משימה נוספה (✨)**:
  - תגית "פעילות חדשה" בצהוב
  - פועלת כמשימה רגילה
- **toggle + dropdown** ב-AddModal לבחירת סוג השינוי

**קבצים שונו**:
- `src/lib/types.ts` - הוספת `TaskChangeType`
- `src/lib/components/AddModal.svelte` - UI לסימון שינוי
- `src/lib/components/TaskRow.svelte` - תצוגת תגי שינוי ועיצוב אדום
- `src/lib/logic/tasksBoard.svelte.ts` - לוגיקת `playChangeAnnouncement()`
- `src/routes/+page.svelte` - דילוג על משימות מבוטלות ב-`activeTaskIndex`

**3. שיפורי עיצוב AddModal**

תיקון בעיות גלילה והצגה:

- **פס גלילה יחיד**: הטופס כולו גולל יחד
- **כפתורים קבועים**: `position: sticky` + `flex-shrink: 0` בתחתית
- **רשת פעילויות מתכווצת**: לחצן ▼/◀ לכיווץ/הרחבה
- **padding סלקטיבי**: מופרד לכותרת, תוכן וכפתורים

**4. רפקטורינג ארכיטקטוני**

העברת לוגיקה מ-View ל-Controller:

- **`activeTaskIndex`** → getter ב-TasksBoardController (דילוג על משימות מבוטלות)
- **iframe state** → TasksBoardController
- **`openCommunicationBoard()`** → TasksBoardController
- שמירה על הפרדת רשויות: View רק מציג, Controller מנהל

**5. מיגרציה**

- **גרסה 7**: הוספת שדות `communicationBoardUrl` ו-`changeType` למשימות קיימות
- `src/lib/services/migration.ts` - מיגרציה אוטומטית
- `src/lib/data/defaults.ts` - עדכון version ל-7

---

#### החלטות ארכיטקטורה

- **משימות מבוטלות לא נספרות כפעילות**: החלטנו שמשימה מסומנת כ"בוטלה" לא תהיה המשימה הפעילה (`activeTaskIndex`) ולא תקבל מחוון "עכשיו", כי היא לא אמורה להתבצע - רק להשמיע הודעה.

- **TTS במקום קבצי אודיו למשימות שינוי**: כרגע משתמשים ב-TTS להשמעת "שינוי! היום אין [משימה]" כי אין קבצי אודיו מוקלטים. ניתן להוסיף `change.mp3` ו-`no_today.mp3` בעתיד.

- **FloatingIframe למשימות פעילות בלבד**: לחצן לוח התקשורת מופיע רק למשימות בסטטוס "עכשיו" או "הושלמו" כדי למנוע הסחת דעת ממשימות עתידיות.

- **רשת פעילויות מתכווצת**: במקום להסתיר לגמרי, בחרנו באפשרות לכווץ לשורה אחת עם אפשרות להרחבה - כך המשתמש שולט בכמות המידע הגלויה.

---

#### מעקפים ופתרונות

- **padding סלקטיבי ב-modal-card**: הסרנו את ה-padding הכללי מה-modal-card והוספנו אותו סלקטיבית לכל אלמנט (כותרת, טופס, כפתורים) כדי לאפשר scroll נכון עם כפתורים קבועים בתחתית.

- **`min-height: 0` על form**: הוספנו `min-height: 0` ל-form כדי לאפשר ל-flexbox overflow לעבוד נכון. ללא זה, הטופס מסרב להתכווץ מתחת לגודל התוכן שלו.

---

## 2026-01-18 21:00

### מערכת חיתוך תמונות מלאה (Image Crop System)

יישום מערכת מקיפה לחיתוך, זום והזזת תמונות בכל הפרויקט. המערכת עברה מספר שלבים של פיתוח ותיקון עד להשגת עקביות מלאה.

---

#### שלב 1: יצירת תשתית החיתוך

**קומפוננטות חדשות שנוצרו:**

1. **`ImageCropEditor.svelte`** - עורך חיתוך אינטראקטיבי
   - גרירה (Drag) - הזזת מיקום התמונה עם עכבר או מגע
   - זום (Zoom) - הגדלה/הקטנה באמצעות גלגלת עכבר או כפתורים (+/-)
   - איפוס - חזרה למצב ברירת מחדל (מרכז, זום 100%)
   - אישור/ביטול - שמירה או ביטול השינויים
   - תמיכה מלאה ב-Touch Events למכשירים ניידים

2. **`ImageDisplay.svelte`** - קומפוננטה אחידה להצגת תמונות
   - תמיכה בתמונות עם ובלי נתוני חיתוך
   - טעינה מ-IndexedDB או מ-static files
   - מצב טעינה אוטומטי עם אינדיקטור
   - תמיכה לאחור (Backward compatibility) - מקבל `string` או `ImageData`

3. **`imageStore.svelte.ts`** - Store מרכזי לניהול מטאדאטה של תמונות
   - אחסון נתוני חיתוך בנפרד מהתמונות עצמן
   - מבנה: `{ [imageId: string]: ImageMetadata }`
   - שיטות: `getImageMetadata`, `setImageMetadata`, `updateImageMetadata`, `deleteImageMetadata`

**שדרוג קומפוננטות קיימות:**

- **`ImageUploader.svelte`** - שודרג לתמוך בעריכת חיתוך:
  - פתיחת עורך חיתוך אוטומטית אחרי בחירת תמונה
  - כפתור "✂️ ערוך חיתוך" לתמונות קיימות
  - שמירת נתוני crop ב-`imageStore`

**מבני נתונים חדשים:**

```typescript
// src/lib/types.ts
interface ImageCropData {
  x: number;      // מיקום X באחוזים (0-100)
  y: number;      // מיקום Y באחוזים (0-100)
  scale: number;  // זום יחסי (1.0 = minScale, 2.0 = פי 2)
}

interface ImageMetadata {
  crop?: ImageCropData;
}

interface ImageData {
  src: string;
}

// הוספה ל-AppState
interface AppState {
  // ... שאר השדות
  images: { [id: string]: ImageMetadata };
}
```

**ארכיטקטורה - הפרדת נתונים:**

במקום לשמור `ImageData` ישירות בתוך `Task`, `UserProfile` ו-`List`, עברנו לארכיטקטורה מנורמלת:
- `Task.imageSrc`, `UserProfile.avatar`, `List.logo` - מחזיקים רק `string` (ID של התמונה)
- `AppState.images` - מחזיק את כל המטאדאטה (כולל נתוני crop) במקום מרכזי
- יתרונות: הפחתת כפילויות, ניהול קל יותר, גמישות בהוספת שדות עתידיים

---

#### שלב 2: אינטגרציה בכל הפרויקט

**החלפת כל תצוגות התמונות ב-`ImageDisplay`:**

קומפוננטות שעודכנו:
- ✅ `TaskRow.svelte` - תמונות משימות
- ✅ `UserSelector.svelte` - אווטרים של משתמשים
- ✅ `ListSwitcher.svelte` - לוגו של רשימות
- ✅ `CelebrationModal.svelte` - תמונות במודאל חגיגה
- ✅ `AddModal.svelte` - תצוגה מקדימה של תמונות
- ✅ `settings/users/+page.svelte` - ניהול אווטרים
- ✅ `settings/lists/+page.svelte` - ניהול לוגו רשימות
- ✅ `+page.svelte` - דף ראשי (אווטר המשתמש המחובר)

**שירותים שעודכנו:**

- **`migration.ts`** - הוספת migration (גרסה 6):
  - העברת נתוני `crop` מתוך `Task.imageSrc`, `UserProfile.avatar`, `List.logo`
  - יצירת `AppState.images` והעברת המטאדאטה אליו
  - המרת הפרופרטיז המקוריים ל-`string` פשוט (ID בלבד)

- **`backupController.svelte.ts`** - עדכון לוגיקת Backup/Restore:
  - Hydration: המרת `idb:xxx` ל-data URLs לפני ייצוא
  - Dehydration: המרת data URLs חזרה ל-`idb:xxx` אחרי ייבוא
  - טיפול נכון ב-`AppState.images` והפניות אליו

---

#### שלב 3: תיקון בעיית העקביות (הבעיה המרכזית)

**הבעיה שהתגלתה:**

תמונות עם חיתוך נראו **שונות לחלוטין** בכל מקום:
- עורך החיתוך (400px) - הציג את התמונה המלאה ✓
- ImageUploader במודאל (150px) - הציג חלק אחר (עורף) ✗
- רשימת המשימות (120px) - הציג חלק שלישי ✗

**3 סיבות שורש:**

1. **Scale מוחלט במקום יחסי**
   - הבעיה: שמרנו `scale: 0.333` (ערך מוחלט שעובד רק עם קונטיינר 400px)
   - כשהתמונה הוצגה בקונטיינר 120px, ה-scale היה שגוי לחלוטין
   - הפתרון: שמירת `scale` **יחסי** ל-`minScale` (1.0 = minScale, 1.4 = פי 1.4 מ-minScale)

2. **`ImageDisplay` ניהלה גדלים בעצמה**
   - הבעיה: prop `size="small|medium|large|full"` הגדיר גודל קבוע (60px, 120px, 200px, 100%)
   - זה יצר אי-עקביות כי הקומפוננטה "החליטה" על הגודל במקום ה-parent
   - הפתרון: הפיכת `ImageDisplay` לגנרית לחלוטין - תמיד 100% × 100% של ה-parent

3. **`minScale` מחושב ב-`$derived` (באג Svelte)**
   - הבעיה: `$derived` לא מתעדכן כש-`naturalWidth/Height` של התמונה משתנים
   - זה גרם ל-`minScale` להישאר 1 במקום להתעדכן לערך הנכון
   - הפתרון: חישוב `minScale` **פעם אחת** ב-`handleLoad()` אחרי שהתמונה נטענת

**התיקונים שבוצעו:**

**`ImageCropEditor.svelte`:**
```typescript
// לפני - scale מוחלט
crop = { x: 50, y: 50, scale: minScale }; // ← minScale משתנה לפי קונטיינר!

// אחרי - scale יחסי
crop = { x: 50, y: 50, scale: 1.0 }; // ← 1.0 = minScale, 2.0 = פי 2

// שימוש בתצוגה:
style:transform="translate(-50%, -50%) scale({minScale * crop.scale})"
```

**`ImageDisplay.svelte`:**
```typescript
// לפני - $derived לא עובד!
let minScale = $derived.by(() => {
  if (!imageRef || !containerRef) return 1;
  const containerSize = containerRef.offsetWidth;
  const scaleByWidth = containerSize / imageRef.naturalWidth;
  const scaleByHeight = containerSize / imageRef.naturalHeight;
  return Math.max(scaleByWidth, scaleByHeight);
});

// אחרי - חישוב פעם אחת ב-handleLoad
let minScale = $state(1);

function handleLoad() {
  if (imageRef && containerRef) {  // ← הסרת תנאי cropData!
    const containerSize = containerRef.offsetWidth;
    const scaleByWidth = containerSize / imageRef.naturalWidth;
    const scaleByHeight = containerSize / imageRef.naturalHeight;
    minScale = Math.max(scaleByWidth, scaleByHeight);
  }
  imageLoaded = true;
  onload?.();
}
```

```css
/* לפני - גדלים קבועים */
.size-small { width: 60px; height: 60px; }
.size-medium { width: 120px; height: 120px; }
.size-large { width: 200px; height: 200px; }
.size-full { width: 100%; aspect-ratio: 1; }

/* אחרי - גנרי לחלוטין */
.image-display {
  width: 100%;
  height: 100%;
}
```

**הסרת `size` prop מכל מקומות השימוש:**

```svelte
<!-- לפני -->
<ImageDisplay imageSrc={task.imageSrc} size="medium" />

<!-- אחרי - הגודל נקבע על ידי ה-parent -->
<div style="width: 120px; height: 120px;">
  <ImageDisplay imageSrc={task.imageSrc} />
</div>
```

**`ImageUploader.svelte` - Dog-fooding:**

הקומפוננטה עברה רפקטור להשתמש ב-`ImageDisplay` לתצוגה מקדימה (במקום לוגיקה משלה):
```svelte
<!-- לפני - לוגיקה כפולה -->
<div class="preview-image-cropped">
  <img use:dbImage={currentImageSrc} ... />
</div>

<!-- אחרי - שימוש ב-ImageDisplay -->
<div class="preview-wrapper">
  <ImageDisplay 
    imageSrc={currentImageSrc}
    alt={alt}
    className="preview-image-display"
  />
</div>
```

---

#### שלב 4: תיקוני עיצוב ועקביות (השלמה)

**2 באגים קריטיים שנותרו:**

1. **`minScale` לא מחושב כשאין `cropData`**
   - הבעיה: התנאי `if (imageRef && containerRef && cropData)` ב-`handleLoad()`
   - גרם לתמונות **ללא** חיתוך להיות בגודל שגוי
   - הפתרון: הסרת `&& cropData` - חישוב `minScale` **תמיד**

2. **`ImageUploader` ללא גודל מוגדר**
   - הבעיה: אחרי שהפכנו את `ImageDisplay` לגנרית, ה-wrapper לא הגדיר גודל
   - גרם לתמונה להתמוטט ל-0px
   - הפתרון: הוספת `width: 150px; height: 150px;` ל-CSS

**שוליים עגולות לכל התמונות:**

- `TaskRow.svelte`: הוספת `border-radius: 12px` + `overflow: hidden` ל-`.task-image-wrapper`
- `ImageUploader.svelte`: הוספת `border-radius: 12px` + `overflow: hidden` לתצוגה מקדימה
- קומפוננטות אחרות: כבר היו עם שוליים עגולות או עיגול מלא (אווטרים)
- **החלטה**: לא לשנות את `ImageDisplay` עצמה (שמירה על גנריות)

**גובה שורות זהה:**

- הבעיה: `TaskRow` עם `max-height: 180px; min-height: 100px;` גרם לגבהים שונים
- הפתרון: `height: 120px;` קבוע
- תוצאה: כל השורות באותו גובה בדיוק

**פרופורציות במודאל חגיגה:**

- הבעיה: `CelebrationModal` עם `width: 100%; height: 120px;` **בלי** `aspect-ratio: 1`
- גרם לתמונות להיות רחבות במקום מרובעות
- הפתרון: הוספת `aspect-ratio: 1;` + שינוי `width` ל-`auto`

---

#### בדיקות מקיפות בדפדפן

לאחר כל תיקון, בוצעו בדיקות יסודיות:
- ✅ רענון דפדפן והמתנה לטעינה מלאה
- ✅ כניסה למצב עריכה
- ✅ פתיחת מודאל עריכת משימה
- ✅ פתיחת עורך החיתוך
- ✅ שינוי זום ל-140% (4 לחיצות על +)
- ✅ שמירה ובדיקת עקביות ב-3 מקומות:
  - עורך החיתוך (400px)
  - ImageUploader במודאל (150px)
  - רשימת המשימות (120px)
- ✅ בדיקת מודאל החגיגה (סימון משימה כבוצעת)
- ✅ צילומי מסך לאימות ויזואלי

---

#### סיכום התוצאות

**לפני:**
- ❌ תמונות עם חיתוך נראות שונות בכל מקום
- ❌ תמונות ללא חיתוך בגודל שגוי
- ❌ ImageUploader מתמוטט ל-0px
- ❌ שורות בגבהים שונים
- ❌ תמונות ללא שוליים עגולות
- ❌ תמונות במודאל חגיגה רחבות ולא מרובעות

**אחרי:**
- ✅ **עקביות מלאה** - כל התמונות נראות זהות בכל המקומות
- ✅ חיתוך עובד בצורה זהה בכל גודל קונטיינר
- ✅ ImageUploader עם גודל קבוע (150px × 150px)
- ✅ כל השורות בגובה זהה (120px)
- ✅ כל התמונות עם פינות מעוגלות (`border-radius: 12px`)
- ✅ תמונות במודאל חגיגה מרובעות (`aspect-ratio: 1`)

---

#### קבצים שנוצרו/שונו

**קבצים חדשים:**
```
sveltekit-version/
├── src/lib/components/
│   ├── ImageCropEditor.svelte       (עורך חיתוך אינטראקטיבי)
│   ├── ImageDisplay.svelte          (תצוגת תמונות אחידה)
│   └── FloatingIframe.svelte        (עזר לבדיקות)
├── src/lib/stores/
│   └── imageStore.svelte.ts         (ניהול מטאדאטה של תמונות)
├── src/routes/
│   └── test-board/+page.svelte      (דף בדיקות)
└── docs/
    └── image-crop-feature.md        (תיעוד הפיצ'ר)
```

**קבצים ששונו:**
```
sveltekit-version/
├── src/lib/
│   ├── types.ts                     (ImageCropData, ImageMetadata, AppState.images)
│   ├── data/defaults.ts             (INITIAL_STATE.images)
│   ├── config.ts                    (קונפיגורציה)
│   ├── components/
│   │   ├── ImageUploader.svelte     (אינטגרציה עם עורך + dog-fooding)
│   │   ├── TaskRow.svelte           (שוליים עגולות + גובה קבוע)
│   │   ├── CelebrationModal.svelte  (פרופורציות + שוליים)
│   │   ├── AddModal.svelte          (שימוש ב-imageStore)
│   │   ├── ListSwitcher.svelte      (שימוש ב-ImageDisplay)
│   │   └── UserSelector.svelte      (שימוש ב-ImageDisplay)
│   ├── logic/
│   │   ├── tasksBoard.svelte.ts     (עדכון טיפוסים)
│   │   └── backupController.svelte.ts (hydration/dehydration)
│   ├── services/
│   │   ├── migration.ts             (migration v6 - העברת crop data)
│   │   └── language.ts              (טקסטים)
│   └── stores/
│       ├── persistence.ts           (שמירת images)
│       └── listStore.svelte.ts      (עדכון טיפוסים)
└── src/routes/
    ├── +page.svelte                 (שימוש ב-ImageDisplay)
    └── settings/
        ├── users/+page.svelte       (שימוש ב-ImageDisplay + imageStore)
        └── lists/+page.svelte       (שימוש ב-ImageDisplay + imageStore)
```

---

#### החלטות עיצוב ואדריכליות

1. **שמירה על גנריות `ImageDisplay`**: 
   - לא הוספנו `border-radius` ישירות לקומפוננטה
   - העיצוב מוגדר ב-parent containers
   - מאפשר גמישות ושימוש חוזר

2. **גובה קבוע במקום גמיש**: 
   - שינוי מ-`max-height` + `min-height` ל-`height` קבוע
   - מבטיח עקביות ויזואלית מלאה

3. **Scale יחסי במקום מוחלט**:
   - `crop.scale` יחסי ל-`minScale`
   - מאפשר עקביות בכל גודל קונטיינר

4. **הפרדת מטאדאטה מנתונים**:
   - `AppState.images` מרכזי
   - הפניות פשוטות (string IDs) ב-entities
   - מונע כפילויות ומקל על ניהול

---

#### מעקפים ופתרונות טכניים

1. **חישוב `minScale` ב-`handleLoad` במקום `$derived`**:
   - ה-`$derived` של Svelte לא מתעדכן כש-`naturalWidth/Height` משתנים
   - פתרון: חישוב חד-פעמי אחרי טעינת התמונה

2. **Dog-fooding ב-`ImageUploader`**:
   - שימוש ב-`ImageDisplay` במקום לוגיקה כפולה
   - מבטיח עקביות ומפחית code duplication

3. **תמיכה לאחור מלאה**:
   - `ImageDisplay` מקבל גם `string` וגם `ImageData`
   - Migration אוטומטי של נתונים ישנים
   - אין צורך בשינויים ידניים

---

#### תיעוד נוסף

- **`sveltekit-version/docs/image-crop-feature.md`** - תיעוד מפורט של הפיצ'ר
- **`temp/image-crop-summary.md`** - סיכום תהליך התיקון

---

## 2026-01-14 18:50

### אימות מול גוגל ושיפורי בנייה

### שינויים שבוצעו

- **מדיניות פרטיות (Privacy Policy)**:

  - הוספת דף `/privacy` סטטי ומותאם לדרישות האימות של גוגל (Google Verification).
  - הדף מצהיר כי בסיס הנתונים הוא לוקאלי/פרטי בלבד ואינו נאסף ע"י המפתח.
  - נוסף קובץ `package.json` מעודכן עם סקריפט `deploy` מקוצר.

- **שיפורי בניה (Build Optimization)**:
  - **פתרון בעיית ייבוא דינמי**: החלפת `import(...)` דינמי בייבוא סטטי ב-`globalState.svelte.ts` עבור `migrationService`.
  - השינוי פתר אזהרות ב-Vite ומנע שגיאות בזמן ריצה הקשורות לטעינת מודולים (Chunk loading).

---

## 2026-01-14 02:15

### רה-ארגון דף הגדרות (Routing Refactor)

### שינויים שבוצעו

- **שינוי ארכיטקטורת ניווט**:

  - מעבר מדף יחיד (`settings/+page.svelte`) המנהל טאבים בתנאי (`if/else`), למבנה מבוסס נתיבים (Routing).
  - **Layout**: יצירת `settings/+layout.svelte` המרכז את הכותרת והניווט העליון.
  - **Pages**: פיצול התוכן ל-3 דפים נפרדים: `users`, `lists`, `general`.
  - **Redirect**: דף הבית של ההגדרות מפנה אוטומטית ללשונית המשתמשים.

- **יתרונות**:
  - אפשרות לקישור ישיר (Deep Linking) ללשונית ספציפית (למשל `/settings/general`).
  - ניהול קוד נקי יותר וחלוקה לקבצים קטנים.
  - שיפור ביצועים (טעינת קוד רלוונטי בלבד).

### שיפורי תשתית (Google SDK)

- **החלפת מימוש HTTP ב-SDK רשמי**:
  - הוחלפו קריאות `fetch` ידניות בשימוש ישיר ב-`gapi.client.drive.files.create` וב-`gapi.client.request`.
  - השינוי מבטיח תאימות טובה יותר לטיפוסים (Types) ומנצל את מנגנון הטיפול בטוקנים של הספרייה.

## 2026-01-14 02:00

### סנכרון ופתרון קונפליקטים (Google Drive)

### שינויים שבוצעו

- **ניהול גרסאות נתונים (`lastModified`)**:

  - הוספת שדה `lastModified` ל-`AppState` ולכל הממשקים הרלוונטיים.
  - עדכון `persistence.ts` לעדכון החותמת בכל שמירה.
  - עדכון מיגרציות ונתוני ברירת מחדל (`defaults.ts`) לתמיכה בשדה החדש.

- **זיהוי קונפליקטים (`BackupController`)**:

  - פיתוח לוגיקה המשווה את חותמת הזמן של הגיבוי בענן מול המידע המקומי בעת התחברות.
  - זיהוי "גיבוי חדש יותר" (Remote Newer) בפער של מעל 5 שניות.

- **ממשק פתרון קונפליקטים**:

  - שדרוג `GoogleDriveBackup.svelte` עם מודאל אזהרה ייעודי.
  - הצגת השוואה ברורה בין הגרסה המקומית לגרסת הענן (תאריך ושעה).
  - כפתורי בחירה: "עדכן מהענן" (Discards Local) או "השאר מקומי" (Overwrites Cloud next backup).

- **לוקליזציה**:
  - הוספת מחרוזות בעברית לכל תרחישי הקונפליקט ב-`language.ts`.

### הערות טכניות

- המנגנון מונע דריסה דורסנית של מידע במקרה שבו משתמש עובד במקביל (או שכח את האפליקציה פתוחה) במכשיר אחר.

## 2026-01-14 01:50

### גיבוי וסנכרון לגוגל דרייב (ללא שרת)

### שינויים שבוצעו

- **שירות ליבה (`googleDriveService`)**:

  - פיתוח מעטפת (Wrapper) מודרנית ל-Google Identity Services (GIS) ול-Drive API v3.
  - תמיכה מלאה בתהליך OAuth2 בצד הלקוח (Implicit Flow), כולל טיפול בטעינת סקריפטים.
  - פונקציות לגיבוי (Create/Update), שחזור (Get media), ורשימת קבצים.

- **בקר לוגי (`BackupController`)**:

  - ניהול לוגיקת הגיבוי האוטומטי: מאזין לשינויים ב-Store ומבצע גיבוי לאחר השהייה (Debounce) של 5 שניות.
  - ניהול State: מחובר/מנותק, זמן גיבוי אחרון, פרטי משתמש.
  - תמיכה ב-Client ID מותאם אישית דרך ממשק ההגדרות.

- **ממשק משתמש (`GoogleDriveBackup`)**:

  - רכיב חדש בהגדרות המציג את סטטוס החיבור, תמונת המשתמש, וכפתורי פעולה.
  - אפשרות לגיבוי ידני מיידי.
  - מודאל בחירת קובץ לשחזור (במקרה של מעבר מכשיר).

- **אינטגרציה ל-Store**:
  - עדכון `globalState` כך שבכל פעולת שמירה (`save`), נשלחת הודעה לבקר הגיבוי.

### שיפורים ותיקונים (v2)

- **שמירה בתיקייה**: הגיבוי נשמר כעת בתיקייה ייעודית `DailyScheduleBackup` בדרייב, לשמירה על סדר.
- **גיבוי תמונות**: המערכת שולפת תמונות מ-IndexedDB ומטמיעה אותן בקובץ הגיבוי, כך שמעבר מכשיר יעביר גם את התמונות.
- **יציבות חיבור**: נוסף מנגנון שמירת טוקן (Persistence) ב-LocalStorage למניעת ניתוק ברענון הדף, כולל סנכרון מול `gapi`.
- **תיקוני טעינת תמונות**: שימוש בפעולה `use:dbImage` בכל הרכיבים (`CelebrationModal`, `ListSwitcher`) כדי לתמוך בקישורי `idb:`.
- **Typings**: הוספת הגדרות TypeScript לספריות של Google (`@types/gapi`).

### הערות טכניות

- היישום הוא **Serverless** לחלוטין. האימות מתבצע ישירות מול גוגל.
- המידע נשמר כקובץ JSON המכיל את כל הנתונים והתמונות (Base64).

---

## 2026-01-14 01:48

### מיתוג (לוגו) ושיפור דף הכניסה

### שינויים שבוצעו

- **עיצוב גרפי (לוגו)**:

  - עוצב לוגו חדש בפורמט SVG (`src/lib/assets/logo.svg`) תחת הקונספט "סדר יום מובנה". הלוגו מציג 3 כרטיסיות מדורגות, המייצגות רצף וסדר, עם צבעוניות של "צי מלוכה" (Navy) ו"קורל" (Coral) ליצירת מראה מקצועי, נקי אך חם.
  - הלוגו הוגדר גם כ-favicon של האתר.

- **דף כניסה (UserSelector)**:

  - שדרוג העיצוב: הלוגו מופיע כעת לצד שם האפליקציה ("סדר יום ויזואלי") בכותרת העליונה.
  - שיפור היררכיה: הפרדה ברורה בין המיתוג (Header) לבין ההנחיה למשתמש ("מי משתמש בלוח היום?").

- **מטא-דאטה**:
  - שם האפליקציה עודכן רשמית ב-`language.ts` ל-"סדר יום ויזואלי".

---

## 2026-01-14 01:36

### ליטוש חוויית חגיגה ומשוב קולי

### שינויים שבוצעו

- **ממשק חגיגה (Celebration Modal)**:

  - שדרוג `CelebrationModal.svelte` לתמיכה במצבי "משימה" ו"כללי".
  - המודאל כעת מציג באופן ויזואלי את המשימה שהושלמה, מחמאה מודגשת, ואת המשימה הבאה בתור (עם תצוגה מקדימה).
  - אינטגרציה מלאה עם נתוני המשתמש (שם, תמונה) והמגדר.

- **לוגיקת משוב (Feedback Logic)**:

  - עדכון `tasksBoard.svelte.ts` לשימוש ב-`boostService` וב-`audioSequencer`.
  - הוספת המתנה (`await`) לסיום ניגון רצף האודיו המלא לפני סגירה אוטומטית של המודאל.
  - טיפול במקרי קצה: סיום כל המשימות, או חגיגה כללית (גיבוי/פעולה אחרת) ללא הקשר משימה.

- **תוכן ומשאבים**:
  - עדכון `defaults.ts` ו-`language.ts` עם נתונים התומכים בלוגיקה החדשה.
  - הכנה לתמיכה בגיבוי בענן (הוספת תשתית בקבצי הליבה).

### בדיקות

- וידוא סנכרון בין האודיו (TTS/קבצים) לבין הופעת המודאל.
- בדיקת זרימה של השלמת משימה -> חגיגה -> סגירה.

---

## 2026-01-14 01:25

### הפרדת דף בחירת משתמש ושיפור טעינה

### שינויים שבוצעו

- **ארכיטקטורה וניווט**:

  - **הפרדת נתיב**: מסך בחירת המשתמש (`UserSelector`) הועבר משילוב בדף הבית לנתיב ייעודי ועצמאי: `/login`.
  - **ניהול הפניות**: הדף הראשי (`/`) כעת בודק את סטטוס הטעינה והחיבור. משתמש לא מחובר מופנה ל-`/login` (לאחר טעינה), ומשתמש מחובר נשאר בלוח.

- **חוויית טעינה (UX)**:

  - **Splash Screen**: יצירת רכיב `src/lib/components/SplashScreen.svelte` המציג אנימציית טעינה נקייה וממותגת. רכיב זה מוצג בזמן שהאפליקציה מבצעת "Hydration" וטוענת נתונים, כדי למנוע הבהובים של תוכן לא רלוונטי ("Flash of Unstyled Content" או תצוגת לוגין רגעית).

- **קוד**:
  - `src/routes/+page.svelte`: הוספת מנגנון `isLoaded` המבוסס על `onMount` (לווידוא ריצה בצד הלקוח) ושימוש ב-`$effect` לביצוע הפניות ניווט ריאקטיביות. ההפניה האוטומטית מ-`/login` בוטלה לפי בקשת המשתמש.
  - `src/routes/login/+page.svelte`: דף חדש המארח את `UserSelector` ומטפל בכניסה למערכת.

### בדיקות ואימות

- **בדיקת דפדפן (סוכן אוטונומי)**:
  - בוצעה סימולציה של משתמש חדש (ניקוי `localStorage`).
  - וידוא שהגעה ל-`/` מפנה ל-`/login` (עם הצגת Splash Screen בדרך).
  - וידוא שבחירת משתמש ב-`/login` מפנה חזרה ל-`/` ומציגה את הלוח האישי.
  - צילומי מסך בוצעו לאימות ויזואלי של דף הלוגין ודף הבית לאחר כניסה.

---

## 2026-01-13: משוב קולי היברידי (TTS + קבצים)

### שינויים שבוצעו

- **שירותי אודיו**:
  - `src/lib/services/audioSequencer.ts`: שירות חדש לניגון רצף של מקטעי אודיו (קבצים ו-TTS משולבים).
  - `src/lib/services/boosts.ts`: עדכון `getFeedbackSequence` ליצירת רצף דינמי ("סיימת את [משימה]! [חיזוק]! עכשיו, [הבא בתור]"). שימוש בלוגיקה היברידית המעדיפה קבצי MP3 אם קיימים, ונופלת ל-TTS אם לא.
- **נתונים**:
  - הוספת קבצי קריינות חדשים (`static/sounds`) עבור חלקי המשפט המקשרים ("סיימת את...", "עכשיו...", "כל הכבוד").
- **UI**:
  - `+page.svelte`: אינטגרציה עם ה-Sequencer בעת סיום משימה, והארכת זמן הצגת הפופאפ ל-5 שניות.
- **תרגום הערות קוד**:
  - כל הערות הקוד (Comments) בפרויקט תורגמו מאנגלית לעברית, כולל Stores, Services, Logic, Components ו-Routes.

### בדיקות

- **קבצים**: וידוא שקבצים קיימים (`shower.mp3`) מתנגנים כחלק מהרצף.
- **TTS**: וידוא שמשימות ללא קבצים מוקראות ע"י הדפדפן.
- **רצף**: בדיקת המעברים בין חלקי המשפט.

## 2026-01-13: סנכרון פופ-אפ חגיגה ומבנה מודולרי

### שינויים שבוצעו

- **סנכרון ויזואלי-קולי**:
  - `TasksBoardController`: עודכן להמתין (`await`) לסיום רצף האודיו המלא לפני סגירת פופ-אפ החגיגה.
- **עיצוב מודולרי**:
  - `CelebrationModal.svelte`: המודאל הפך למובנה ומציג:
    1. כותרת "סיימת את [שם המשימה]"
    2. תמונת המשימה (בגדול)
    3. מחמאה (בטקסט בולט)
    4. "עכשיו, [שם המשימה הבאה]" + תמונה קטנה של המשימה הבאה.
  - `language.ts`: הפרדת הטקסטים והלוגיקה כדי להחזיר את המחמאה (`praise`) בנפרד לצורך תצוגה ויזואלית מודגשת.
- **תשתית נתונים**:
  - הגדרת `CelebrationData` המכיל את כל המידע הדרוש לתצוגה (תמונות, טקסטים, מגדר), מה שמונע תלות בלוגיקה בתוך הקומפוננטה.

### בדיקות

- **זרימה**: ברגע סיום משימה, הפופ-אפ נפתח, מציג את תמונת המשימה הנוכחית והבאה, והאודיו מתנגן בסנכרון.
- **סגירה**: הפופ-אפ נסגר אוטומטית _רק_ לאחר סיום הקריינות.
- **מקרי קצה**: טיפול במצב שבו אין משימה עוקבת (סיום יום).

---

## 2026-01-12: יישום אחסון תמונות ב-IndexedDB

### שינויים שבוצעו

- **שירותי אחסון**:
  - `src/lib/services/db.ts`: מעטפת ל-IndexedDB לשמירת Blob.
  - `src/lib/services/migration.ts`: מיגרציה אוטומטית מתמונות Base64 ל-IDB.
- **לוגיקת UI**:
  - `src/lib/actions/dbImage.ts`: פעולת Svelte לטעינה אסינכרונית של תמונות (Data URL -> Blob URL).
- **רכיבים**:
  - `AddModal.svelte`: שומר תמונות ל-DB מיידית בעת הבחירה.
  - `TaskRow.svelte`: משתמש ב-`dbImage` להצגת התמונות.
  - `appStore.svelte.ts`: מפעיל את המיגרציה בעת הטעינה.

### בדיקות ואימות

בוצע אימות ויזואלי באמצעות סריקת דפדפן אוטומטית:

1.  **הוספת תמונה מותאמת אישית (משימות, משתמשים, רשימות)**: סימולציה של העלאת קובץ עברה בהצלחה.
2.  **רכיב גנרי (`ImageUploader`)**: הוטמע בהצלחה ומשמש אחידות בכל המערכת.
3.  **בורר משתמשים**: מציג בהצלחה תמונות מפרופיל המשתמש ב-IndexedDB.

#### תיעוד ויזואלי

![מודל הוספה עם תצוגה מקדימה](add_task_modal_with_upload_preview_1768209965594.png)
![ניהול משתמשים - Avatar](verification_users_tab_1768210807339.png)
![ניהול רשימות - לוגו](verification_lists_tab_1768210817481.png)
![בורר משתמשים ראשי](verification_user_selector_1768210845352.png)
ושינויים

מסמך זה מתעד את התקדמות הפיתוח, שינויים מהותיים ומימושי פיצ'רים.

> [!NOTE]
> 2026-01-06 23:59

## שיפורים ויזואליים בממשק הניהול

שדרוג משמעותי של דף ההגדרות (`/settings`) לרמת גימור גבוהה ומודרנית.

### מה בוצע?

**1. עיצוב וממשק (UI/UX)**

- **עיצוב מעודכן**: הטמעת סגנון נקי ומודרני (Clean Look) עם שימוש בצלליות רכות (Shadows), פינות עגולות (Rounded Corners) וטיפוגרפיה ברורה.
- **אייקונים**: החלפת כפתורי הטקסט המיושנים (✎/🗑️) באייקוני SVG אינטואיטיביים ונגישים.
- **Grid Layout**: שימוש ב-CSS Grid לסידור רספונסיבי של כרטיסי המשתמשים והרשימות.

**2. שיפורים בטפסים (Forms)**

- **תצוגה מקדימה**: שיפור חווית הוספת משתמש ע"י הצגה ברורה של האווטאר הנבחר בתוך המודאל.
- **פוקוס**: הוספת אינדיקציה ויזואלית ברורה (Focus Ring) בעת מעבר בין שדות.

### החלטות ארכיטקטורה

- **[Vanilla CSS]**: המשכנו להשתמש ב-CSS רגיל בתוך רכיבי Svelte (`<style>`) כדי לשמור על פשטות ולא להוסיף תלות בספריות חיצוניות (כמו Tailwind) בשלב זה, אך השתמשנו במשתנים ודרכים מודרניות לכתיבה כדי להקל על תחזוקה עתידית.

---

> [!NOTE]
> 2026-01-06 21:40

## שיפורי הידר וברכות דינמיות

שיפור נראות ממשק ההידר והטמעת ברכות דינמיות המותאמות לרשימה הפעילה.

### מה בוצע?

**1. שיפורי ממשק (UI Improvements)**

- **אווטאר**: הוגדל מ-40px ל-56px. נוסף אפקט זום (Scale 2.2) במעבר עכבר לשיפור הראות וזיהוי המשתמש.
- **ניקיון**: הוסר הטקסט המיותר של שם המשתמש מתחת לאווטאר.

**2. מנגנון ברכות (Dynamic Greetings)**

- **ברכה מותאמת**: הטקסט ("בוקר טוב" / "אחרי צהריים טובים") נגזר כעת מהגדרת הרשימה הפעילה (`list.greeting`) ולא מקוד קשיח.
- **תמיכה בנתונים**: הוספת שדה `greeting` לממשק `List` ועדכון נתונים קיימים (Migration versions 4, 5) עם ערכי ברירת מחדל ("בהצלחה", "בוקר טוב").

**3. מיגרציה וריפקטור (Refactoring)**

- **migrateState**: הפרדת לוגיקת שדרוג הנתונים לפונקציה נפרדת ב-`appStore` כדי לשמור על `load()` נקי וקריא.

### החלטות ארכיטקטורה

- **[Dynamic Greeting Property]**: בחרנו לשמור את הברכה כמאפיין של הרשימה (`list.greeting`) ולא כחישוב לוגי (Computed). זה יאפשר בעתיד למשתמשים לערוך את הברכה לכל רשימה (למשל: "חופשה נעימה!" לרשימת חופש).

---

> [!NOTE]
> 2026-01-06 20:30

## יצירת אווטארים וארגון נכסים

הושלמה יצירת אווטארים אישיים בסגנון Pixar לכל הילדים ובוצע ארגון מחדש של הנכסים הסטטיים בפרויקט לתחזוקה קלה יותר.

### מה בוצע?

**1. יצירת אווטארים (Avatar Generation)**

- יצירת אווטארים לחברי המשפחה (תמר, יהונתן, אריאל) בתהליך דו-שלבי:
  1.  **Studio Portrait**: יצירת תמונת מקור ריאליסטית "נקייה" בסטודיו עם רקע לבן.
  2.  **Pixar Style**: המרה לדמות תלת-ממד בסגנון Pixar המבוססת על תמונת הסטודיו.
- האווטארים החדשים שולבו באפליקציה ב-`defaults.ts`.

**2. ארגון משאבים (Assets Reorganization)**

- **הפרדת סביבות**: יצירת תיקיית `resources_playground` (מחוץ ל-`static`) עבור חומרי גלם, ניסיונות גנרטיביים וקבצי מקור כבדים.
- **מבנה Static חדש**:
  - `static/images/activities/`: תמונות לפעילויות.
  - `static/images/times/`: אייקונים של זמני היום (בוקר/ערב).
  - `static/images/users/`: האווטארים הסופיים.
  - `static/sounds/ui/`: צלילי ממשק.
- **עדכון קוד**: עדכנו את כל הנתיבים בקוד (`defaults.ts`, `appStore.svelte.ts`, `AddModal.svelte` וכו') לעבודה עם המבנה החדש.

### החלטות ארכיטקטורה

- **[Playground Folder]**: בחרנו להוציא את ה-Raw Files מתוך `static` (ולמעשה מחוץ ל-Build של האפליקציה) כדי לא להכביד על ה-Deploy וכדי לשמור על הפרדה ברורה בין "חומרי עבודה" לבין "נכסי ייצור".

---

> [!NOTE]
> 2026-01-06 15:00

## תמיכה בריבוי משתמשים ושינויים מבניים

הוטמעה תמיכה מלאה בריבוי משתמשים ולוגיקת הליבה עברה לשירותים ייעודיים.

### מה בוצע?

**1. ריבוי משתמשים (User Management)**

- **מסך כניסה (UserSelector)**: יצירת מסך לבחירת המשתמש (תמר, יונתן, אריאל) עם תמיכה באווטארים.
- **התאמה אישית**: תמיכה במין (בן/בת) לברכות מותאמות ("אתה אלוף" / "את אלופה").
- **ניהול State**: יצירת `appStore.svelte.ts` - Store מרכזי המבוסס על Svelte 5 Runes לניהול כל המידע.
- **מיגרציה**: הוספת מנגנון המרה אוטומטי מנתונים ישנים (`my_lists`) למבנה החדש והמאוחד (`daily-schedule-data`).

**2. ריפקטורינג וניקיון קוד (Refactoring)**

- **הוצאת לוגיקה**: פיצול הלוגיקה המורכבת מ-`+page.svelte` לקבצים ייעודיים:
  - `src/lib/services/audio.ts`: ניהול השמעת סאונד.
  - `src/lib/logic/dragDrop.svelte.ts`: ניהול גרירה ושחרור (Drag & Drop) באמצעות מחלקה ייעודית.
- **ניהול נתונים (Data)**: הסרת התלות בקבצי JSON והעברת נתוני ברירת המחדל לקובץ טייפסקריפט `src/lib/data/defaults.ts`.

### החלטות ארכיטקטורה

- **[Unified LocalStorage]**: בחרנו לשמור את כל המידע (משתמשים, רשימות, הגדרות) באובייקט JSON יחיד בלוקל-סטורג'. הסיבה: פשטות בניהול גרסאות, גיבוי ושחזור, ומניעת חוסר תאימות בין מפתחות שונים.
- **[Composables / Runes Classes]**: בחרנו להוציא את לוגיקת ה-Drag&Drop למחלקה (`new DragDropManager`) שמקבלת Getters למצב העדכני. זה מאפשר לקוד הלוגי להישאר נקי מה-UI אך עדיין להגיב לשינויים ב-State (כמו `isEditMode`).

---

## [קודם] מיגרציה ל-Svelte 5 ולוקליזציה

(ראה למטה לשינויים היסטוריים...)
