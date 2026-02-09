# תוכנית בדיקות: גיבוי Google Drive V2 + מיגרציות + Fixtures

תאריך: 2026-02-10  
סטטוס: מיושם חלקית (Unit/Integration + מיגרציות; נשאר E2E Fake Drive Mode)

---

## 1) מטרות הבדיקות

1. לוודא שאין `data:image/...` בקבצי JSON של V2 ב-Drive.
2. לוודא גיבוי אינקרמנטלי:
   - שינוי progress בלבד לא נוגע ב-assets/content.
3. לוודא שחזור “רק מה שחסר מקומית”:
   - נכסים קיימים ב-IndexedDB לא יורדים שוב.
4. לוודא סדר פעולות:
   - manifest נכתב תמיד אחרון (commit marker).
5. לוודא קונפליקט-דיטקשן לפי `appProperties.writeId` על manifest.
6. לוודא ניהול גרסת פורמט הגיבוי:
   - לכל קובץ V2 יש `backupSchemaVersion`.
   - ב-`appProperties` של manifest יש `backupSchemaVersion` (כמחרוזת).
7. לוודא מיגרציות state עובדות על fixtures מכל גרסה, כולל גרסה 14.
8. לוודא מיגרציה שמאחדת legacy keys אל `daily-schedule-device-state` לא שוברת התנהגות.

---

## 2) תשתית בדיקות בפרויקט (קיים)

הפרויקט כולל:

1. Unit: Vitest (`npm run test:unit`)
2. E2E: Playwright (`npm run test:e2e`)

הערה: הבדיקות ייכתבו בקבצים נפרדים מהקוד (כמקובל בפרויקט): `*.test.ts` / `*.spec.ts`.

---

## 3) בדיקות Unit (Vitest, Node environment)

### 3.1 crypto / canonical JSON

קבצים מוצעים:

1. `sveltekit-version/src/lib/services/drive/crypto.test.ts`

תרחישים:

1. `stableStringify` מחזיר אותו פלט לאותו תוכן גם אם סדר המפתחות שונה.
2. `sha256String`:
   - input זהה -> hash זהה
   - שינוי קטן -> hash שונה
3. `sha256Blob`:
   - אותו Blob -> אותו hash
   - Blob שונה -> hash שונה

### 3.2 payload builders (content/progress/assetsIds)

קבצים מוצעים:

1. `sveltekit-version/src/lib/services/drive/backupPayloads.test.ts`

תרחישים:

1. `buildContentPayload`:
   - `backupSchemaVersion` מופיע ושווה לערך הקבוע `CURRENT_BACKUP_SCHEMA_VERSION`
   - `Task.isDone` לא מופיע
   - `AppState.lastModified` לא מופיע
   - `AppState.syncMetadata` לא מופיע
   - `settings.lastActiveTime` לא מופיע
2. `buildProgressPayload`:
   - `backupSchemaVersion` מופיע ושווה לערך הקבוע `CURRENT_BACKUP_SCHEMA_VERSION`
   - `taskDone` מכסה את כל המשימות בכל הרשימות/משתמשים
3. שינוי `isDone` בלבד:
   - `contentHash` לא משתנה
   - `progressHash` כן משתנה
   - `assetIdsHash` לא משתנה
4. `collectAssetIds`:
   - כולל כל `idb:` הרלוונטיים (users/people/list logos/task images/keys של images)
   - לא כולל `/images/...`

### 3.3 assets index logic (dedupe)

קבצים מוצעים:

1. `sveltekit-version/src/lib/services/drive/driveBackupV2.integration.test.ts`

תרחישים:

1. `idbId` חדש עם hash שכבר קיים ב-`hashToFile`:
   - אין צורך upload נוסף
   - כן נכתב `idToHash`
2. `idbId` חדש עם hash חדש:
   - מסומן “נדרש upload”
   - לאחר “upload”, נשמר `hashToFile[hash]`

---

## 4) בדיקות Integration (Vitest) עם Fake Drive Backend

מטרה: לבדוק את הפרוטוקול בלי Google אמיתי, בצורה יציבה ומהירה.

ניצור backend בזיכרון שמדמה:

1. folders/files
2. `files.list/get/create/update`
3. media upload/download
4. `appProperties` על metadata
5. progress callbacks

קבצים מוצעים:

1. `sveltekit-version/src/lib/services/drive/driveBackupV2.integration.test.ts`
2. `sveltekit-version/src/lib/services/drive/dailyScheduleBackupRepo.cache.test.ts`
3. (אופציונלי) בדיקות `BackupController` ברמת UI/קונפליקט

תרחישים:

1. גיבוי ראשון:
   - יוצר תיקייה + קבצי V2
   - manifest נכתב אחרון
2. cache עם IDs “מיושנים”:
   - ב-`daily-schedule-device-state.drive.v2Cache` יש `manifestFileId` שלא קיים (404)
   - המנגנון מבצע fallback לחיפוש לפי שם (`daily_schedule_manifest.json`)
   - בסוף הפעולה ה-cache מתעדכן ל-ID החדש
2. progress-only:
   - שינוי `isDone` בלבד
   - upload רק ל-progress ואז manifest
   - אפס העלאות נכסים
3. הוספת תמונה חדשה:
   - העלאה של blob אחד בלבד לתיקיית `assets/`
   - עדכון `daily_schedule_assets.json`
4. restore “רק חסר”:
   - חצי מהנכסים כבר קיימים ב-IndexedDB (mock)
   - יורדים רק החסרים
5. קונפליקט:
   - remote manifest עם `writeId` שונה
   - controller מסמן conflictState

---

## 5) בדיקות E2E (Playwright) עם Fake Drive Mode

Google OAuth אמיתי לא יציב ל-CI, לכן נכניס מצב בדיקות:

1. env: `VITE_USE_FAKE_DRIVE=1`
2. במצב זה ה-app משתמש ב-fake repo במקום Drive אמיתי

קובץ בדיקה מוצע:

1. `sveltekit-version/e2e/backup-v2.spec.ts`

תרחישים:

1. “גיבוי עכשיו” (fake): סטטוס success
2. toggle + auto-backup: אין העלאת assets
3. restore: לאחר ניקוי localStorage/IDB, שחזור עובד והתמונות נטענות

---

## 6) בדיקות מיגרציה (Fixtures)

### 6.1 תיקיית fixtures (סינתטיים, קומיטביליים)

נתיב מוצע:

1. `sveltekit-version/src/lib/services/migrations/fixtures/state/`

קבצים מוצעים:

1. `v02.json`
2. `v03.json`
3. ...
4. `v14.json`

כל fixture צריך להיות מינימלי אבל חוקי עבור הגרסה שלו, בלי מידע אישי אמיתי.

### 6.2 בדיקות migration runner

קובץ בדיקה מוצע:

1. `sveltekit-version/src/lib/services/migrations/state.migration.test.ts`

תרחישים:

1. לכל fixture:
   - `migrateState(fixture)` מחזיר `version === 14`
   - התוצאה מכילה את שדות AppState החובה (`users/lists/images/people/activeListId/settings/lastModified`)
2. בדיקות נקודתיות לגרסאות:
   - v6: crop עבר ל-`images` והפניות `imageSrc/logo/avatar` הן string
   - v9: `people` קיים
   - v14: `peopleIds` עודכן לרשימות הרלוונטיות
3. בדיקת עקביות גרסאות:
   - state חדש צריך להתחיל מ-`INITIAL_STATE.version` (14), לא מ-6

### 6.3 מיגרציה של “מפתחות חיצוניים” ל-`daily-schedule-device-state`

קובץ בדיקה מוצע:

1. `sveltekit-version/src/lib/services/migrations/deviceState.migration.test.ts`

תרחישים:

1. אם `daily-schedule-device-state` קיים ותקין:
   - המיגרציה לא משנה אותו
2. אם `daily-schedule-device-state` חסר אבל קיימים legacy keys:
   - נבנה אובייקט חדש עם `drive/auth/ui`
   - נוודא שהערכים הועתקו נכון (למשל device_id, auto_backup_enabled, floating-board-state)
   - נוודא ש-legacy keys נמחקו
3. אם legacy keys חלקיים/פגומים:
   - נשתמש בברירות מחדל סבירות
   - המיגרציה לא זורקת חריגה

---

## 7) בדיקות ידניות (Drive אמיתי)

1. להתחבר ל-Drive
2. לבצע backup ראשון ולוודא שנוצרו קבצי V2 + תיקיית assets
3. toggle משימה -> backup: לוודא שזה מהיר והעלאה קטנה
4. מכשיר שני: לוודא קונפליקט/סנכרון לפי `writeId` על manifest
5. restore “רק חסר”: להריץ restore על אותו מכשיר ולוודא שאין הורדות נכסים שכבר קיימים
