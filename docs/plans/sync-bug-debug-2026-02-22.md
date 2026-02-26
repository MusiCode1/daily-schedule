# דיבוג באג סנכרון - 22.2.2026

## הבעיה

סנכרון בין 2 מכשירים מדווח "הסתיים בהצלחה" אבל **שינויים מקומיים לא עולים ל-Drive**.

### סימפטומים שזוהו:
- סטטוס סנכרון: "מסונכרן" ✓
- סנכרון אחרון: מתעדכן ✓
- **גיבוי אחרון: 16.2.2026 - לא משתנה!** ✗
- הודעה ירוקה "הגיבוי בוצע בהצלחה!" ← מטעה

---

## שורש הבעיה (Root Cause)

**קובץ**: `src/lib/logic/syncController.svelte.ts`  
**שורות**: 199-202 (מספר השורות הנוכחי, עם ה-instrumentation)

### הקוד הבעייתי (לפני התיקון):

```typescript
// שורה 196
stateForUpload = restoreResult.state;
this.saveLastKnownWriteId(remoteWriteId);

// שורה 199-202 - הבאג!
if (!restoreResult.merged) {
    this.previousState = cloneAppState(stateForUpload);
}
```

### מעקב אחרי הזרימה:

#### סנכרון ראשוני (טעינת האפליקציה):
1. `localWriteId = null` (פעם ראשונה)
2. `restoreWithMerge` מוצא manifest בענן עם `writeId: f2530d9b`
3. כי `localWriteId` הוא null → מחזיר `{ state: remoteState, merged: false }`
4. `shouldApplyRemoteState = true` (כי `!this.lastKnownWriteId`)
5. `globalState.state = remoteState` → state מקומי נדרס ע"י הענן
6. **`previousState = stateForUpload = remoteState`**
7. `calculateDelta(previousState, stateForUpload)` → אין הבדל → דילוג על upload
8. `lastKnownWriteId = f2530d9b`

#### המשתמש מבצע שינוי (ללא סנכרון):
- עריכת ברכה ב"אחרי הצהריים": "אחרי צהריים טובים" → "אחרי צהריים טובים!"
- `globalState.save()` → שמירה ל-localStorage
- `triggerSync()` → **גיבוי אוטומטי כבוי → לא עושה כלום**

#### סנכרון ידני ("סנכרן עכשיו"):
1. `localState = state עם השינוי`
2. `lastKnownWriteId = f2530d9b`
3. `restoreWithMerge`: remote manifest עדיין `writeId: f2530d9b` (אותו!)
4. **`writeIds match, no changes`** → מחזיר `{ state: localState, merged: false }`
5. `shouldApplyRemoteState = false` (כי writeIds תואמים)
6. **`stateForUpload = restoreResult.state = localState`** (עם השינוי)
7. **הבאג**: `!restoreResult.merged = true` → **`previousState = stateForUpload`** → previousState = localState עם השינוי!
8. `calculateDelta(previousState, stateForUpload)` → **אין הבדל!** (שניהם אותו state)
9. `shouldUpload = false` → **דילוג על upload!** ← זו הבעיה

### התיקון:

```typescript
// עדכון baseline רק כשבאמת קיבלנו state חדש מהענן
if (!restoreResult.merged && shouldApplyRemoteState) {
    this.previousState = cloneAppState(stateForUpload);
}
```

הוספת תנאי `&& shouldApplyRemoteState` מבטיחה ש-`previousState` מתעדכן **רק** כשבאמת משכנו state חדש מהענן (סנכרון ראשוני או remote writeId שונה). כשה-writeIds תואמים, `previousState` נשאר על ה-baseline הקודם, ו-`calculateDelta` מזהה נכון את השינוי המקומי.

---

## סטטוס התיקון

- [x] התיקון יושם (שורה 200 ב-syncController.svelte.ts)
- [ ] **טרם אומת!** - לא בוצע ריצת אימות עם הלוגים
- [ ] instrumentation (לוגי debug) עדיין בקוד - **יש להסיר אחרי אימות**

### Instrumentation שנמצא בקוד (יש להסיר אחרי אימות):

1. **`syncController.svelte.ts`** - 4 בלוקי `#region agent log`:
   - שורה ~149-151: sync-start
   - שורה ~186-188: after-restore
   - שורה ~213-215: upload-decision
   - שורה ~260-262: sync-success

2. **`driveBackupV2.ts`** - 1 בלוק `#region agent log`:
   - שורה ~601-603: ancestor-search (ב-restoreWithMerge)

---

## ראיות מה-Runtime (Console Logs)

### מהקונסול של device1 לאחר "סנכרן עכשיו":

```
[BackupV2] restoreWithMerge started {manifestFileId: ..., hasLocalState: true, localWriteId: f2530d9b-d56e-4e28-9f87-e71634e28d27}
[BackupV2] manifest loaded {schemaVer: 2, generatedAt: 1771240882413, writeId: f2530d9b-d56e-4e28-9f87-e71634e28d27}
[BackupV2] writeIds match, no changes                    ← writeIds זהים
[SyncEngine] אין שינויים בין הגרסאות                      ← calculateDelta מחזיר undefined
[SyncController] אין שינויים מקומיים - דילוג על upload    ← לא עולה ל-Drive!
```

---

## סביבת הדיבוג (Playwright CLI)

### מכשירים שנוצרו:

שני דפדפני Chrome עם פרופילים persistent מבודדים (localStorage נפרד):

```bash
# Device 1 - "מכשיר" ראשון
playwright-cli -s=device1 open http://localhost:5173/settings/backup --persistent --profile="C:/temp/playwright-device1" --headed

# Device 2 - "מכשיר" שני
playwright-cli -s=device2 open http://localhost:5173/settings/backup --persistent --profile="C:/temp/playwright-device2" --headed
```

### פקודות שימושיות:

```bash
# רשימת סשנים פתוחים
playwright-cli list

# צילום מסך
playwright-cli -s=device1 screenshot --filename=device1-state.png

# קונסול (לוגים)
playwright-cli -s=device1 console

# snapshot של ה-DOM
playwright-cli -s=device1 snapshot

# ניווט
playwright-cli -s=device1 goto http://localhost:5173/settings/backup

# לחיצה על אלמנט (ref מה-snapshot)
playwright-cli -s=device1 click e41

# מילוי שדה
playwright-cli -s=device1 fill e191 "טקסט חדש"

# רענון
playwright-cli -s=device1 reload

# סגירת הכל
playwright-cli close-all
```

### שני המכשירים מחוברים לאותו חשבון Google ("אבי בריטמן") עם:
- גיבוי אוטומטי: **כבוי** (סנכרון ידני בלבד)
- פרופיל persistent כך שה-login נשמר בין הפעלות

---

## צעדים הבאים

1. **אימות התיקון**: רענון שני הדפדפנים, ביצוע שינוי ב-device1, סנכרון ידני, ובדיקה ש:
   - "גיבוי אחרון" מתעדכן לתאריך נוכחי
   - device2 מקבל את השינוי אחרי sync
2. **הסרת instrumentation**: אחרי אימות מוצלח
3. **בדיקת edge cases**: 
   - סנכרון עם גיבוי אוטומטי מופעל
   - סנכרון דו-כיווני (שני מכשירים משנים בו-זמנית)
   - סנכרון אחרי reload (previousState מתאפס ל-globalState.state)
