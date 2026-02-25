# ניתוח באג סנכרון — ענף sync/integrate-worktree

**תאריך:** 24.2.2026
**סטטוס:** ניתוח ראשוני — טרם אומת

---

## תיאור הבעיה

הממשק החדש של הסנכרון (ענף `sync/integrate-worktree`) מדווח "סונכרן בהצלחה",
אבל בפועל השינויים לא מסתנכרנים.

זהו המשך ישיר של הבאג שתועד ב-22.2.2026 (`sync-bug-debug-2026-02-22.md`).
התיקון שיושם אז — **מעולם לא אומת**.

---

## מבנה הקבצים החדש

הריפקטור הפריד את הסנכרון ל-3 שכבות:

```
syncController.svelte.ts      ← שכבת בקרה (triggers, debounce, retry)
        │
        ▼
syncOrchestrator.ts            ← לוגיקה גנרית (pull, push, merge, history)
        │
        ▼
SyncProvider (interface)       ← ממשק אחסון (Drive, File, Mock)
  └── googleDriveSyncProvider.ts
  └── mockServerSyncProvider.ts
```

### קבצים מרכזיים

| קובץ | תפקיד |
|-------|--------|
| `src/lib/logic/syncController.svelte.ts` | בקר ראשי — triggers, debounce, retry, ניהול previousState |
| `src/lib/services/sync/syncOrchestrator.ts` | pull + push — לוגיקה גנרית, normalization, 3-way merge |
| `src/lib/services/sync/syncProvider.ts` | ממשק SyncProvider |
| `src/lib/services/sync/engine/syncEngine.ts` | calculateDelta, threeWayMerge (jsondiffpatch) |
| `src/lib/services/sync/engine/historyManager.ts` | findCommonAncestor, reconstructState, appendToHistory |
| `src/lib/services/sync/payloads.ts` | buildContentPayload, buildProgressPayload |
| `src/lib/services/sync/providers/google-drive/googleDriveSyncProvider.ts` | מימוש Drive — hash cache, קריאה/כתיבה |
| `src/lib/services/sync/providers/google-drive/dailyScheduleBackupRepo.ts` | ensureStructure, read/write JSON ב-Drive |
| `src/lib/stores/deviceState.ts` | localStorage — lastKnownWriteId, hash cache, device info |

---

## זרימת הסנכרון

```
SyncController.sync()
  │
  ├── 1. בדיקות מקדימות
  │     online? → auth? → autoBackup / manual?
  │
  ├── 2. PULL
  │     syncOrchestrator.pull(provider, localState, lastKnownWriteId, db)
  │       ├── provider.checkRemote()         ← קורא appProperties מ-manifest (זול)
  │       ├── writeIds תואמים?               ← אין שינוי מרחוק
  │       │     └── needsBaseline?           ← מוריד remote state כ-baseline
  │       ├── writeIds שונים?                ← הורדת remote state
  │       │     ├── אין local state          ← השתמש ב-remote
  │       │     └── יש local state           ← 3-way merge
  │       │           ├── pullHistory()
  │       │           ├── findCommonAncestor()
  │       │           └── threeWayMerge()
  │       └── מחזיר PullResult { state, remoteWriteId, merged, remoteState? }
  │
  ├── 3. עדכון local state (אם נדרש)
  │     אם merged או writeId חדש → globalState.state = pullResult.state
  │
  ├── 4. עדכון previousState (הקוד הבעייתי — שורות 177-186)
  │     ← כאן היה הבאג המקורי, ראה פירוט למטה
  │
  ├── 5. החלטה: צריך להעלות?
  │     hasLocalChanges = calculateDelta(previousState, stateForUpload)
  │     shouldUpload = !remoteWriteId || merged || hasLocalChanges
  │
  └── 6. PUSH (אם צריך)
        syncOrchestrator.push(provider, state, previousState, ...)
          ├── pullHistory() → יצירת snapshot או delta
          ├── buildContentPayload / buildProgressPayload
          ├── חישוב hashes
          ├── provider.writeContent(payload, hash)    ← דילוג אם hash זהה ל-cache
          ├── provider.writeProgress(payload, hash)   ← דילוג אם hash זהה ל-cache
          ├── provider.writeAssets(index, newBlobs)
          ├── provider.writeHistory(history)
          └── provider.commit(manifest)               ← תמיד אחרון! כותב appProperties
```

---

## הבאג המקורי (22.2.2026) — האם התיקון מספיק?

### הבעיה המקורית

```typescript
// לפני התיקון:
if (!restoreResult.merged) {
    this.previousState = cloneAppState(stateForUpload);
}
```

כש-writeIds תואמים (אין שינוי מרחוק), `merged=false` ו-previousState נדרס עם stateForUpload.
אבל stateForUpload הוא ה-localState הנוכחי (עם השינויים המקומיים).
אז `calculateDelta(previousState, stateForUpload)` תמיד מחזיר null — אין הבדל.
**השינויים המקומיים נבלעים ולא עולים ל-Drive.**

### התיקון שיושם

```typescript
// אחרי התיקון (שורות 177-186):
if (!mergedFromRemote && shouldApplyRemoteState) {
    this.previousState = cloneAppState(stateForUpload);
} else if (!mergedFromRemote && !shouldApplyRemoteState && pullResult.remoteState) {
    const baseline = cloneAppState(pullResult.remoteState);
    baseline.lastModified = stateForUpload.lastModified;
    baseline.settings = cloneAppState(stateForUpload).settings;
    this.previousState = baseline;
}
```

**סטטוס: יושם אך מעולם לא אומת בבדיקה ידנית.**

---

## חשדות לבאגים — ממוינים לפי רמת חשד

### חשד מספר 1: הלוגיקה ב-177-186 עדיין חלקית

**הבעיה:** שני התנאים (177 ו-179) דורשים `!mergedFromRemote`.

כשמתרחש merge (`mergedFromRemote=true`), **אף ענף לא רץ** ו-`previousState` לא מתעדכן.

**למה זה עשוי להיות בסדר:** Push תמיד רץ אחרי merge (כי `shouldUpload = mergedFromRemote`).
ובשורה 215 אחרי push מוצלח: `this.previousState = cloneAppState(stateForUpload)`.

**למה זה עלול להיות בעיה:** אם push נכשל עם "No changes to backup"
(שורות 224-229), הסנכרון מדווח הצלחה אבל previousState לא מתעדכן.
הסנכרון הבא עלול להתנהג בצורה לא צפויה.

### חשד מספר 2: syncMetadata לא עובר round-trip

**מיקום:** `payloads.ts:31-42` ו-`syncOrchestrator.ts:254`

**הבעיה:**
- `buildContentPayload` **לא כולל** `syncMetadata` ב-content.json
- `pullAndBuildState` קורא `syncMetadata: contentObj.syncMetadata` → תמיד `undefined`
- אם ל-local state יש `syncMetadata` (למשל אחרי merge), נוצר **phantom delta**

**השפעה:** Push מיותרים (לא מזיקים אבל מבזבזים bandwidth).
לא אמור למנוע סנכרון, אבל מרעיש את הלוגים.

### חשד מספר 3: Baseline normalization חלקית

**מיקום:** `syncController.svelte.ts:182-185`

**הבעיה:** כשנבנה baseline מ-remote state, מתקנים רק `lastModified` ו-`settings`.
אבל יש שדות נוספים שעלולים להיות שונים:

| שדה | local state | baseline מ-remote | מתוקן? |
|-----|-------------|-------------------|--------|
| `lastModified` | timestamp מקורי | `now` | כן |
| `settings` | ערכים אמיתיים | defaults מ-normalizeSettings | כן |
| `syncMetadata` | אובייקט או undefined | `undefined` (לא ב-content) | **לא** |
| `version` | מספר | `contentObj.appStateVersion` | **לא** (אמור להתאים) |
| `isDone` על tasks | `undefined` (אם לא סומן) | `false` (מ-progress normalization) | **לא** |

ההבדל `isDone: undefined` מול `isDone: false` יכול ליצור phantom delta.

### חשד מספר 4: settings לא מסתנכרן בין מכשירים

**מיקום:** `payloads.ts:41`

```typescript
return {
    ...
    settings: {}    // ← תמיד ריק!
};
```

**השפעה:** settings (כמו `childLockEnabled`, `lastActiveTime`) לא עוברים בין מכשירים.
ייתכן שזה by design (settings הוא per-device), אבל כדאי לוודא.

---

## מה צריך לבדוק כדי לצמצם את החיפוש

### שאלות פתוחות

1. **מה התרחיש המדויק?**
   - מכשיר אחד (שינויים מקומיים לא עולים ל-Drive)?
   - שני מכשירים (A מעלה, B לא מקבל)?
   - שניהם?

2. **איזה סוג שינוי?**
   - שינוי שם משימה / הוספת משימה (content.json)
   - סימון V (progress.json)
   - שינוי תמונה (assets)

3. **גיבוי אוטומטי מופעל או כבוי?**
   - אם כבוי: הסנכרון הראשוני בטעינת האפליקציה נדלג (שורה 117-119),
     ו-previousState נשאר null עד הסנכרון הידני הראשון.

4. **האם יש console logs מהדפדפן?**
   - הלוגים של `[SyncController]`, `[SyncOrchestrator]`, `[GoogleDriveSyncProvider]`
     יכולים להצביע בדיוק על איפה הזרימה נתקעת.

### בדיקה מוצעת

הרצת dev server על ה-worktree עם שני דפדפנים (Playwright CLI):

```bash
# הפעלת dev server מה-worktree
cd .worktrees/new-sync-dev/sveltekit-version
npm run dev

# פתיחת שני "מכשירים" עם פרופילים נפרדים
playwright-cli -s=device1 open http://localhost:5173/settings/backup --persistent --headed
playwright-cli -s=device2 open http://localhost:5173/settings/backup --persistent --headed
```

ואז:
1. ביצוע שינוי ב-device1
2. לחיצה על "סנכרן עכשיו" ב-device1
3. בדיקת console logs ב-device1
4. לחיצה על "סנכרן עכשיו" ב-device2
5. בדיקה אם השינוי הגיע

---

## נספח: מפת הקוד המלאה

```
syncController.svelte.ts
├── constructor()
│     ├── loadLocalState()         ← lastKnownWriteId מ-localStorage, previousState=null
│     └── setupTriggers()          ← visibility, online/offline, sync ראשוני
│
├── triggerSync()                  ← debounce 5s, רק אם autoBackup מופעל
│
└── sync({ manual? })
      ├── בדיקות: online, isAvailable, autoBackup/manual
      ├── syncStarted()
      ├── localState = clone(globalState.state)
      │
      ├── PULL: pull(provider, localState, lastKnownWriteId, db, { needsBaseline })
      │
      ├── shouldApplyRemoteState?
      │     → globalState.state = pullResult.state
      │     → globalState.save()
      │
      ├── עדכון previousState (שורות 177-186)  ← הקוד הבעייתי
      │
      ├── hasLocalChanges? shouldUpload?
      │     → לא: syncSucceeded(), return
      │
      ├── PUSH: push(provider, stateForUpload, previousState, ...)
      │
      ├── saveLastKnownWriteId(pushResult.writeId)
      ├── previousState = clone(stateForUpload)
      └── syncSucceeded()
```

```
syncOrchestrator.ts
├── pull(provider, localState, localWriteId, db, options)
│     ├── provider.initialize()
│     ├── provider.checkRemote()          ← metadata בלבד
│     ├── אם אין remote: return localState
│     ├── אם writeIds תואמים + needsBaseline: pullAndBuildState()
│     ├── אם writeIds שונים: pullAndBuildState() + merge
│     │     ├── provider.pullHistory()
│     │     ├── findCommonAncestor()
│     │     └── threeWayMerge()
│     └── return PullResult
│
├── pullAndBuildState(provider, db, now)   ← private
│     ├── provider.pullContent()
│     ├── provider.pullProgress()
│     ├── provider.pullAssets()
│     ├── normalize*()                     ← users, people, lists, settings
│     ├── החלת progress (isDone)
│     └── הורדת assets חסרים
│
└── push(provider, state, previousState, lastKnownWriteId, device, db, options)
      ├── provider.initialize()
      ├── provider.pullHistory()
      ├── snapshot או delta?
      ├── appendToHistory()
      ├── buildContentPayload / buildProgressPayload
      ├── sha256 hashes
      ├── provider.writeContent/Progress/Assets/History
      └── provider.commit(manifest)        ← אחרון!
```

```
googleDriveSyncProvider.ts
├── initialize()       → ensureStructure() (מוצא/יוצר קבצים ב-Drive)
├── isAvailable()      → googleAuth.getAccessToken()
├── checkRemote()      → findV2ManifestMeta() → appProperties.writeId
├── pullContent()      → readJson(contentFileId)
├── pullProgress()     → readJson(progressFileId)
├── pullHistory()      → readHistoryJson(historyFileId)
├── pullAssets()       → readJson(assetsIndexFileId)
├── writeContent()     → if (hash !== cache) writeJson(...)
├── writeProgress()    → if (hash !== cache) writeJson(...)
├── writeAssets()      → upload new blobs + writeJson(index)
├── writeHistory()     → writeHistoryJson(...)
└── commit()           → writeJson(manifest, { appProperties })
                          ↑ שתי פעולות: 1) upload JSON 2) update metadata
```

---

## ממצאים מבדיקה ידנית — 25.2.2026

### סביבת הבדיקה

- Mock Server על port 3001, Dev Server על port 5173 עם `VITE_USE_MOCK_SYNC=true`
- שני דפדפנים (device-1 ו-device-2) עם פרופילים persistent נפרדים
- נוסף ממשק בדיקה ייעודי (`MockSyncPanel.svelte`) שמחליף את ממשק Google Drive

### מה נבדק

1. הוספת משימה "להתקלח" ב-device-1, סנכרון ידני
2. הוספת משימה "אורחים מגיעים" ב-device-1, סנכרון ידני
3. סנכרון מ-device-2

### תוצאות

**הסנכרון "עובד"** — הנתונים מגיעים ל-Mock Server ו-device-2 מקבל אותם.

**אבל הדלתאות שבורות:**

```
Total entries: 12

Entry 0  : snapshot  | device: 492cb71a  (state ראשוני)
Entry 1  : delta     | device: 73e7ab45  → {"lastModified": [...]}
Entry 2  : snapshot  | device: 492cb71a
Entry 3  : delta     | device: 492cb71a  → {"lastModified": [...]}
Entry 4  : snapshot  | device: 73e7ab45
Entry 5  : delta     | device: 73e7ab45  → {"lastModified": [...]}
Entry 6  : delta     | device: 6f13b0ae  → {"lastModified": [...]}
Entry 7  : delta     | device: ece38acc  → {"lastModified": [...]}
Entry 8  : snapshot  | device: 6f13b0ae  (כולל "להתקלח" + "אורחים מגיעים")
Entry 9  : delta     | device: 6f13b0ae  → {"lastModified": [...]}
Entry 10 : snapshot  | device: ece38acc
Entry 11 : delta     | device: ece38acc  → {"lastModified": [...]}
```

**כל 6 הדלתאות מכילות רק `lastModified`!**
אף דלתא לא מכילה את השינוי המבני (הוספת משימות, שינוי images וכו').

### ניתוח מלא — כל הבאגים שזוהו

---

#### באג 1 (קריטי): push מיותר בכל פתיחת דפדפן — phantom `lastModified` delta

**מיקום:** `syncOrchestrator.ts:253` + `syncController.svelte.ts:189-192`

**הבעיה:** `pullAndBuildState()` תמיד מחזיר `lastModified: now` (Date.now()):

```typescript
// syncOrchestrator.ts:244-255
const restored: AppState = {
    ...
    lastModified: now,          // ← תמיד Date.now()!
    syncMetadata: contentObj.syncMetadata  // ← תמיד undefined!
};
```

**זרימה בפתיחת דפדפן חדש (פרופיל ריק, אין localStorage):**

```
1. previousState = null (דפדפן חדש)
2. sync() → lastKnownWriteId = null
3. pull() עם needsBaseline=true → מוריד remote state
4. pullAndBuildState() מחזיר state עם lastModified=Date.now()
5. shouldApplyRemoteState = true (כי !lastKnownWriteId)
6. שורה 177: !mergedFromRemote && shouldApplyRemoteState → true
   → previousState = clone(stateForUpload)  // שניהם pullResult.state
7. calculateDelta(previousState, stateForUpload):
   - previousState.lastModified = 1771971475628  (הרגע של clone)
   - stateForUpload.lastModified = 1771971475628  (אותו אובייקט)
   → אמור להיות null (אין הבדל)

   אבל! אם globalState.state עידכן lastModified בין הזמנים
   (Svelte reactivity, save מקומי, וכו')
   → delta = {"lastModified": [old, new]}

8. hasLocalChanges = true!
9. shouldUpload = true → push מיותר!
```

**התוצאה:** כל דפדפן שנפתח מבצע push מיותר עם delta של lastModified בלבד.
ראינו בבדיקה: 12 רשומות היסטוריה על שינוי אחד בלבד.

**תיקון נדרש:** `lastModified` לא צריך להיכלל בחישוב delta להיסטוריה,
או `pullAndBuildState` צריך לשמר את ה-lastModified המקורי מה-remote.

---

#### באג 2 (קריטי): דלתאות ההיסטוריה לא מכילות שינויים מבניים

**מיקום:** `syncController.svelte.ts:177-186` + `syncOrchestrator.ts:253-254`

**הבעיה:** כשמשתמש מוסיף משימה ומסנכרן, ה-delta בהיסטוריה מכיל
רק `{"lastModified": [...]}` ולא את המשימה החדשה.

**זרימה (אחרי סנכרון ראשוני מוצלח, שינוי מקומי, סנכרון שני):**

```
מצב: lastKnownWriteId = "abc", previousState = remote state מהסנכרון הקודם
המשתמש הוסיף משימה "אורחים מגיעים"

1. sync() מתחיל
2. localState = clone(globalState.state)  ← כולל "אורחים מגיעים"
3. pull() → writeIds תואמים (שום דבר לא השתנה ב-remote)
   → pullResult = { state: localState, merged: false, remoteWriteId: "abc" }
4. shouldApplyRemoteState = false (writeIds תואמים, lastKnownWriteId קיים)
5. mergedFromRemote = false

6. שורות 177-186 — עדכון previousState:
   - שורה 177: !mergedFromRemote && shouldApplyRemoteState → false && false → skip
   - שורה 179: !mergedFromRemote && !shouldApplyRemoteState && pullResult.remoteState
     → true && true && ???

   כאן הענף השני רץ רק אם pullResult.remoteState קיים.
   אם needsBaseline=false (כי previousState !== null),
   ה-pull לא מוריד remote state → pullResult.remoteState = undefined
   → הענף השני גם לא רץ!

   → previousState לא משתנה ← נשאר מהסנכרון הקודם ✓

7. calculateDelta(previousState, stateForUpload):
   - previousState = remote state מהסנכרון הקודם (ללא "אורחים מגיעים")
   - stateForUpload = localState (עם "אורחים מגיעים")
   - delta צריך לכלול את המשימה החדשה...

   אבל! previousState.lastModified ≠ stateForUpload.lastModified
   (כי pullAndBuildState שם Date.now() בסנכרון הקודם)
   → delta כולל lastModified + אולי גם את המשימה

   ...או שה-previousState כבר כולל את המשימה כי הוא נדרס בשורה 196:
   this.previousState = cloneAppState(stateForUpload);  // אחרי push מוצלח!
```

**הבעיה האמיתית:**
- אחרי push מוצלח (שורה 215): `this.previousState = clone(stateForUpload)`
- stateForUpload כולל את המשימה (כי זה localState)
- בסנכרון הבא, previousState כבר כולל את המשימה
- remote state כבר כולל את המשימה (כי העלינו אותה)
- → delta ריק (רק lastModified)

**זו הסיבה שכל הדלתאות מכילות רק lastModified:**
ברגע שה-push מצליח, previousState מתעדכן ל-state המלא,
ובסנכרון הבא ההבדל היחיד הוא lastModified (שמשתנה כי Date.now()).

**סכנת 3-way merge:** כש-`reconstructState()` בונה state מדלתאות:
```
snapshot (state מלא ללא "אורחים מגיעים")
  + delta {"lastModified": [...]}   ← אין את המשימה!
  + delta {"lastModified": [...]}   ← אין את המשימה!
  = state ללא "אורחים מגיעים" ← אובדן נתונים!
```

**תיקון נדרש:** ה-delta שנשמר בהיסטוריה צריך לשקף את ההבדל
בין ה-state *לפני* השינוי המקומי לבין ה-state *אחרי* השינוי.
כלומר — ה-push צריך לחשב delta בין previousState (לפני השינוי)
ל-stateForUpload (אחרי השינוי), ולשמור אותו בהיסטוריה.

---

#### באג 3 (בינוני): `syncMetadata` לא עובר round-trip

**מיקום:** `payloads.ts:31-42` + `syncOrchestrator.ts:254`

```typescript
// payloads.ts — buildContentPayload לא כולל syncMetadata
return { backupSchemaVersion: 2, ..., settings: {} };  // אין syncMetadata!

// syncOrchestrator.ts:254 — pullAndBuildState קורא אותו
syncMetadata: contentObj.syncMetadata  // ← תמיד undefined
```

**השפעה:** אם local state כולל `syncMetadata` (למשל אחרי merge),
אבל ה-remote state שהורדנו לא כולל אותו (כי content.json לא שומר אותו),
נוצר phantom delta על `syncMetadata`.
זה לא חוסם סנכרון, אבל מרעיש את הדלתאות ומבזבז bandwidth.

---

#### באג 4 (בינוני): `isDone: undefined` vs `isDone: false` — phantom delta

**מיקום:** `syncOrchestrator.ts:263` + `syncController.svelte.ts:182-185`

```typescript
// syncOrchestrator.ts:263 — pullAndBuildState
(task as any).isDone = !!taskDone[(task as any).id];  // תמיד boolean (false)
```

אבל ב-local state, משימה שמעולם לא סומנה עשויה להיות `isDone: undefined`.
כש-baseline נבנה מ-remote state, `isDone=false` (מנורמל).
כש-local state שומר `isDone=undefined`, `calculateDelta` רואה הבדל.

**השפעה:** phantom delta על כל משימה שיש לה `isDone: undefined` ב-local.

---

#### באג 5 (קטן): `settings` תמיד ריק ב-content payload

**מיקום:** `payloads.ts:41`

```typescript
return { ..., settings: {} };  // תמיד ריק!
```

**השפעה:** settings (כמו `childLockEnabled`, `lastActiveTime`) לא מסתנכרנים בין מכשירים.
ייתכן שזה by design (settings הוא per-device), אבל ה-baseline normalization
בשורות 184 (`baseline.settings = clone(stateForUpload).settings`) מטפלת בזה
כדי למנוע phantom delta.

---

#### באג 6 (קריטי): שינויי progress בלבד (isDone) לא מסתנכרנים — push נחסם

**תאריך זיהוי:** 25.2.2026
**מיקום:** `syncOrchestrator.ts:412-419`

**הבעיה:** כשמשתמש רק מסמן משימות כ"בוצע" (isDone) בלי לשנות שום דבר מבני
(שם, תמונה, סדר וכו'), ה-push נחסם לגמרי עם "No changes to backup".

```typescript
// syncOrchestrator.ts:416-419
const delta = calculateDelta(toHistoryContent(previousState), historyContent);
if (!delta) {
    console.log(TAG, 'no changes detected, skipping push');
    throw new Error('No changes to backup');  // ← חוסם את כל ה-push!
}
```

**שורש הבעיה:** `toHistoryContent()` מסנן את `isDone` מה-state (כי זה שדה progress, לא content).
לכן כש-content לא השתנה, ה-delta יוצא `null` וה-push נזרק עם שגיאה —
למרות ש-`buildProgressPayload()` (שורה 435) **כן** מייצר payload שונה עם ערכי `isDone` מעודכנים.

**זרימה:**

```
1. previousState = { tasks: { t1: { name: "הכן תיק", isDone: false } } }
2. המשתמש מסמן V על "הכן תיק" → isDone: true
3. push() מתחיל
4. toHistoryContent(previousState) = { tasks: { t1: { name: "הכן תיק" } } }  ← ללא isDone
5. toHistoryContent(state)         = { tasks: { t1: { name: "הכן תיק" } } }  ← ללא isDone
6. calculateDelta() → null (זהים!)
7. throw new Error('No changes to backup') ← ה-push נחסם!
8. buildProgressPayload() לעולם לא נקראת ← שינוי ה-isDone אבד!
```

**השפעה:** סימון/ביטול "בוצע" על משימות **לא מסתנכרן בין מכשירים**.
זה אחד התרחישים הנפוצים ביותר — משתמש מסמן משימות במהלך היום,
אבל progress לא עולה ל-Drive ולא מגיע למכשיר השני.

**תיקון נדרש:** ה-push לא צריך להיחסם כשיש שינויי progress בלבד.
שתי אפשרויות:

1. **בדיקה כפולה** — בדוק גם progress delta לפני חסימה:
   ```typescript
   const contentDelta = calculateDelta(toHistoryContent(previousState), historyContent);
   const progressDelta = calculateDelta(
       buildProgressPayload(previousState),
       buildProgressPayload(state)
   );
   if (!contentDelta && !progressDelta) {
       throw new Error('No changes to backup');
   }
   ```
   אם יש רק progress delta — דלג על ה-history entry אבל **כן** כתוב את ה-progress payload.

2. **הכללת isDone בהיסטוריה** — אל תסנן `isDone` ב-`toHistoryContent()`.
   פשוט יותר, אבל עלול ליצור דלתאות יומיות גדולות יותר (כי isDone משתנה הרבה).

---

### סיכום — סדר תיקון מומלץ

| # | באג | חומרה | תיקון |
|---|-----|--------|-------|
| 1 | push מיותר (lastModified phantom) | 🔴 קריטי | אל תכלול `lastModified` ב-delta, או שמר timestamp מקורי ב-pullAndBuildState |
| 2 | דלתאות בהיסטוריה ריקות | 🔴 קריטי | חשב delta להיסטוריה מה-state *לפני* השינוי, לא אחריו |
| 6 | שינויי progress (isDone) לא מסתנכרנים | 🔴 קריטי | בדוק גם progress delta לפני חסימת push, או הכלל isDone בהיסטוריה |
| 3 | syncMetadata phantom | 🟡 בינוני | הוסף syncMetadata ל-content payload, או התעלם ממנו ב-delta |
| 4 | isDone undefined/false phantom | 🟡 בינוני | נרמל isDone ב-local state, או התעלם ב-delta |
| 5 | settings={} | ⚪ קטן | ככל הנראה by design |

### קבצים שצריך לשנות

1. **`syncController.svelte.ts`** — שורות 177-186 + 189-192: לוגיקת previousState + hasLocalChanges
2. **`syncOrchestrator.ts`** — שורה 253: `lastModified: now` → שמר מקורי, או הוצא מ-delta
3. **`syncOrchestrator.ts`** — שורות 412-419: חסימת push כש-content delta ריק — צריך לבדוק גם progress delta
4. **`payloads.ts`** — שורה 41: `settings: {}` + חסר `syncMetadata`
5. **`syncOrchestrator.ts`** — שורה 263: normalization של isDone
