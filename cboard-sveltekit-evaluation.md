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

## 6. גישת עיצוב — בהשראת Grid AAC

### עקרון מנחה
לא מעתיקים את העיצוב של Cboard (MUI 4, סגנון 2017, שטוח ודהוי). במקום זה, עיצוב מודרני בהשראת **Grid AAC** — הסטנדרט התעשייתי לאפליקציות AAC.

### טכנולוגיות עיצוב
| שכבה | טכנולוגיה | שימוש |
|---|---|---|
| **UI כללי** | shadcn-svelte + Tailwind CSS | Settings, Auth, Toolbars, Modals, Navigation |
| **Board / Tile** | CSS Grid + Tailwind בהתאמה אישית | עיצוב AAC ייעודי, לא מספריית קומפוננטות |
| **אייקונים** | lucide-svelte (כלול ב-shadcn) | אייקוני ממשק |
| **סמלי AAC** | Mulberry / ARASAAC / Global Symbols | סמלים על האריחים (כמו ב-Cboard) |

### עקרונות עיצוב AAC (בהשראת Grid)
1. **אריחים בולטים** — borders עגולים, צללים עדינים, אנימציית לחיצה (scale/press)
2. **צבעי קטגוריות** — סטנדרט AAC: פעלים בירוק, שמות עצם בכתום, תארים בכחול, חברתי בוורוד, ניווט באפור
3. **ניגודיות גבוהה** — טקסט בולט, רקע בהיר, מתאים למשתמשים עם לקויות ראייה
4. **כפתורים גדולים** — מינימום 80x80px, מותאם למגע ולמתגים
5. **מרווחים ברורים** — gap קבוע בין אריחים, לא צפוף מדי
6. **Output bar מודרני** — פס עליון עם סמלים שנבחרו, ברור ונגיש
7. **מצב עריכה ברור** — הבדל ויזואלי חד בין מצב שימוש למצב עריכה

### מה לוקחים מ-Cboard (נתונים בלבד)
- ✅ קונבנציית צבעי קטגוריות (סטנדרט AAC)
- ✅ היררכיית לוחות: home → קטגוריה → לוח ספציפי
- ✅ נתוני `boards.json` — סמלים, תוויות, מבנה
- ❌ לא ה-CSS (מבוסס MUI classes)
- ❌ לא ה-layout system (react-grid-layout — יש CSS Grid נייטיב)
- ❌ לא סגנון האריחים (שטוח, לא מזמין ללחיצה)

---

## 7. סדר עדיפויות מומלץ

### שלב 1 — ליבה (8-10 שבועות)
1. הקמת פרויקט SvelteKit עם routing בסיסי
2. התקנת shadcn-svelte + Tailwind CSS
3. Store לניהול לוחות ואריחים (Svelte 5 runes)
4. רנדור לוח עם CSS Grid
5. קומפוננטת Tile בעיצוב AAC מודרני (בהשראת Grid)
6. Output bar — פס עליון עם סמלים שנבחרו
7. אינטגרציה עם cboard-api הקיים
8. TTS בסיסי (Web Speech API)
9. PWA + אופליין

### שלב 2 — פיצ'רים מרכזיים (4-6 שבועות)
1. Grid Sets (קיבוץ לוחות)
2. שכפול לוח
3. השבתת אריח
4. לוח בסיס עם כוונות תקשורתיות
5. יצירת לוח מהירה (wizard)
6. מצב עריכה עם UI ייעודי (toolbar, tile editor)

### שלב 3 — שיפורים (3-4 שבועות)
1. ElevenLabs voice selector משופר
2. Azure TTS
3. עריכת אריחים Drag & Drop
4. i18n מלא
5. הגדרות משתמש
6. Dark mode / ערכות נושא

### שלב 4 — מתקדם (רקע)
1. דקדוק חכם (עברית ושפות נוספות)
2. חיזוי מילים
3. Self-closing grids
4. סריקת מתגים

---

## 8. הנחות ברירת מחדל לשלב 1 — מוכן לביצוע

> סעיף זה מספק לסוכן מבצע את כל ההחלטות הנדרשות כדי להתחיל לעבוד בלי לשאול שאלות.

### סביבת פיתוח (כבר מוגדרת בריפו)
| פרמטר | ערך |
|---|---|
| **ריפו** | `MusiCode1/aac-board` |
| **Package manager** | bun |
| **Framework** | SvelteKit 2 + Svelte 5 (runes) |
| **UI** | shadcn-svelte + Tailwind CSS 4 |
| **Deployment** | Cloudflare Workers (`@sveltejs/adapter-cloudflare`) |
| **Testing** | Vitest 4 (unit) + Playwright (E2E) |
| **Linting** | ESLint 9 + Prettier 4 (tabs, single quotes, 100 chars) |
| **TypeScript** | strict mode |
| **שפת קוד** | אנגלית (identifiers), עברית (docs/comments) |

### RTL ועברית
- **RTL מהיום הראשון** — כל הקומפוננטות חייבות לתמוך ב-`dir="rtl"`
- **שפת ברירת מחדל**: עברית (`he`)
- **כיוון טקסט**: `dir="auto"` על תוכן שעלול להיות דו-כיווני; `dir="rtl"` על ה-layout הראשי
- Tailwind: להשתמש ב-`rtl:` / `ltr:` variants כשנדרש, ולהעדיף `logical properties` (`ps-4` במקום `pl-4`, `ms-2` במקום `ml-2`)

### סמלי AAC (Symbols)
- **שלב 1**: סמלים חופשיים — **Mulberry Symbols** (SVG, CC BY-SA) + **ARASAAC** (API חינמי)
- **שלב עתידי**: הטמעת **PCS** (Tobii Dynavox, מסחרי — דורש רישיון)
- **מקור נתוני לוחות**: קבצי `boards.json` של Cboard (כוללים קישורים לסמלי ARASAAC)
- **ARASAAC API**: `https://api.arasaac.org` — לא דורש API key, חינמי לשימוש לא-מסחרי

### cboard-api — חיבור בשלב 1
- **גישה בשלב 1**: עבודה **מקומית בלבד** עם נתונים סטטיים (boards.json מ-Cboard repo)
- **אין צורך בחיבור API** בשלב הראשון — הליבה היא רנדור לוחות + TTS + ניווט
- **שלב 2+**: חיבור ל-cboard-api עם `https://api.app.cboard.io` (production)
- **Auth flow**: Email+Password → POST `/user/login` → Bearer Token

### מכשירי יעד
- **עדיפות ראשונה**: טאבלטים (iPad, Android) — זה המכשיר העיקרי לשימוש AAC
- **עדיפות שנייה**: דסקטופ (Chrome, Firefox, Safari)
- **גודל מסך מינימלי**: 768px (iPad Mini)
- **Touch-first**: כל האינטראקציות חייבות לעבוד ב-touch לפני mouse

### קבצי Cboard לייבוא נתונים
- **boards**: `https://github.com/cboard-org/cboard/tree/master/src/api` — קבצי JSON עם לוחות ברירת מחדל
- **תרגומים**: `https://github.com/cboard-org/cboard/tree/master/src/translations` — ~50 שפות
- **סמלים**: URL pattern של ARASAAC: `https://api.arasaac.org/v1/pictograms/{id}?download=false`

### מה לא לעשות בשלב 1
- ❌ לא לבנות auth/login — עובדים עם נתונים מקומיים
- ❌ לא לבנות settings מלאים — רק toggle בסיסי (grid size, TTS on/off)
- ❌ לא לבנות Grid Sets — זה שלב 2
- ❌ לא drag & drop — זה שלב 3
- ❌ לא ElevenLabs/Azure TTS — רק Web Speech API מובנה
- ❌ לא i18n מלא — עברית hardcoded, i18n infrastructure בלבד

---

## 9. סיכונים וחסמים

| סיכון | חומרה | מיטיגציה |
|---|---|---|
| **גודל הפרויקט** — Cboard הוא 9 שנות פיתוח | גבוהה | לא להעתיק הכל, רק את מה שצריך |
| **API תלות** — cboard-api הוא GPL-3.0 | בינונית | אפשר להשתמש בו as-is או לבנות API חדש |
| **אין svelte-grid-layout** | בינונית | CSS Grid מובנה מספיק חזק, או svelte-grid |
| **עיצוב AAC דורש מומחיות** | בינונית | השראה מ-Grid AAC + סטנדרטי צבעים AAC מוכרים |
| **בדיקות accessibility** | בינונית | Svelte תומך ב-a11y warnings מובנה |
| **react-scannable → ???** | גבוהה | צריך לבנות מאפס את מערכת הסריקה |

---

## 10. שורה תחתונה

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
