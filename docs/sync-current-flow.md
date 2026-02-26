# מערכת הסנכרון הנוכחית - פירוט מלא

## הקבצים ב-Google Drive

בתיקייה `DailyScheduleBackup/` יש 5 קבצי JSON + תיקיית תמונות:

### 1. `manifest.json` - ה-Commit Marker
- **מה יש בו**: writeId, parentWriteId, timestamps, device info, hashes של שלושת הקבצים האחרים, fileIds של כל הקבצים
- **appProperties**: אותם שדות כ-metadata על הקובץ ב-Drive (ניתן לקרוא בלי להוריד את הקובץ עצמו)
- **כלל קריטי**: מתעדכן **אחרון** - זה ה-commit marker. אם ה-manifest עודכן, כל שאר הקבצים כבר תקינים
- **למה צריך**: זיהוי שינויים מרחוק (זול - רק metadata), ואימות שלמות הסט

### 2. `content.json` - התוכן היציב
- **מה יש בו**: users, people, lists, tasks (בלי isDone!), images metadata, settings
- **מה אין בו**: isDone, lastModified, syncMetadata, lastActiveTime
- **למה נפרד**: משתנה רק כשההורה מגדיר לוח. לא כל סימון V גורר העלאה

### 3. `progress.json` - סטטוס משימות בלבד
- **מה יש בו**: `{ taskDone: { "task-uuid": true/false } }`
- **למה נפרד**: משתנה בכל סימון V (הכי תכוף). אסטרטגיה: **last-write-wins, בלי היסטוריה**. קטן מאוד

### 4. `assets.json` - אינדקס תמונות
- **מה יש בו**: מיפוי `idbId → sha256 hash` + מיפוי `hash → { fileId, mimeType, size }`
- **למה צריך**: dedup (אותה תמונה לא תעלה פעמיים), ושיוך בין ה-IDB המקומי לקבצים ב-Drive

### 5. `history.json` - היסטוריית סנכרון
- **מה יש בו**: מערך entries, כל entry הוא snapshot (state מלא) או delta (jsondiffpatch diff)
- **כל entry**: writeId, parentWriteId, timestamp, deviceId, deviceName
- **snapshot** כל ~20 גרסאות, deltas בינתיים
- **למה צריך**: מציאת common ancestor ל-3-way merge

### 6. תיקיית `assets/` - קבצי תמונה בינאריים
- שם קובץ = sha256 hash של התוכן

---

## התהליך צעד אחרי צעד

### שלב 0: טריגרים

סנכרון מופעל ב-4 מצבים:
- טעינת האפליקציה
- חזרה לטאב (visibility change)
- חזרה online
- שינוי מקומי (debounce 5 שניות)

---

### שלב 1: בדיקות מקדימות

```
online?                         → לא → setOffline(), עצור
googleAuth.getAccessToken()?    → לא → עצור (אין חיבור ל-Drive)
autoBackupEnabled?              → לא → עצור (אלא אם manual)
```

---

### שלב 2: PULL - בדיקה מה יש בענן

```
dailyScheduleBackupRepo.findV2ManifestMeta()
  ├── ניסיון מ-cache (v2Cache.manifestFileId)
  ├── fallback: חיפוש לפי שם בתיקיית הגיבוי
  └── תוצאה: { id, appProperties } או null
```

**אם אין manifest בענן** → דילוג על pull, עובר ישר ל-push (גיבוי ראשון).

**אם יש manifest** → `restoreWithMerge()`:

#### שלב 2.1: ensureStructure()
יוצר/מוצא את כל הקבצים והתיקיות ב-Drive (או מ-cache)

#### שלב 2.2: restoreFromDriveV2()
```
→ הורדת manifest.json    (קריאת תוכן הקובץ)
→ הורדת content.json     (רשימות, משתמשים...)
→ הורדת progress.json    (isDone map)
→ הורדת assets.json      (אינדקס תמונות)
→ בניית AppState מ-content + progress
→ הורדת תמונות חסרות (רק מה שאין ב-IDB המקומי)
```

#### שלב 2.3: בדיקת writeId
```
אין localWriteId?        → פעם ראשונה. השתמש ב-remote כמו שהוא
localWriteId === remote?  → אין שינוי בענן. דלג
localWriteId !== remote?  → צריך merge! המשך לשלב 2.4
```

#### שלב 2.4: 3-way merge
```
→ הורדת history.json
→ findCommonAncestor(history, localWriteId, remoteWriteId)
    → בניית שרשרת parentWriteIds אחורה מכל צד
    → מציאת writeId משותף ראשון
    → שחזור state של ה-ancestor (מ-snapshot + deltas)
→ threeWayMerge(ancestorState, localState, remoteState)
    → diff(ancestor, local) + diff(ancestor, remote)
    → apply both, קונפליקט → last-write-wins לפי timestamp
    → normalize order
```

---

### שלב 3: החלטה - צריך להעלות?

```
calculateDelta(previousState, currentState)
  ├── null (אין שינויים) + לא היה merge → דלג, סנכרון הסתיים ✓
  └── יש שינויים, או היה merge         → המשך ל-push
```

---

### שלב 4: PUSH - העלאה לענן

`backupWithHistory()`:

#### שלב 4.1: ensureStructure()

#### שלב 4.2: קריאת history.json (או יצירת ריק)

#### שלב 4.3: יצירת entry חדש
```
forceSnapshot או כל 20 deltas → snapshot (state מלא)
אחרת → delta (jsondiffpatch diff בין previousState ל-currentState)
→ appendToHistory(history, entry)
```

#### שלב 4.4: backupToDriveV2() - העלאת קבצים
```
→ buildContentPayload(state)    → content ללא isDone
→ buildProgressPayload(state)   → רק { taskDone: {...} }
→ חישוב hashes: contentHash, progressHash

→ קריאת assets.json מהענן
→ לכל תמונה מקומית שחסרה באינדקס:
    → חישוב sha256 של ה-blob
    → אם ה-hash לא קיים בענן → העלאת blob לתיקיית assets/
    → עדכון האינדקס
→ חישוב assetsHash

→ *** כתיבות אינקרמנטליות: ***
  assetsHash !== cache.lastUploadedAssetsHash?   → כתוב assets.json
  contentHash !== cache.lastUploadedContentHash? → כתוב content.json
  progressHash !== cache.lastUploadedProgressHash? → כתוב progress.json
  (אם ה-hash זהה ל-cache → דלג! לא מעלים)

→ כתוב manifest.json אחרון (commit marker)
  + appProperties עם writeId, hashes, device info
```

#### שלב 4.5: כתיבת history.json מעודכן

---

### שלב 5: עדכון מצב מקומי

```
deviceState.v2Cache ← hashes חדשים (לאינקרמנטליות הבאה)
lastKnownWriteId ← writeId החדש
previousState ← snapshot של ה-state הנוכחי (ל-delta הבא)
```

---

### שלב 6: טיפול בשגיאות

```
שגיאה "No changes to backup" → הצלחה (אין מה לעשות)
שגיאה אחרת → retry עם exponential backoff
  1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s
  (עד 10 ניסיונות, ~17 דקות)
```

---

## מפת הקוד

```
SyncController.sync()                            ← syncController.svelte.ts
├── dailyScheduleBackupRepo.findV2ManifestMeta() ← dailyScheduleBackupRepo.ts
├── restoreWithMerge()                           ← driveBackupV2.ts
│   ├── ensureStructure()                        ← dailyScheduleBackupRepo.ts
│   ├── restoreFromDriveV2()                     ← driveBackupV2.ts
│   │   ├── repo.readJson(manifest)
│   │   ├── repo.readJson(content/progress/assets)
│   │   ├── normalize*(...)                      (בתוך driveBackupV2.ts)
│   │   └── repo.downloadAsset(...)              (תמונות חסרות)
│   ├── repo.readHistoryJson()
│   ├── findCommonAncestor()                     ← historyManager.ts
│   └── threeWayMerge()                          ← syncEngine.ts
├── calculateDelta()                             ← syncEngine.ts
└── backupWithHistory()                          ← driveBackupV2.ts
    ├── ensureStructure()                        ← dailyScheduleBackupRepo.ts
    ├── repo.readHistoryJson()
    ├── shouldCreateSnapshot() / appendToHistory() ← historyManager.ts
    ├── calculateDelta()                           ← syncEngine.ts
    ├── backupToDriveV2()                          ← driveBackupV2.ts
    │   ├── buildContentPayload/buildProgressPayload ← backupPayloads.ts
    │   ├── sha256String/sha256Blob                  ← crypto.ts
    │   ├── repo.readJson(assetsIndex)
    │   ├── repo.uploadAsset(...)                    (תמונות חדשות)
    │   ├── repo.writeJson(assets/content/progress)  (אינקרמנטלי!)
    │   └── repo.writeJson(manifest + appProperties) (אחרון!)
    └── repo.writeHistoryJson()
```

---

## מה גנרי ומה ספציפי ל-Drive?

### גנרי (לא תלוי ב-Drive)
| קובץ | תוכן |
|------|------|
| `services/sync/syncEngine.ts` | calculateDelta, threeWayMerge, applyDelta |
| `services/sync/historyManager.ts` | findCommonAncestor, shouldCreateSnapshot, appendToHistory, reconstructState |
| `services/sync/types.ts` | SyncHistory, SnapshotEntry, DeltaEntry |
| `services/drive/backupPayloads.ts` | buildContentPayload, buildProgressPayload, collectAssetIds |
| `services/drive/crypto.ts` | sha256, stableStringify |
| לוגיקה ב-SyncController | triggers, debounce, retry, "should upload?" |

### ספציפי ל-Drive
| קובץ | תוכן |
|------|------|
| `services/drive/dailyScheduleBackupRepo.ts` | ensureStructure, findV2ManifestMeta, readJson/writeJson |
| `services/drive/driveFilesApi.ts` | Google Drive API calls |
| `services/drive/driveHttpClient.ts` | HTTP client עם ETag support |
| `services/drive/googleAuthService.ts` | OAuth / token management |

### מעורבב - צריך הפרדה
| קובץ | הבעיה |
|------|-------|
| `services/drive/driveBackupV2.ts` | מכיל גם לוגיקה גנרית (history management, normalize, merge) וגם קוד Drive-ספציפי (5 קבצים, hashes, incremental upload) |
| `logic/syncController.svelte.ts` | תלוי ישירות ב-`googleAuthService` ו-`dailyScheduleBackupRepo` |

---

## תכנון הפרדה - חלוקת אחריות

### השאלה המרכזית

האם הספק מקבל את ספריית ה-diff/merge ומממש את הסנכרון לבד,
או שהפלטפורמה מנהלת הכל והספק רק חושף פעולות אחסון?

### האפשרויות

**א. Fat Provider** - הספק מקבל כלי השוואה ומממש סנכרון מקצה לקצה:
```
syncController → provider.sync(localState) → mergedState
```
**בעיה**: כל ספק מממש את לוגיקת ה-merge בעצמו → קוד כפול, קשה לבדוק, קשה לשמור על עקביות.

**ב. Thin Provider** - הפלטפורמה מנהלת הכל, הספק חושף פעולות אחסון בלבד:
```
syncOrchestrator → provider.pullContent() / provider.pushContent(payload, hash)
```
**יתרון**: merge, delta, history — נבדקים פעם אחת, ללא תלות ב-Drive. ספק חדש = רק I/O.

### המתח: אינקרמנטליות

גוגל דרייב שומר cache של fileIds ו-ETags. File-Upload לא צריך זאת.

**הפתרון**: הפלטפורמה מחשבת hash ומעבירה אותו. הספק מחליט אם צריך network call:

```typescript
provider.writeContent(payload, hash);
// Google Drive: if (hash === this.cache.contentHash) return; // דלג
// File: תמיד כותב (הכל ב-ZIP ממילא)
```

כך ה-cache הפנימי של הספק הוא **פרט מימוש** — הפלטפורמה לא יודעת עליו.

---

### החלטה: Thin Provider עם Smart Write

```
┌──────────────────────────────────────────────────────────┐
│                    syncOrchestrator                       │
│                                                           │
│  לוגיקה גנרית (pure functions):                          │
│  calculateDelta, threeWayMerge, findCommonAncestor        │
│  buildContentPayload, sha256, history management          │
│  normalize (users, people, lists, settings)              │
│                                                           │
│  זרימת סנכרון:                                            │
│  pull → compare writeIds → merge? → push                  │
│  "האם צריך להעלות?"                                      │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│               SyncProvider (interface)                    │
│                                                           │
│  initialize()                           ← lazy init      │
│  isAvailable(): Promise<boolean>        ← async          │
│  checkRemote() → RemoteMetadata | null  ← זול! (metadata)│
│  pullContent / pullProgress / pullHistory / pullAssets()  │
│  writeContent(payload, hash)  ← ספק מחליט אם להעלות     │
│  writeProgress / writeHistory / writeAssets(...)          │
│  commit(manifest)             ← אחרון! commit marker     │
└──────────────────────────────────────────────────────────┘
```

### חלוקת אחריות סופית

| תחום | אחריות ה-orchestrator | אחריות הספק |
|------|----------------------|-------------|
| לוגיקה טהורה | calculateDelta, threeWayMerge, sha256, buildPayloads | — |
| היסטוריה | findCommonAncestor, appendToHistory, shouldCreateSnapshot | — |
| נורמליזציה | normalizeUsersMap, normalizePeopleMap, normalizeListsMap, normalizeSettings | — |
| זרימה | pull → merge → push, "צריך להעלות?" | — |
| אתחול | קורא provider.initialize() | מממש (Drive: ensureStructure, File: no-op) |
| אחסון | — | read/write כל channel (content/progress/assets/history/manifest) |
| אינקרמנטליות | מחשב hash, מעביר לספק | בודק מול cache פנימי, מחליט אם להעלות |
| בדיקות זמינות | — | isAvailable() (async), auth, connectivity |
| dedup תמונות | — | בצד האחסון (hash-based naming) |

### ספקים

**Google Drive** — סנכרון אוטומטי דו-כיווני. cache פנימי (fileIds, hashes) ל-incrementality. משולב ב-SyncController.

**File (ZIP)** — מממש SyncProvider. checkRemote()→null (אין remote מתמשך). commit() יוצר ZIP להורדה. pull* קורא מ-ZIP שהמשתמש העלה. ייחשף דרך כפתורי Export/Import ב-UI, לא דרך SyncController האוטומטי.

### טיפול בשגיאות (נשמר + משופר)

**מה קיים היום ונשמר:**
- "No changes to backup" → הצלחה (לא retry)
- Exponential backoff: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 שניות
- MAX_RETRIES = 10 (~17 דקות)
- syncStore: syncStarted() / syncSucceeded() / syncFailed(msg, attempt, delay) / setOffline()
- Offline detection: navigator.onLine + window offline event

**מה נוסף:**
- SyncError type עם קטגוריות: network / auth / conflict / unknown
- ה-orchestrator זורק SyncError, ה-controller מטפל לפי קטגוריה:
  - network → retry עם backoff (כמו היום)
  - auth → לא retry, מסמן error (המשתמש צריך לחבר מחדש)
  - conflict → retry מיידי (pull חדש יפתור)
  - unknown → retry עם backoff

### מיגרציה deviceState V1 → V2

```
V1 (נוכחי):                          V2 (חדש):
drive.deviceId/Name           →  device.deviceId/Name
drive.lastKnownWriteId        →  sync.lastKnownWriteId
drive.autoBackupEnabled       →  sync.autoSyncEnabled
drive.v2Cache.*               →  providers['google-drive'].fileIds + hashes
drive.useRedirectMode         →  auth.useRedirectMode
drive.clientIdOverride        →  auth.clientIdOverride
auth.googleAuthStorage        →  auth.googleAuthStorage (ללא שינוי)
settings.*                    →  settings.* (ללא שינוי)
```

בטעינה ראשונה אחרי העדכון: migrateDeviceStateInStorage() מזהה version===1, ממיר למבנה V2, שומר ומוחק את drive.*.
