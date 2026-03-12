# Board rendering + TTS — שלב 1 ליבה

## מטרה
לוח AAC עובד: פותחים → רואים אריחים → לוחצים → שומעים דיבור.

## סקופ

### 1. נתוני לוח סטטיים
- [ ] ייבוא `boards.json` מ-Cboard repo (לוח home בעברית)
- [ ] הגדרת TypeScript types: `Board`, `Tile`, `CommunicatorGrid`
- [ ] קובץ נתונים סטטי ב-`src/lib/data/` עם לוח דוגמה

### 2. Board Store (Svelte 5 runes)
- [ ] `src/lib/stores/boards.svelte.ts`
- [ ] `$state` — הלוח הנוכחי, מערך אריחים
- [ ] `$state` — output bar (מערך סמלים שנבחרו)
- [ ] `$state` — board navigation stack (לניווט קדימה/אחורה)
- [ ] פעולות: `selectTile()`, `navigateToBoard()`, `goBack()`, `clearOutput()`

### 3. Board.svelte — קומפוננטת לוח
- [ ] CSS Grid layout עם `grid-template-columns: repeat(N, 1fr)`
- [ ] גודל grid דינמי מתוך נתוני הלוח (`grid.rows`, `grid.columns`)
- [ ] RTL: `dir="rtl"` על הקומפוננטה
- [ ] Responsive: מתאים ל-768px+

### 4. Tile.svelte — אריח AAC בעיצוב Grid-inspired
- [ ] סמל (תמונה מ-ARASAAC URL) + תווית טקסט
- [ ] צבע רקע לפי קטגוריה (מתוך `backgroundColor` ב-data)
- [ ] `border-radius` עגול, צל עדין, אנימציית לחיצה (`scale`)
- [ ] גודל מינימלי 80x80px
- [ ] סוגים: `button` (מדבר) / `folder` (מנווט ללוח אחר)
- [ ] Accessible: `role="button"`, `aria-label`

### 5. OutputBar.svelte — פס פלט עליון
- [ ] מציג את הסמלים שנלחצו (תמונה + תווית קטנה)
- [ ] כפתור "נקה" (🗑️)
- [ ] כפתור "דבר הכל" — מדבר את כל המשפט
- [ ] RTL: סמלים מימין לשמאל

### 6. TTS — Web Speech API
- [ ] `src/lib/services/speech.ts`
- [ ] `speak(text: string, lang: string)` — מדבר טקסט
- [ ] שפת ברירת מחדל: `he-IL`
- [ ] לחיצה על אריח → מדבר את ה-label
- [ ] לחיצה על "דבר הכל" → מדבר את כל ה-output bar

### 7. ניווט בין לוחות
- [ ] לחיצה על אריח מסוג `folder` → מציג את הלוח המקושר (`loadBoard`)
- [ ] כפתור "חזרה" → חוזר ללוח הקודם (stack)
- [ ] כפתור "בית" → חוזר ל-home board

### 8. Layout ראשי
- [ ] `src/routes/+layout.svelte` — RTL, עברית, Tailwind
- [ ] `src/routes/+page.svelte` — מציג את ה-home board
- [ ] `<html lang="he" dir="rtl">`

## מחוץ לסקופ
- ❌ Auth / Login
- ❌ cboard-api integration
- ❌ Settings (מעבר ל-grid size toggle פשוט)
- ❌ Grid Sets
- ❌ Drag & Drop
- ❌ ElevenLabs / Azure TTS
- ❌ i18n (עברית hardcoded)
- ❌ PWA / Service Worker
- ❌ Edit mode

## מסמך הפניה
ראה `docs/plans/cboard-sveltekit-evaluation.md` — סעיפים 4, 6, 7, 8

## קריטריונים להצלחה
1. `bun dev` → נפתח דפדפן → רואים לוח עם אריחים בעברית
2. לחיצה על אריח → שומעים את המילה בעברית
3. לחיצה על תיקייה → מנווט ללוח אחר
4. Output bar צובר סמלים ו"דבר הכל" עובד
5. עיצוב נראה מודרני, RTL, מתאים לטאבלט
