# תוכנית מלאה: גיבוי Google Drive V2 (אינקרמנטלי ומהיר) + רפקטור סרוויס + תוכנית בדיקות

תאריך: 2026-02-10  
סטטוס: מיושם (נשאר E2E Fake Drive Mode + בדיקות ידניות)

## TODO (סימון התקדמות בזמן יישום)

* [x] יישור קו גרסאות: `CURRENT_VERSION` חייב להתאים ל-`INITIAL_STATE.version` (כיום יש חוסר עקביות בין 6 ל-14).
* [x] ארגון מיגרציות state: לפצל את `migration.ts` לפונקציה נפרדת לכל גרסה (v2..v14) + “runner” מרכזי.
* [x] Fixtures לגרסאות ישנות + בדיקות: ליצור תיקייה עם fixtures סינתטיים בגרסאות שונות, ולהוסיף Vitest שמריץ מיגרציה על כולם.
* [x] Snapshot חי מהדפדפן (גרסה 14): להוסיף דף debug שמייצא snapshot של `daily-schedule-data` + המפתחות החיצוניים (לשמירה תחת `docs/private-docs`).
* [x] איחוד המפתחות החיצוניים לאובייקט אחד: ליצור `daily-schedule-device-state` (JSON) + מיגרציה חד-פעמית שמוחקת legacy keys.
* [x] Drive V2: להגדיר קבועי שמות לקבצים/תיקיות (manifest/content/progress/assets/assets-folder) + `CURRENT_BACKUP_SCHEMA_VERSION` (הערך של `backupSchemaVersion`).
* [x] Drive Repo + פיצול שירות Drive: לפרק את `googleDriveService.ts` לרכיבי Auth/Files/Media/Repo (ללא facade תאימות לאחור), ולעדכן imports בקוד.
* [x] שינוי IndexedDB: לאפשר `db.saveImage(blob, idOverride?)` כדי לשחזר נכסים תחת אותו `idb:<uuid>`.
* [x] לוגיקת Backup/Restore V2: לממש העלאה אינקרמנטלית (assets בנפרד) ושחזור “רק מה שחסר מקומית”.
* [x] בדיקות (Unit/Integration): לממש לפי `docs/plans/drive-backup-v2-tests.md` (כולל מיגרציות + Fake Repo/Mocks).
* [ ] בדיקות (E2E / Fake Drive Mode): להוסיף מצב `VITE_USE_FAKE_DRIVE=1` + Playwright coverage לפי מסמך הבדיקות.
* [x] תיעוד: עודכן `docs/walkthrough.md`, `docs/features-status.md`, וגם מסמכים משלימים לפי הצורך.

---

## 1) רקע והבעיה

במימוש הנוכחי הגיבוי ל-Drive איטי כי בכל גיבוי אנחנו מעלים למעשה “קובץ אחד גדול” שמכיל גם תמונות כאילו הן טקסט.

בפרט:

1. מקומית התמונות נשמרות ב-IndexedDB תחת מזהים `idb:<uuid>`.
2. לפני העלאה ל-Drive, `BackupController.prepareBackupData()` מבצע Hydration וממיר כל `idb:` ל-`data:image/...` בתוך JSON.
3. ברגע שיש `data:image/...` ב-JSON, כל שינוי קטן (למשל `isDone`) גורר העלאה מחדש של הקובץ הגדול, וזו תהיה בעיה גדולה עוד יותר כשייכנסו גם קבצי אודיו.

הדוגמה `docs/daily_schedule_backup (2).json` מראה זאת בפועל (יש `data:image/...` ב-`users.avatar`, `lists.logo`, `tasks.imageSrc`, ובמפת `images`).

---

## 2) מטרות (Goals)

1. **למנוע העלאה מחדש של תמונות בכל גיבוי**: שינוי progress בלבד צריך לגרום להעלאה של קובץ קטן.
2. **להפסיק לשמור `data:image/...` ב-Drive**: תמונות (ובהמשך אודיו) נשמרות כקבצים בינאריים נפרדים.
3. **Dedup אמיתי**: אותה תמונה לא תעלה פעמיים (גם בין מכשירים).
4. **שחזור “רק מה שחסר מקומית”**: אם נכס כבר קיים ב-IndexedDB, לא מורידים אותו מחדש מהענן.
5. **קונפליקט-דיטקשן מהיר**: להמשיך להשתמש ב-`appProperties` (Drive file metadata) כדי לזהות עדכונים בלי להוריד קבצים גדולים.
6. **קוד קריא ומודולרי**: פירוק `googleDriveService.ts` לרכיבים רעיוניים (Auth / Files / Media / Repo).

---

## 3) לא-מטרות (Non-Goals) בשלב זה

1. **היסטוריית גיבויים** (Retention): בשלב זה נשמור רק “גיבוי אחרון”.
2. **דלתא/סנכרון ברמת שינוי מינימלי**: אנחנו עושים snapshot אינקרמנטלי של קבצים, לא סנכרון מבוסס events.
3. **פיצול אחסון מקומי** (localStorage) ל-content/progress: נשארים עם AppState אחד בלוקאל (אפשר לשקול בעתיד).

---

## 3.1) מפתחות localStorage “חיצוניים”: למה זה קיים ואיך מסדרים את זה נקי

כרגע יש כמה מפתחות localStorage שהם לא חלק מ-`daily-schedule-data`:

1. Drive sync: `device_id`, `device_name`, `last_known_write_id`
2. Drive UI: `auto_backup_enabled`, `use_redirect_mode`, `google_client_id_override`
3. Auth: `google_auth_storage` (+ legacy `gdrive_token`, `gdrive_expiry`)
4. UI state: `floating-board-state`

**למה זה לא היה “אובייקט אחד”?**

1. אלו תחומי אחריות שונים שנוספו בהדרגה, ונוח היה להוסיף מפתח נקודתי בלי “לגעת” ב-state הראשי.
2. חלק מהשדות הם per-device ולא אמורים להיות מסונכרנים (למשל deviceId/deviceName, טוקן).
3. חלק מהשדות משתנים בתדירות גבוהה (כמו `floating-board-state`) ולכן עדיף שיהיו מופרדים כדי לא “לערבב” אותם עם מידע אחר.
4. `daily-schedule-data` נשלט ע"י מיגרציות AppState; מפתחות חיצוניים הם “תשתית/מכשיר” ולא “נתוני משתמש”.

**איך נסדר את התחושה בלי לשבור דברים?**

כן, יותר פשוט (ובאמת זה “ברוח” של מה שאנחנו עושים בגיבוי V2): במקום מפתחות מפוזרים, נגדיר **אובייקט אחד מסודר** שמנהל את כל ה-state ה-per-device וה-state התשתיתי.

החלטת תכנון (חד-משמעית):

1. נוסיף מפתח localStorage חדש אחד: `daily-schedule-device-state`.
2. נכניס אליו את כל המפתחות החיצוניים במבנה JSON עם הפרדה רעיונית: `drive`, `auth`, `ui`.
3. נבצע מיגרציה חד-פעמית: לקרוא את מפתחות ה-legacy, לבנות את האובייקט החדש, לכתוב אותו, ואז למחוק את מפתחות ה-legacy.
4. לאחר המיגרציה, **לא ניגשים יותר** ל-legacy keys בשום מקום בקוד (למעט פונקציית המיגרציה).
5. המפתח הזה הוא **per-device** ולכן **לא** נכנס ל-`content/progress` של גיבוי הענן (הוא תשתיתי: אימות, UI, cache, מזהה מכשיר).

### סכמת `daily-schedule-device-state`

דוגמה (קצרה):

```json
{
  "version": 1,
  "drive": {
    "deviceId": "fd6073db-ed21-440b-9b3f-88879cc90954",
    "deviceName": "Chrome on Windows",
    "lastKnownWriteId": "f5a18121-f3a3-4206-b8a8-e2d828988e82",
    "autoBackupEnabled": true,
    "useRedirectMode": false,
    "clientIdOverride": "",
    "v2Cache": {
      "backupFolderId": "1AbC_backupFolder",
      "assetsFolderId": "1AbC_assetsFolder",
      "manifestFileId": "1AbC_manifest",
      "contentFileId": "1AbC_content",
      "progressFileId": "1AbC_progress",
      "assetsIndexFileId": "1AbC_assetsIndex",
      "lastUploadedContentHash": "sha256:...",
      "lastUploadedProgressHash": "sha256:...",
      "lastUploadedAssetsHash": "sha256:..."
    }
  },
  "auth": {
    "googleAuthStorage": {
      "accessToken": "ya29....",
      "expiresAt": 1770660000000,
      "issuedAt": 1770650000000
    }
  },
  "settings": {
    "ui": {
      "floatingBoard": { "top": 100, "left": 100, "width": 800, "height": 600 }
    }
  }
}
```

הערות:

1. `auth.googleAuthStorage.accessToken` נשמר גם היום ב-localStorage. איחוד למפתח אחד לא משנה את מודל האבטחה, אבל מחייב validate/try-catch עקבי בקריאה/כתיבה.
2. `settings.ui.floatingBoard` הוא “settings של מכשיר” (per-device) ולא `AppState.settings`. זה בכוונה: הגודל/מיקום תלויים במסך, ולא תמיד הגיוני לסנכרן בין מכשירים שונים.
3. `settings.ui.floatingBoard` יכול להתעדכן בתדירות גבוהה. נוודא שהכתיבה אליו היא debounce/“סוף פעולה” (כמו היום), כדי לא להפוך את `daily-schedule-device-state` למקור כתיבה רועש.

---

## 4) עקרון ארכיטקטוני: SSOT + Commit Marker

ברגע שהגיבוי הוא **רב-קבצים** (content + progress + assets), חייבים “נקודת אמת” אחת שמגדירה מהו **הסט האחרון התקין** של הקבצים.

לכן:

1. יהיה קובץ קטן בשם **manifest** שמתעדכן **אחרון** (Commit Marker).
2. על קובץ ה-manifest נשים `appProperties` עם `writeId` ו-hashes, כדי לזהות שינויים מרחוק בלי להוריד תוכן.

זה לא “החלפה” של `appProperties`, אלא שימוש נכון בו: `appProperties` תמיד שייך לקובץ Drive ספציפי, ולכן חייבים לקבוע איזה קובץ הוא “הראשי” לקונפליקטים.

---

## 5) מבנה הקבצים ב-Drive (V2)

נשתמש בתיקיית גיבוי אחת: `DailyScheduleBackup` (קיימת גם היום).

### קבצים בתיקייה

- `daily_schedule_manifest.json` (Commit Marker + appProperties עליו)
- `daily_schedule_content.json` (תוכן/מבנה “יציב”)
- `daily_schedule_progress.json` (progress בלבד)
- `daily_schedule_assets.json` (אינדקס נכסים + dedupe)
- תיקיית משנה: `assets/` (קבצים בינאריים: תמונות, ובהמשך אודיו)

### הערה על שמות

הקוד היום משתמש ב-`BACKUP_FILE_NAME = 'daily_schedule_backup.json'`. ב-V2 נשתמש בקבועים חדשים (ראו סעיף 10).

---

## 6) פורמטים (סכמות) ודוגמאות לכל קובץ

### 6.0 מיפוי גרסאות (מה זה כל מספר?)

במערכת יש כמה “מספרי גרסה”, כל אחד עם משמעות אחרת:

1. `AppState.version` (מיגרציות של הנתונים המקומיים): כיום **14**. זה מה ש-`migration.ts` מעלה בהדרגה.
2. `backupSchemaVersion` (פורמט קבצי הגיבוי ב-Drive V2): כיום **2** (הגדרה בתוכנית זו). כל שינוי בפורמט קבצי V2 מחייב העלאה של המספר.
3. `daily-schedule-device-state.version` (פורמט האובייקט המאוחד של מפתחות per-device ב-localStorage): מתחיל ב-**1**.

כללים:

1. `backupSchemaVersion` יופיע בתוך **כל אחד** מקבצי V2 (`manifest/content/progress/assets`) כדי שאפשר יהיה לוולידציה מהירה.
2. `backupSchemaVersion` יופיע גם ב-`appProperties` של ה-manifest (כמחרוזת), כדי שאפשר יהיה לזהות שינויים מרחוק בלי להוריד קבצים.
3. בשחזור: אם `backupSchemaVersion` קטן מ-`CURRENT_BACKUP_SCHEMA_VERSION`, נריץ מיגרציה של “פורמט גיבוי” (pipeline כמו `migrateBackupV2From2To3(...)`). אם אין מיגרציה זמינה, נציג שגיאה ברורה ונציע fallback ל-V1 אם קיים.

### 6.1 `daily_schedule_manifest.json` (Commit Marker)

**תפקיד:** לתאר “מה הגיבוי האחרון התקין”, עם hashes ופרטי סנכרון.

דוגמה:

```json
{
  "backupSchemaVersion": 2,
  "generatedAt": 1770655704660,
  "syncMetadata": {
    "writeId": "f5a18121-f3a3-4206-b8a8-e2d828988e82",
    "parentWriteId": "4b5698af-537a-40e7-88e1-537b09633ed3",
    "lastModified": 1770655704660,
    "lastModifiedByDeviceId": "fd6073db-ed21-440b-9b3f-88879cc90954",
    "lastModifiedByDeviceName": "Chrome on Windows"
  },
  "hashes": {
    "contentHash": "sha256:2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d",
    "progressHash": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "assetsHash": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "files": {
    "content": { "name": "daily_schedule_content.json", "fileId": "1AbC_content" },
    "progress": { "name": "daily_schedule_progress.json", "fileId": "1AbC_progress" },
    "assetsIndex": { "name": "daily_schedule_assets.json", "fileId": "1AbC_assets" },
    "assetsFolder": { "name": "assets", "folderId": "1AbC_assetsFolder" }
  }
}
```

**`appProperties` על manifest (Drive metadata):** כל הערכים חייבים להיות מחרוזות.

```json
{
  "backupSchemaVersion": "2",
  "writeId": "f5a18121-f3a3-4206-b8a8-e2d828988e82",
  "parentWriteId": "4b5698af-537a-40e7-88e1-537b09633ed3",
  "lastModified": "1770655704660",
  "lastModifiedByDeviceId": "fd6073db-ed21-440b-9b3f-88879cc90954",
  "lastModifiedByDeviceName": "Chrome on Windows",
  "contentHash": "sha256:2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d",
  "progressHash": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "assetsHash": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

### 6.2 `daily_schedule_content.json` (תוכן יציב)

**תפקיד:** לתאר את התוכן/מבנה הנתונים בלי שדות תנודתיים ובלי progress, ובלי `data:image/...`.

כללים:

- לא כולל `Task.isDone`.
- לא כולל `AppState.lastModified`.
- לא כולל `AppState.syncMetadata`.
- לא כולל `settings.lastActiveTime` (או מנרמל ל-0), כדי שלא יטריג גיבוי “תוכן” כל הזמן.
- הפניות לתמונות נשארות `idb:<uuid>` או URL סטטי (`/images/...`).

דוגמה:

```json
{
  "backupSchemaVersion": 2,
  "appStateVersion": 14,
  "users": [
    {
      "id": "u_ezra",
      "name": "עזרא",
      "gender": "boy",
      "avatar": "idb:7c6b1a1e-7b6b-4b3a-9a7b-2c5f6b1a1e7b",
      "themeColor": "#4169E1",
      "theme": "theme-focus"
    }
  ],
  "people": [
    {
      "id": "p_father",
      "name": "אבא",
      "avatar": "idb:99999999-8888-7777-6666-555555555555"
    }
  ],
  "lists": {
    "u_ezra": [
      {
        "id": "morning_routine",
        "name": "עבודה עם אבא",
        "logo": "idb:11111111-2222-3333-4444-555555555555",
        "greeting": "בוקר טוב",
        "peopleIds": ["p_father"],
        "tasks": [
          {
            "id": "36e00fe4-a6a6-40c7-8169-8b7676c64997",
            "name": "שירותים",
            "imageSrc": "/images/activities/activity_toilet.png",
            "communicationBoardUrl": null,
            "changeType": null
          },
          {
            "id": "b71c62f5-9c1f-4130-9531-7fb87e29aff5",
            "name": "לצחצח שיניים",
            "imageSrc": "idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "communicationBoardUrl": null,
            "changeType": null
          }
        ],
        "isPeopleSectionVisible": true,
        "isLocked": false
      }
    ]
  },
  "images": {
    "idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": {
      "crop": { "x": 50, "y": 40, "scale": 1.25 }
    }
  },
  "activeListId": { "u_ezra": "morning_routine" },
  "currentUserId": "u_ezra",
  "settings": {}
}
```

### 6.3 `daily_schedule_progress.json` (progress בלבד)

**תפקיד:** לאפשר עדכון מהיר תכוף (למשל `isDone`) בלי לגעת ב-content.

ברירת מחדל: מפה `taskId -> isDone`.

דוגמה:

```json
{
  "backupSchemaVersion": 2,
  "taskDone": {
    "36e00fe4-a6a6-40c7-8169-8b7676c64997": true,
    "b71c62f5-9c1f-4130-9531-7fb87e29aff5": false
  }
}
```

### 6.4 `daily_schedule_assets.json` (אינדקס נכסים + dedupe)

**תפקיד:** לחבר בין ה-IDB IDs המקומיים לבין קבצי הענן, ולמנוע כפילויות.

מבנה:

- `idToHash`: `idb:<uuid> -> sha256:<hex>`
- `hashToFile`: `sha256:<hex> -> { fileId, mimeType, size }`

דוגמה:

```json
{
  "backupSchemaVersion": 2,
  "idToHash": {
    "idb:7c6b1a1e-7b6b-4b3a-9a7b-2c5f6b1a1e7b": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "idb:11111111-2222-3333-4444-555555555555": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  },
  "hashToFile": {
    "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc": {
      "fileId": "1AbC_fileId_avatar",
      "mimeType": "image/png",
      "size": 18342
    },
    "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
      "fileId": "1AbC_fileId_taskImage",
      "mimeType": "image/jpeg",
      "size": 50211
    }
  }
}
```

### 6.5 תיקיית `assets/` (קבצים בינאריים)

דוגמא לשמות קבצים:

- `assets/sha256_cccccccccccccccccc...` (mimeType `image/png`)
- `assets/sha256_eeeeeeeeeeeeeeeeee...` (mimeType `image/jpeg`)

**למה שם לפי Hash ולא UUID?**

- מאפשר dedupe אינהרנטי ו-idempotency (אותו תוכן = אותו שם/זהות).
- מאפשר אימות שלמות בהורדה.
- עדיין ה-UUID נשאר “בפנים” (`idb:...`) לצרכי הפניות/metadata/crop.

---

## 7) אלגוריתם גיבוי V2 (Incremental)

### 7.1 מטא מקומי (cache)

כדי לא לבצע `files.list` בכל auto-backup, נשתמש ב-cache מקומי קטן בתוך האובייקט המאוחד `daily-schedule-device-state`:

- `daily-schedule-device-state.drive.v2Cache`

מכיל:

- `backupFolderId`, `assetsFolderId`, `manifestFileId`, `contentFileId`, `progressFileId`, `assetsIndexFileId`
- `lastUploadedContentHash`, `lastUploadedProgressHash`, `lastUploadedAssetsHash`

איך עובדים עם זה בפועל (חשוב כדי לא להיתקע על IDs “מיושנים”):

1. **מבנה הגיבוי מוגדר לפי שמות** (`daily_schedule_manifest.json` וכו') וזה מקור האמת.
2. ה-IDs ב-`v2Cache` הם **אופטימיזציה בלבד** לביצועים (פחות חיפושים).
3. בכל פעולה מול Drive:
   - ננסה קודם לפי ID מתוך `v2Cache`.
   - אם נכשל (404/permission/parent mismatch) נבצע **fallback לחיפוש לפי שם** + אימות parent folder.
   - אם מצאנו לפי שם, נעדכן את `v2Cache` ב-ID החדש.

הערה: זה “בדיוק” הרעיון של סידור מפתחות למבנה אחד מסודר. לא נוסיף עוד מפתח cache נפרד, כדי לא להחזיר את תחושת הבלגן.

### 7.2 בניית Payloads

נוסיף פונקציות:

- `buildContentPayload(appState: AppState): ContentV2`
- `buildProgressPayload(appState: AppState): ProgressV2`
- `collectAssetIds(appState: AppState): string[]`

`collectAssetIds` כולל כל `idb:` שנמצא ב:

- `users[].avatar`
- `people[].avatar`
- `lists[].logo`
- `tasks[].imageSrc`
- מפתחות `images` שהם `idb:...`

### 7.3 hashing יציב

כדי שה-hash יהיה יציב:

- נשתמש ב-`stableStringify(obj)` שמסדר מפתחות (canonical JSON).
- `sha256String(stableStringify(payload))` עבור JSON.
- `sha256Blob(blob)` עבור נכסים בינאריים.

### 7.4 סדר פעולות (קריטי)

הכלל: **manifest אחרון**.

רצף:

1. `ensureConnected()`
2. `ensureBackupFolder()`, `ensureAssetsFolder()`, `ensureCoreFilesExist()` (לפי cache או חיפוש לפי שם)
3. Build `contentPayload`, `progressPayload`, `assetIds`
4. Compute hashes: `contentHash`, `progressHash`, `assetIdsHash`
5. אם `assetIdsHash` השתנה:
   - לקרוא `daily_schedule_assets.json` (או ליצור חדש)
   - עבור כל `idbId` שחסר ב-`idToHash`:
     - `db.getImage(idbId)` -> Blob
     - `hash = sha256Blob(blob)`
     - אם `hash` לא קיים ב-`hashToFile`:
       - להעלות blob לתיקיית `assets/`
       - לשמור `fileId/mimeType/size` ב-`hashToFile`
     - לקשר `idToHash[idbId]=hash`
   - להעלות `daily_schedule_assets.json` מחדש ולחשב `assetsHash`
6. אם `contentHash` השתנה: להעלות `daily_schedule_content.json`
7. אם `progressHash` השתנה: להעלות `daily_schedule_progress.json`
8. ליצור `syncMetadata` חדש:
   - `writeId = crypto.randomUUID()`
   - `parentWriteId = last_known_write_id` (אם קיים)
   - `lastModified = Date.now()`
   - `lastModifiedByDeviceId/deviceName`
9. להעלות `daily_schedule_manifest.json` אחרון + לעדכן `appProperties` שלו עם:
   - syncMetadata
   - hashes (content/progress/assets)
10. רק על הצלחה:
    - לעדכן `last_known_write_id`
    - לעדכן cache מקומי

---

## 8) אלגוריתם שחזור V2 (“רק מה שחסר מקומית”)

1. למצוא את `daily_schedule_manifest.json` (לפי שם) ולקרוא את metadata שלו (כולל `appProperties`).
2. להוריד `content/progress/assets` לפי `fileIds` שב-manifest (fallback לחיפוש לפי שם אם חסר).
3. לבנות `AppState`:
   - להתחיל מ-content
   - להחיל progress: לעבור על tasks לפי id ולהציב `isDone` לפי `taskDone`
   - להציב `lastModified = manifest.syncMetadata.lastModified`
4. להבטיח נכסים:
   - `neededIdbIds = collectAssetIds(state)`
   - עבור כל `idbId`:
     - אם `db.getImage(idbId)` מחזיר Blob קיים: לדלג
     - אחרת:
       - `hash = assets.idToHash[idbId]`
       - `fileId = assets.hashToFile[hash].fileId`
       - להוריד Blob
       - לשמור ל-IDB תחת אותו key `idbId` (נדרש שינוי ב-db)
5. לכתוב localStorage תחת `daily-schedule-data` ולבצע reload
6. לעדכן `last_known_write_id` מה-manifest

---

## 9) שינוי נדרש ב-IndexedDB API (שימור key)

כדי ששחזור V2 יוכל לשמור נכס תחת אותו `idb:<uuid>`:

נעדכן את `sveltekit-version/src/lib/services/db.ts`:

- לשנות `saveImage(blob)` ל-`saveImage(blob, idOverride?)`
- אם `idOverride` קיים:
  - `store.put(blob, idOverride)`
  - לא לייצר UUID חדש

זה קריטי כדי לשמור עקביות עם `images` metadata (crop) שמפתחו `idb:...`.

---

## 10) קבועים/קונפיגורציה

במקום `BACKUP_FILE_NAME` יחיד, נגדיר קבועים חדשים (מומלץ בקובץ ייעודי חדש):

- `CURRENT_BACKUP_SCHEMA_VERSION = 2`
- `DRIVE_BACKUP_FOLDER_NAME = 'DailyScheduleBackup'`
- `DRIVE_MANIFEST_FILE_NAME = 'daily_schedule_manifest.json'`
- `DRIVE_CONTENT_FILE_NAME = 'daily_schedule_content.json'`
- `DRIVE_PROGRESS_FILE_NAME = 'daily_schedule_progress.json'`
- `DRIVE_ASSETS_INDEX_FILE_NAME = 'daily_schedule_assets.json'`
- `DRIVE_ASSETS_FOLDER_NAME = 'assets'`

הקבועים ישמשו את ה-Repo (סעיף 11).

---

## 11) רפקטור `googleDriveService.ts` לחלקים רעיוניים

### 11.1 בעיה נוכחית

`sveltekit-version/src/lib/services/googleDriveService.ts` מערבב:

- Auth + token refresh + redirect handling
- Drive Files API wrappers
- XHR upload/download עם progress
- פרוטוקול גיבוי (listBackups + backup/restore)

זה מקשה על תחזוקה ועל בדיקות.

### 11.2 מבנה מוצע (קבצים חדשים)

בתיקייה: `sveltekit-version/src/lib/services/drive/`

1. `googleAuthService.ts`
   - טעינת סקריפטים, initTokenClient, session storage, refresh, redirect callback
   - expose סטטוס (`DriveStatus`) + subscribe
   - expose `getAccessToken()`

2. `driveFilesApi.ts`
   - wrappers ל-`gapi.client.drive.files.*` (list/get/create/update)
   - findOrCreateFolder
   - findFileByName

3. `driveHttpClient.ts`
   - upload/download media עם progress
   - מקבל token מ-auth service

4. `dailyScheduleBackupRepo.ts`
   - יודע את שמות הקבצים והתיקיות של הפרויקט
   - `ensureStructure()`
   - `readManifestMeta()` (metadata + appProperties)
   - `readJson(name)` / `writeJson(name, data, appProperties?)`
   - `uploadAsset(hash, blob, mimeType)` / `downloadAsset(fileId)`

5. `crypto.ts`
   - `stableStringify`
   - `sha256String`
   - `sha256Blob`

6. `types.ts` (ל-V2)
   - `ManifestV2`, `ContentV2`, `ProgressV2`, `AssetsIndexV2`

### 11.3 ללא facade / ללא תאימות לאחור

לא נשאיר `googleDriveService.ts` כ-facade לתאימות לאחור. במקום זאת:

1. נבצע רפקטור שובר (breaking change) ונעדכן את ה-importים בקוד למבנה החדש.
2. כיום השימוש המרכזי ב-Drive הוא ב-`src/lib/logic/backupController.svelte.ts`, ולכן רוב העדכון יהיה מרוכז שם.
3. “תאימות” תישאר רק במובן של מיגרציות נתונים (state/localStorage) בתוך `migration.ts`/מנגנון מיגרציות ייעודי.

---

## 12) שינויי Controller (`BackupController`)

### 12.1 גיבוי

להחליף את הזרימה מ-`prepareBackupData()` לזרימת V2:

- build payloads
- compute hashes
- upload assets incrementally
- upload content/progress if changed
- write manifest last + appProperties

### 12.2 קונפליקט-דיטקשן

`checkForRemoteUpdates()` יעבוד מול `manifest`:

- `remoteWriteId = manifestFile.appProperties.writeId`
- להשוות ל-`lastKnownWriteId`

### 12.3 שחזור

- אם קיים manifest: restore V2
- אחרת: fallback restore V1 (`daily_schedule_backup.json`)

---

## 13) תאימות לאחור (V1)

שחזור V1 נשאר:

- `daily_schedule_backup.json` אם קיים
- שימוש ב-`extractImagesFromState()` להמרה מ-DataURL ל-IDB

לאחר restore V1, הגיבוי הבא יעלה V2 וימנע את הבעיה קדימה.

---

## 14) Acceptance Criteria (קריטריוני הצלחה)

1. אין יותר `data:image/...` בקבצי JSON של V2 ב-Drive.
2. שינוי `isDone` בלבד:
   - לא מבצע Hydration/קריאות ל-IDB לתמונות לצורך העלאה
   - מעלה רק `daily_schedule_progress.json` + `daily_schedule_manifest.json`
3. הוספת תמונה חדשה:
   - מעלה רק את blob החדש לתיקיית `assets/`
   - מעדכן `daily_schedule_assets.json`
   - ואז מעדכן manifest
4. שחזור “רק מה שחסר”:
   - נכסים קיימים ב-IDB לא יורדים שוב
5. קונפליקט-דיטקשן:
   - שינוי מרחוק מתקבל ע"י `appProperties.writeId` בלי הורדת content

---

## 15) תוכנית בדיקות מקיפה

תוכנית הבדיקות נמצאת בקובץ נפרד: `docs/plans/drive-backup-v2-tests.md`.

---

## 16) הערות פתוחות (שנרצה להכריע בזמן יישום)

1. האם `settings` נוספים (חוץ מ-`lastActiveTime`) צריכים להיות ב-content או progress?
2. האם לשמור ב-manifest גם “אינדקס משימות” כדי לאמת ש-progress מתייחס לאותן משימות (כדי לזהות drift)?
   - ברירת מחדל: לא, כי writeId + hashes מספיקים.
