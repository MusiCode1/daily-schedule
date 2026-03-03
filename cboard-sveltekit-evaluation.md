# הערכת הסבת Cboard ל-SvelteKit + שיפורים

## תאריך: 2026-03-03

---

## 1. סקירת Cboard — מה יש היום

### מידע כללי
- **ריפו**: https://github.com/cboard-org/cboard
- **שפה**: JavaScript (עם קצת TypeScript)
- **כוכבים**: ~729 | **פורקים**: ~258 | **Issues פתוחים**: ~203
- **גודל**: ~230MB (כולל תרגומים ונכסים)
- **רישיון**: GPL-3.0
- **נוצר**: פברואר 2017 (כ-9 שנות פיתוח)

### Tech Stack נוכחי
| טכנולוגיה | שימוש |
|---|---|
| React 17 | UI framework |
| Redux 4 + redux-thunk | ניהול state |
| react-router-dom 5 | ניווט |
| Material-UI 4 | עיצוב וקומפוננטות UI |
| CRACO (CRA override) | Build tooling |
| react-intl 2 | תרגומים (i18n) |
| axios | קריאות API |
| redux-persist 5 | שמירת state מקומי |
| localforage + idb | IndexedDB לאחסון מקומי |
| sw-precache | Service Worker ל-PWA |
| react-grid-layout | פריסת אריחים |
| react-dnd + touch-backend | Drag & Drop |
| microsoft-cognitiveservices-speech-sdk | Azure TTS |
| Playwright | בדיקות E2E |

### ארכיטקטורת הקומפוננטות (20 תיקיות ראשיות)
```
src/components/
├── Account/          — ניהול חשבון משתמש
├── Analytics/        — דוחות אנליטיקה
├── App/              — קומפוננטת שורש
├── AppLoading/       — מסך טעינה
├── AuthScreen/       — הרשמה/כניסה
├── Board/            — הלוח העיקרי (הקומפוננטה הכבדה ביותר ~700 שורות)
│   └── Tile/         — אריח בודד
├── Communicator/     — ניהול "מתקשרים" (קבוצות לוחות)
├── EditGridButtons/  — כפתורי עריכת רשת
├── FixedGrid/        — רשת קבועה
├── Grid/             — רשת גמישה
├── LoggedInFeature/  — תכונות למשתמשים מחוברים
├── NavigationButtons/ — ניווט בין לוחות
├── NotFound/         — דף 404
├── Notifications/    — הודעות
├── PremiumFeature/   — תכונות פרימיום
├── ScrollButtons/    — כפתורי גלילה
├── Settings/         — הגדרות
├── UI/               — קומפוננטות UI כלליות
├── VoiceRecorder/    — הקלטת קול
└── WelcomeScreen/    — מסך פתיחה
```

### Providers (5)
- **LanguageProvider** — ניהול שפה ולוקליזציה
- **ScannerProvider** — סריקת מתגים (switch scanning)
- **SpeechProvider** — TTS ודיבור
- **SubscriptionProvider** — מנויים
- **ThemeProvider** — ערכות נושא

### מודל הנתונים

**Board (לוח)**:
```javascript
{
  id: string,
  tiles: Tile[],
  lastEdited: timestamp,
  isFixed: boolean,
  focusedTileId: string,
  grid: { rows, columns },  // ללוח קבוע
  markToUpdate: boolean,
  shouldCreateBoard: boolean
}
```

**Tile (אריח)**:
```javascript
{
  id: string,
  label: string,
  image: string,
  backgroundColor: string,
  borderColor: string,
  loadBoard: string,      // מזהה לוח מקושר (לתיקיות)
  sound: string,           // קובץ קול
  type: 'button' | 'folder' | 'board'
}
```

**Communicator (מתקשר — מקביל ל"אפליקציה" ב-Grid)**:
```javascript
{
  id: string,
  boards: string[],        // מערך מזהי לוחות
  defaultBoardsIncluded: { nameOnJSON, homeBoard },
  lastEdited: timestamp
}
```

### API Backend (cboard-api)
- ריפו נפרד: `cboard-org/cboard-api` (JavaScript, Node.js)
- ~35 endpoints כולל: אימות, CRUD לוחות, CRUD מתקשרים, העלאת קבצים, מנויים, GPT שיפור משפטים
- אימות: Bearer Token
- תמיכה ב-OAuth

### מנועי דיבור
- **Web Speech API** (ברירת מחדל, מובנה בדפדפן)
- **Azure Cognitive Services** (קולות ענן)
- **ElevenLabs** (קולות AI מתקדמים, עם הגדרות stability/similarity/style)
- תמיכה בהקלטת קול אישי לאריחים

---

## 2. ניתוח Grid AAC — מה הם עושים נכון

### מושג ה-Grid Set (קיבוץ לוחות / "יישום")
- **Grid Set** = אוסף של grids (לוחות) מקושרים שמהווים מערכת שלמה
- כל Grid Set מכיל **Home Grid** (לוח בית) — הדף הראשון שנפתח
- **Grid Explorer** — דשבורד ראשי לניהול כל ה-Grid Sets
- 7 קטגוריות מובנות: תקשורת בסמלים, תקשורת טקסט, למידה אינטראקטיבית, אפליקציות נגישות, שליטה במחשב, שליטה בסביבה, חינוך
- מעבר מהיר בין Grid Sets בלי לחזור ל-Explorer

### ניווט מתקדם
- **Jump To** — קפיצה ללוח ספציפי
- **Jump Home** — חזרה תמיד ללוח הבית
- **Jump Back** — חזרה ללוח הקודם
- **Bookmark Grid** — סימנייה שמשנה את היעד של Jump Back
- **Self-closing grids** — לוחות שנסגרים אוטומטית אחרי בחירה (כמו popup)

### יצירת לוחות מהירה
- יצירת תא חדש בלחיצה אחת על תא ריק
- תמיכה ב-**סוגי תאים מרובים**: Write, Jump, Prediction, Command
- **פעולות מרובות בתא אחד** — למשל: כתוב מילה + אמור אותה + קפוץ ללוח אחר
- העתקת לוחות כתבנית
- ייבוא לוחות מ-Grid Sets אחרים
- **Online Grids** — קהילת שיתוף לוחות

### תכונות מתקדמות ב-Grid שחסרות ב-Cboard
1. **דקדוק חכם** — נטיית פעלים אוטומטית לפי הקשר
2. **חיזוי מילים (SwiftKey)** — השלמה אוטומטית חכמה
3. **AI Fix** — תיקון שגיאות כתיב ודקדוק בלחיצה
4. **היסטוריית צ'אט עם מיקום** — הצעות מבוססות מיקום גיאוגרפי
5. **שליטה בסביבה** — שליטה במכשירי בית חכם
6. **עריכה מרחוק** — מטפלים ומשפחה יכולים לערוך מרחוק
7. **Message Banking** — הקלטת ביטויים אישיים בקול הטבעי
8. **קידוד צבעים לפי חלקי דיבור** — שמות עצם, פעלים, תארים בצבעים שונים
9. **תמיכה בשיטות גישה מרובות** — מעקב עיניים, מתגים, touch, joystick

---

## 3. הערכת מורכבות ההסבה ל-SvelteKit

### סיכום מורכבות כולל: 🔴 גבוהה-מאוד

### פירוט לפי תחום

#### א. הסבת הליבה מ-React ל-Svelte
| משימה | מורכבות | הערכת זמן | הערות |
|---|---|---|---|
| הסבת 20 תיקיות קומפוננטות | גבוהה | 3-5 שבועות | ~700+ שורות ב-Board.container.js לבד |
| המרת Redux → Svelte stores | בינונית-גבוהה | 2-3 שבועות | 30+ actions ב-Board reducer, 21 ב-Communicator |
| המרת react-router → SvelteKit routing | בינונית | 1-2 שבועות | ניווט לוחות + history מורכב |
| המרת Material-UI → CSS/UI library | גבוהה | 3-4 שבועות | MUI 4 נמצא בכל מקום; צריך Skeleton UI / Tailwind |
| המרת react-intl → svelte-i18n/paraglide | בינונית | 1-2 שבועות | ~50+ שפות, קבצי תרגום קיימים ב-JSON |
| PWA / Service Worker | נמוכה-בינונית | 1 שבוע | SvelteKit תומך מובנה + @vite-pwa |
| המרת react-dnd → svelte DnD | בינונית | 1 שבוע | svelte-dnd-action או neodrag |
| המרת react-grid-layout → Svelte grid | בינונית-גבוהה | 2 שבועות | אין מקבילה ישירה ב-Svelte |
| בדיקות (Enzyme → Vitest/Testing Library) | בינונית | 2 שבועות | המרת כל הבדיקות |
| API layer (axios → fetch/SvelteKit) | נמוכה | 1 שבוע | SvelteKit load functions |
| **סה"כ הסבת ליבה** | **גבוהה מאוד** | **16-24 שבועות** | **עבור מפתח אחד** |

#### ב. פיצ'רים חדשים שביקשת
| פיצ'ר | מורכבות | הערכת זמן | פירוט |
|---|---|---|---|
| **השבתת אריח** | נמוכה | 2-3 ימים | הוספת `disabled: boolean` לטייל + עיצוב אפור + דילוג בסריקה |
| **שכפול לוח** | נמוכה-בינונית | 3-5 ימים | Deep clone של לוח + כל האריחים + עדכון מזהים + טיפול בלוחות מקוננים |
| **לוח בסיס עם כוונות תקשורתיות** | בינונית | 1-2 שבועות | יצירת תבנית בסיס (צרכים, רגשות, מקומות, אנשים) + מנגנון שכפול אוטומטי לכל לוח חדש |
| **עיצוב אריחים יפה יותר** | בינונית | 1-2 שבועות | עיצוב חדש עם border-radius, צללים, אנימציות, גודל אייקון מותאם, טיפוגרפיה |
| **בחירת קולות ElevenLabs** | בינונית | 1 שבוע | כבר קיים חלקית! צריך UI טוב יותר לבחירה/תצוגה מקדימה + שמירת מועדפים |
| **קיבוץ לוחות (Grid Sets / יישומים)** | גבוהה | 2-3 שבועות | מודל נתונים חדש מעל Communicator + UI ניהול + ניווט בין קבוצות |
| **יצירת לוח מהירה** | בינונית | 1-2 שבועות | wizard פשוט: בחר גודל רשת → בחר תבנית → מלא אריחים ישירות |
| **סה"כ פיצ'רים** | **גבוה** | **7-11 שבועות** | |

---

## 4. אסטרטגיית מיגרציה מומלצת

### אופציה א': Rewrite מלא (מומלץ ✅)

מכיוון שאתה רוצה גם להסב ל-SvelteKit וגם להוסיף שיפורים משמעותיים, **שכתוב מאפס** עם ה-API הקיים כ-backend הוא הגיוני יותר מהסבה הדרגתית.

**למה?**
1. Cboard נבנה על React 17 + MUI 4 + Redux ישן — טכנולוגיות מיושנות
2. `Board.container.js` לבד הוא ~700 שורות של ספגטי שמערבב UI, state, API, ניווט, דיבור
3. המודל של Communicator צריך שינוי מהותי כדי לתמוך ב-Grid Sets
4. אין טעם להמיר קוד מורכב שגם ככה צריך refactoring

**ארכיטקטורה מוצעת ל-SvelteKit:**

```
src/
├── lib/
│   ├── stores/
│   │   ├── boards.svelte.ts      — ניהול לוחות ($state)
│   │   ├── gridsets.svelte.ts    — קיבוץ לוחות
│   │   ├── speech.svelte.ts     — TTS ודיבור
│   │   ├── auth.svelte.ts       — אימות
│   │   └── settings.svelte.ts   — הגדרות
│   ├── components/
│   │   ├── Board/
│   │   │   ├── Board.svelte     — קומפוננטת לוח (פשוטה, ללא ספגטי!)
│   │   │   ├── Tile.svelte      — אריח (עיצוב חדש ויפה)
│   │   │   ├── TileEditor.svelte
│   │   │   └── Grid.svelte      — פריסת רשת (CSS Grid native!)
│   │   ├── GridSetExplorer/     — דשבורד Grid Sets
│   │   ├── Output/              — פס הפלט
│   │   ├── Settings/
│   │   ├── Speech/
│   │   │   └── VoiceSelector.svelte  — בורר קולות עם ElevenLabs
│   │   └── UI/
│   ├── api/
│   │   └── cboard-api.ts       — קריאות ל-API הקיים
│   ├── i18n/
│   └── utils/
├── routes/
│   ├── +layout.svelte           — layout ראשי
│   ├── +page.svelte             — דף בית / Grid Explorer
│   ├── board/[id]/+page.svelte  — תצוגת לוח
│   ├── settings/+page.svelte
│   ├── auth/+page.svelte
│   └── api/                     — SvelteKit API routes (proxy)
└── service-worker.ts            — PWA
```

**יתרונות הגישה:**
- **CSS Grid מובנה** במקום react-grid-layout — פשוט ועוצמתי יותר
- **Svelte 5 runes** ($state, $derived, $effect) במקום Redux — 70% פחות boilerplate
- **SvelteKit routing** — ניווט מובנה עם load functions
- **Bundle קטן בהרבה** — Svelte מקמפל ל-vanilla JS (~1.6KB runtime vs React ~44KB)
- **Scoped CSS** — בלי CSS modules או styled-components

### אופציה ב': הסבה הדרגתית (איטית אבל בטוחה)
- שימוש ב-`svelte-preprocess-react` להטמעת קומפוננטות React בתוך Svelte
- מיגרציה route-by-route
- **חיסרון**: יותר מורכב, כי יש שני framework-ים רצים במקביל

---

## 5. טבלת השוואה: Cboard נוכחי vs. גרסת SvelteKit מוצעת vs. Grid AAC

| תכונה | Cboard נוכחי | SvelteKit מוצע | Grid AAC |
|---|---|---|---|
| **Framework** | React 17 + Redux | SvelteKit 2 + Svelte 5 | .NET (Windows) |
| **פלטפורמות** | Web, PWA, Cordova | Web, PWA | Windows, iPad |
| **קיבוץ לוחות** | Communicator (בסיסי) | Grid Sets (מלא) ✅ | Grid Sets (מלא) |
| **השבתת אריח** | ❌ אין | ✅ | ✅ |
| **שכפול לוח** | חלקי | ✅ מלא | ✅ |
| **לוח בסיס/תבנית** | ❌ | ✅ עם כוונות תקשורתיות | ✅ Super Core/Voco Chat |
| **עיצוב אריחים** | בסיסי, ישן | מודרני, מעוצב | מקצועי |
| **קולות ElevenLabs** | קיים, UI חלש | UI מלא + מועדפים | ❌ (קולות אחרים) |
| **דקדוק חכם** | ❌ | אפשרי בעתיד | ✅ |
| **חיזוי מילים** | ❌ | אפשרי בעתיד | ✅ SwiftKey |
| **יצירת לוח מהירה** | 5+ לחיצות | 2-3 לחיצות | 2-3 לחיצות |
| **Self-closing grids** | ❌ | ✅ | ✅ |
| **סריקת מתגים** | ✅ | ✅ | ✅ מתקדם |
| **PWA/אופליין** | ✅ | ✅ (משופר) | ❌ (native) |
| **קוד פתוח** | ✅ GPL-3.0 | ✅ | ❌ מסחרי (~$600) |
| **Bundle size** | ~300KB+ | ~50-100KB | N/A (native) |

---

## 6. סדר עדיפויות מומלץ

### שלב 1 — ליבה (8-10 שבועות)
1. הקמת פרויקט SvelteKit עם routing בסיסי
2. Store לניהול לוחות ואריחים (Svelte 5 runes)
3. רנדור לוח עם CSS Grid
4. קומפוננטת Tile חדשה ויפה
5. אינטגרציה עם cboard-api הקיים
6. TTS בסיסי (Web Speech API)
7. PWA + אופליין

### שלב 2 — פיצ'רים מרכזיים (4-6 שבועות)
1. Grid Sets (קיבוץ לוחות)
2. שכפול לוח
3. השבתת אריח
4. לוח בסיס עם כוונות תקשורתיות
5. יצירת לוח מהירה (wizard)

### שלב 3 — שיפורים (3-4 שבועות)
1. ElevenLabs voice selector משופר
2. Azure TTS
3. עריכת אריחים Drag & Drop
4. i18n מלא
5. הגדרות משתמש

### שלב 4 — מתקדם (רקע)
1. דקדוק חכם (עברית ושפות נוספות)
2. חיזוי מילים
3. Self-closing grids
4. סריקת מתגים

---

## 7. סיכונים וחסמים

| סיכון | חומרה | מיטיגציה |
|---|---|---|
| **גודל הפרויקט** — Cboard הוא 9 שנות פיתוח | גבוהה | לא להעתיק הכל, רק את מה שצריך |
| **API תלות** — cboard-api הוא GPL-3.0 | בינונית | אפשר להשתמש בו as-is או לבנות API חדש |
| **אין svelte-grid-layout** | בינונית | CSS Grid מובנה מספיק חזק, או svelte-grid |
| **MUI → ???** | בינונית | Skeleton UI / shadcn-svelte / Tailwind |
| **בדיקות accessibility** | בינונית | Svelte תומך ב-a11y warnings מובנה |
| **react-scannable → ???** | גבוהה | צריך לבנות מאפס את מערכת הסריקה |

---

## 8. שורה תחתונה

**האם זה אפשרי?** — כן, בהחלט.

**כמה מסובך?** — פרויקט גדול. עבור מפתח אחד, ~20-30 שבועות (5-7 חודשים) לגרסה מלאה. עבור צוות של 2-3 מפתחים, ~8-12 שבועות (2-3 חודשים).

**האם כדאי?** — כן, כי:
1. Cboard בנוי על React 17 + MUI 4 + Redux ישן — טכנולוגיות שהזדקנו
2. `Board.container.js` הוא 700 שורות ספגטי שקשה לתחזק
3. SvelteKit ייתן bundle קטן פי 3-5, ביצועים טובים יותר, וקוד נקי יותר
4. אפשר להשתמש ב-cboard-api הקיים כ-backend ולחסוך המון עבודה
5. Grid Sets + לוח בסיס + עיצוב חדש יהפכו את האפליקציה לתחרותית מול Grid AAC (שעולה ~$600)
6. הקוד החדש יהיה 40-60% פחות שורות מהקוד הישן

**המלצה**: התחל עם פרויקט SvelteKit חדש, השתמש ב-cboard-api הקיים, ובנה את הקומפוננטות מאפס בעיצוב מודרני.
