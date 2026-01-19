# יומן פיתוח (Walkthrough)

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
