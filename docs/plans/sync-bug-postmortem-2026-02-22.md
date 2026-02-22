# Postmortem: באג סנכרון — שינויים מקומיים לא עלו ל-Google Drive

**תאריך גילוי**: 22.2.2026  
**תאריך תיקון**: 22.2.2026  
**חומרה**: קריטי — שינויים של משתמשים לא נשמרו בענן  
**קבצים שתוקנו**: `syncController.svelte.ts`, `driveBackupV2.ts`

---

## 1. תיאור הבעיה

משתמש הוסיף משימה במכשיר אחד. לחיצה על "סנכרן עכשיו" הראתה "הגיבוי בוצע בהצלחה!" — אך "גיבוי אחרון" לא התעדכן (נשאר מ-16.2.2026). המשימה לא הופיעה במכשיר השני.

הבאג התרחש בשקט: לא הייתה שגיאה, הממשק דיווח הצלחה, אבל **לא בוצע שום upload אמיתי לענן**.

---

## 2. ארכיטקטורת הסנכרון (רקע)

```
SyncController.sync()
  │
  ├── 1. restoreWithMerge()       ← מוריד מהענן, מבצע merge אם נדרש
  │       │
  │       ├── writeIds תואמים?   → { state: localState, merged: false, remoteState }
  │       ├── writeIds שונים?    → 3-way merge / fallback to remote
  │       └── אין local state?   → { state: remoteState, merged: false }
  │
  ├── 2. calculateDelta(previousState, stateForUpload)
  │       └── null = אין שינויים → דלג על upload
  │
  └── 3. backupWithHistory()      ← מעלה לענן רק אם יש שינויים
```

**`previousState`** = "המצב שהועלה לאחרונה" — ה-baseline להשוואה. זה השחקן הראשי בבאג.

---

## 3. ניתוח שורש הבאג

### כשל #1 — תנאי רחב מדי

**קוד לפני התיקון** (`syncController.svelte.ts` שורה 193):

```typescript
if (!restoreResult.merged) {
    this.previousState = cloneAppState(stateForUpload);
}
```

**מה קורה כשה-writeIds תואמים** (לא נדרש שינוי מרוחק):

| משתנה | ערך |
|---|---|
| `restoreResult.merged` | `false` (לא היה merge) |
| `shouldApplyRemoteState` | `false` (writeIds זהים) |
| `restoreResult.state` | `localState` (הפונקציה מחזירה את המצב המקומי) |
| `stateForUpload` | `localState` (עם שינויים מקומיים) |

**מה קורה לאחר מכן:**

```typescript
// התנאי !restoreResult.merged = true → ירה תמיד
this.previousState = cloneAppState(stateForUpload);  // = localState

// לאחר מכן:
calculateDelta(previousState, stateForUpload)
= calculateDelta(localState, localState)
= null  ← אין שינויים!

hasLocalChanges = false → shouldUpload = false → דילוג על upload
```

**כלומר**: בכל סנכרון שבו ה-writeIds תואמים (= המצב הנפוץ ביותר לאחר גיבוי ראשון), `previousState` מאופס ל-`localState`, מה שגורם לכל סנכרון הבא לדווח "אין שינויים".

### כשל #2 — אתחול שגוי ב-`loadLocalState`

```typescript
private loadLocalState() {
    this.lastKnownWriteId = ds.drive.lastKnownWriteId;
    this.previousState = cloneAppState(globalState.state);  // = localState
}
```

לאחר רענון דף (`F5`), `previousState` מאותחל ל-`globalState.state` (המצב הנוכחי כולל שינויים מקומיים). כאשר מתרחש סנכרון ראשון:

- `restoreWithMerge` → writeIds תואמים → `stateForUpload = localState`
- `calculateDelta(localState, localState) = null`
- אין upload — גם אם קיימים שינויים מקומיים שטרם הועלו

**כשל #1 גרם לזה לקרות בכל סנכרון; כשל #2 גרם לזה לקרות בכל טעינת דף.**

---

## 4. תהליך הדיבוג

### כלים ומתודולוגיה

נעשה שימוש ב-**Debug Mode** עם לוגים שנשלחים ב-fetch ל-endpoint מקומי ומוצגים גם ב-console. כל לוג כלל `hypothesisId`, `runId`, ו-`message` לזיהוי מדויק.

נבדקו 4 נקודות מדידה:

| לוג | מיקום | מה נמדד |
|---|---|---|
| `sync-start` | תחילת `sync()` | `lastKnownWriteId`, `hasPreviousState` |
| `after-restore` | אחרי `restoreWithMerge` | `merged`, `writeIdsMatch`, `shouldApplyRemoteState` |
| `previousState-reset-branch-FIRED` | תוך `if (!restoreResult.merged)` | האם הענף ירה |
| `upload-decision` | לפני ה-upload | `hasLocalChanges`, `shouldUpload` |

### לוגים שהוכיחו את הבאג (run 1)

```json
{"message":"after-restore",        "data":{"merged":false,"writeIdsMatch":true,"shouldApplyRemoteState":false}}
{"message":"previousState-reset-branch-FIRED", "data":{"shouldApplyRemoteState":false}}
{"message":"upload-decision",      "data":{"hasLocalChanges":false,"shouldUpload":false}}
```

- `writeIdsMatch:true` — אין שינויים מרוחקים, לא היה צריך לאפס `previousState`
- `previousState-reset-branch-FIRED` עם `shouldApplyRemoteState:false` — הענף ירה בטעות
- `hasLocalChanges:false` → upload מדולג ✗

### לוגים לאחר תיקון #1 (עדיין כשל)

```json
{"message":"after-restore",   "data":{"writeIdsMatch":true,"shouldApplyRemoteState":false}}
{"message":"upload-decision", "data":{"hasLocalChanges":false,"shouldUpload":false}}
```

`previousState-reset-branch-FIRED` **לא הופיע יותר** ✓ — כשל #1 תוקן.  
אבל `hasLocalChanges` עדיין `false` — כשל #2 עדיין פעיל.

**סיבה**: `previousState` (מ-`loadLocalState`) = `localState`. `stateForUpload` (מ-`restoreWithMerge`) = `localState`. Delta = 0.

**פתרון**: `restoreWithMerge` כבר טוען `remoteState` (מצב הענן) אך לא מחזיר אותו כשה-writeIds תואמים. הוספנו אותו לערך המוחזר, ואז ב-`syncController` הגדרנו `previousState = remoteState`.

### לוגים לאחר תיקון #2 (הצלחה)

```json
{"message":"previousState-set-to-remoteState", "data":{"hasRemoteState":true}}
{"message":"upload-decision", "data":{"hasLocalChanges":true,"shouldUpload":true}}
```

`hasLocalChanges:true` → upload בוצע ✓  
"גיבוי אחרון" התעדכן מ-16.2.2026 ל-22.2.2026.

---

## 5. התיקון

### `driveBackupV2.ts` — החזרת `remoteState`

```typescript
// לפני
}: Promise<{ state: AppState; manifest: ManifestV2; merged: boolean }> {
// ...
if (params.localWriteId === remoteWriteId) {
    return { state: params.localState, manifest: remoteManifest, merged: false };
}

// אחרי
}: Promise<{ state: AppState; manifest: ManifestV2; merged: boolean; remoteState?: AppState }> {
// ...
if (params.localWriteId === remoteWriteId) {
    return { state: params.localState, manifest: remoteManifest, merged: false, remoteState };
}
```

`remoteState` כבר היה בסקופ (נטען בשורה 566) — רק נדרש להחזירו.

### `syncController.svelte.ts` — תנאי מדויק + baseline נכון

```typescript
// לפני
if (!restoreResult.merged) {
    this.previousState = cloneAppState(stateForUpload);
}

// אחרי
if (!restoreResult.merged && shouldApplyRemoteState) {
    // pull מהענן בלבד — ה-baseline הוא מצב הענן שהתקבל
    this.previousState = cloneAppState(stateForUpload);
} else if (!restoreResult.merged && !shouldApplyRemoteState && restoreResult.remoteState) {
    // writeIds תואמים — השתמש ב-remoteState כ-baseline
    // כך calculateDelta(remoteState, localState) יזהה שינויים מקומיים
    this.previousState = cloneAppState(restoreResult.remoteState);
}
```

**למה זה נכון:**

| מצב | `previousState` | `stateForUpload` | `calculateDelta` |
|---|---|---|---|
| לפני תיקון (writeIds תואמים) | `localState` | `localState` | `null` — לא מועלה ✗ |
| אחרי תיקון (writeIds תואמים) | `remoteState` | `localState` | delta עם שינויים ✓ |
| pull מרוחק (writeIds שונים) | `remoteState` (= `stateForUpload`) | `remoteState` | `null` — נכון, כבר עודכן ✓ |

---

## 6. תופעת לוואי שנחשפה

כאשר תיקון #1 גרם למכשיר 1 להעלות שינויים, מכשיר 2 ניסה לבצע merge:

```
[HistoryManager] Entry לא נמצא: f2530d9b-d56e-4e28-9f87-e71634e28d27
[BackupV2] no common ancestor found, using remote
```

הגיבוי מ-16.2 לא היה בהיסטוריה כ-entry מפורש (הועלה לפני שמערכת ה-history הוטמעה). הפולבק הוא "השתמש במצב הענן" — מה שגרם לאבדן משימה שהייתה רק על מכשיר 2.

**זו בעיה נפרדת** שהייתה קיימת מלפני התיקון אך הייתה מוסתרת (כי אף מכשיר לא העלה כלום). היא דורשת טיפול נפרד: כשאין common ancestor, יש להשתמש במצב המקומי (או להציג conflict למשתמש) במקום לדרוס אותו.

---

## 7. לקחים

1. **`previousState` חייב לשקף "מה הועלה לאחרונה"** — לא "המצב הנוכחי". כל אתחול שמשווה `localState` ל-`localState` יוצר delta אפסי.

2. **תנאים רחבים מדי בסנכרון מסוכנים** — `!restoreResult.merged` נכון טכנית אך רחב מדי. יש לוודא שכל ענף בהחלטת הסנכרון מבוסס על שאלה אחת ברורה: "האם הועלה מצב חדש לענן?"

3. **run-time evidence חיוני** — הבאג היה בלתי גלוי מקריאת הקוד בלבד (הכל נראה הגיוני). רק הלוגים שהראו `previousState = stateForUpload` הוכיחו את הבעיה.

4. **פולבקים בסנכרון חייבים להיות שמרניים** — "no common ancestor → use remote" גורם לאבדן נתונים. עדיף "no common ancestor → keep local" ולתת למשתמש לפתור קונפליקט.
