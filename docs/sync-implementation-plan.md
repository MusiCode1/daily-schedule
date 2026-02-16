# תוכנית מימוש מערכת סנכרון - פירוט מלא

> **תאריך:** 2026-02-11
> **גרסה מתוכננת:** v15 → v16
> **מסמך עיצוב:** [sync-design-decisions.md](sync-design-decisions.md)

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [שלב 1: תשתית - מיגרציה v15](#2-שלב-1-תשתית---מיגרציה-v15)
3. [שלב 2: לוגיקת Diff & Merge](#3-שלב-2-לוגיקת-diff--merge)
4. [שלב 3: History.json](#4-שלב-3-historyjson)
5. [שלב 4: אינטגרציה עם Drive](#5-שלב-4-אינטגרציה-עם-drive)
6. [שלב 5: UI ומשוב](#6-שלב-5-ui-ומשוב)
7. [שלב 6: בדיקות וניקיון](#7-שלב-6-בדיקות-וניקיון)
8. [נספחים](#8-נספחים)

---

## 1. סקירה כללית

### 1.1. מטרה

מעבר ממערכת גיבוי פשוטה (last-write-wins) למערכת סנכרון מבוססת היסטוריה עם 3-way merge אוטומטי.

### 1.2. גרסה נוכחית

- **גרסה:** v14
- **מבנה:** מערכים (`Task[]`, `List[]`)
- **סנכרון:** manifest יחיד שמדרוס את הקודם
- **קונפליקטים:** last-write-wins גס (כל הקובץ)

### 1.3. גרסה מתוכננת (v15)

- **מבנה:** objects (`{ [id]: Task }`) + שדה `order`
- **היסטוריה:** `history.json` עם deltas + snapshots
- **סנכרון:** 3-way merge אוטומטי
- **UI:** אייקון סטטוס סנכרון קבוע

### 1.4. עקרונות מנחים

1. **Backward compatibility** - מיגרציה חלקה מ-v14
2. **POC first** - תחילה לוגיקה, אחר כך UI
3. **Progressive enhancement** - כל שלב עצמאי ובדיק
4. **No breaking changes** - הקוד הישן ממשיך לעבוד עד סיום

---

## 2. שלב 1: תשתית - מיגרציה v15

### 2.1. עדכון types.ts

**קובץ:** `sveltekit-version/src/lib/types.ts`

#### 2.1.1. Task - הוספת order

```typescript
export interface Task {
  id: string;
  name: string;
  imageSrc: string | null;
  isDone: boolean;
  order: number;  // ← חדש! סדר מפורש
  communicationBoardUrl?: string;
  changeType?: 'cancelled' | 'added';
}
```

#### 2.1.2. List - מעבר ל-objects

```typescript
export interface List {
  id: string;
  name: string;
  tasks: { [taskId: string]: Task };  // ← object במקום מערך!
  logo?: string;
  greeting?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  title?: string;
  description?: string;
  peopleIds?: string[];
  isPeopleSectionVisible?: boolean;
}
```

#### 2.1.3. AppState - מעבר ל-objects

> **עקרון מנחה:** כל מערך שמכיל פריטים עם `id` עובר ל-object עם מפתח `id`.
> זה מבטיח ש-jsondiffpatch ייצר דלתות נכונות (לפי מפתח, לא לפי אינדקס).

```typescript
export interface AppState {
  version: 15;  // ← עדכון גרסה
  users: { [userId: string]: UserProfile };  // ← object במקום מערך!
  lists: { [userId: string]: { [listId: string]: List } };  // ← object במקום מערך!
  images: { [imageId: string]: ImageMetadata };
  people: { [personId: string]: Person };  // ← object במקום מערך!
  activeListId: { [userId: string]: string };
  currentUserId: string | null;
  settings: Settings;
  lastModified: number;
}
```

#### 2.1.4. Settings - הוספת childLockEnabled

```typescript
export interface Settings {
  lastActiveTime: number;
  childLockEnabled: boolean;  // ← חדש! ברירת מחדל: false
}
```

### 2.2. עדכון defaults.ts

**קובץ:** `sveltekit-version/src/lib/data/defaults.ts`

#### 2.2.1. פונקציית createDefaultLists - החזרת object

```typescript
export function createDefaultLists(): { [listId: string]: List } {
  const listsArray = DEFAULT_LIST_DEFINITIONS.map((def) => {
    const tasks: { [taskId: string]: Task } = {};

    def.items.forEach((item, index) => {
      const activity = ACTIVITIES.find((a) => a.id === item.activityId);
      if (!activity) return;

      const taskId = crypto.randomUUID();
      tasks[taskId] = {
        id: taskId,
        name: activity.name,
        imageSrc: `/images/activities/${activity.image}`,
        isDone: false,
        order: index,  // ← סדר לפי אינדקס המקורי
        communicationBoardUrl: item.communicationBoardUrl
      };
    });

    return {
      id: def.id,
      name: def.name,
      logo: def.logo,
      greeting: def.greeting,
      title: def.title,
      peopleIds: def.peopleIds,
      tasks  // ← object
    };
  });

  // המרה למבנה object
  const listsObject: { [listId: string]: List } = {};
  listsArray.forEach(list => {
    listsObject[list.id] = list;
  });

  return listsObject;
}
```

#### 2.2.2. INITIAL_STATE - עדכון

```typescript
export const INITIAL_STATE: AppState = {
  version: 15,  // ← עדכון גרסה
  users: {
    u_ezra: { id: 'u_ezra', name: 'עזרא', gender: 'boy', avatar: '...', themeColor: '...' },
    u_tzofia: { id: 'u_tzofia', name: 'צופיה', gender: 'girl', avatar: '...', themeColor: '...' },
    u_adam: { id: 'u_adam', name: 'אדם', gender: 'boy', avatar: '...', themeColor: '...' }
  },  // ← object עם מפתח userId
  lists: {
    u_ezra: createDefaultLists(),
    u_tzofia: createDefaultLists(),
    u_adam: createDefaultLists()
  },  // ← כבר objects
  images: {},
  people: {},  // ← object ריק (במקום מערך ריק)
  activeListId: {...},
  currentUserId: null,
  settings: {
    lastActiveTime: Date.now(),
    childLockEnabled: false  // ← חדש!
  },
  lastModified: Date.now()
};
```

### 2.3. מיגרציה v14 → v15

**קובץ:** `sveltekit-version/src/lib/services/migration.ts`

```typescript
export const LATEST_STATE_VERSION = 15;

export const STATE_MIGRATIONS: Record<number, (state: any) => void> = {
  // ... מיגרציות קיימות (2-14)

  15: migrateToV15
};

function migrateToV15(state: any): void {
  console.log('[Migration] v14 → v15: מעבר ל-objects + order');

  // 1. המרת users ממערך ל-object
  if (Array.isArray(state.users)) {
    const newUsers: { [userId: string]: any } = {};
    state.users.forEach((user: any) => {
      newUsers[user.id] = user;
    });
    state.users = newUsers;
  }

  // 2. המרת people ממערך ל-object
  if (Array.isArray(state.people)) {
    const newPeople: { [personId: string]: any } = {};
    state.people.forEach((person: any) => {
      newPeople[person.id] = person;
    });
    state.people = newPeople;
  }

  // 3. המרת lists ממערך ל-object
  if (state.lists) {
    const newLists: { [userId: string]: { [listId: string]: any } } = {};

    Object.keys(state.lists).forEach(userId => {
      const userLists = state.lists[userId];

      if (Array.isArray(userLists)) {
        // זה מערך - צריך המרה
        newLists[userId] = {};
        userLists.forEach(list => {
          newLists[userId][list.id] = list;
        });
      } else {
        // כבר object (אולי מיגרציה חלקית?)
        newLists[userId] = userLists;
      }
    });

    state.lists = newLists;
  }

  // 4. המרת tasks ממערך ל-object + הוספת order
  if (state.lists) {
    Object.keys(state.lists).forEach(userId => {
      const userLists = state.lists[userId];

      Object.keys(userLists).forEach(listId => {
        const list = userLists[listId];

        if (Array.isArray(list.tasks)) {
          // זה מערך - צריך המרה
          const newTasks: { [taskId: string]: any } = {};

          list.tasks.forEach((task: any, index: number) => {
            newTasks[task.id] = {
              ...task,
              order: task.order ?? index  // אם אין order, השתמש באינדקס
            };
          });

          list.tasks = newTasks;
        } else {
          // כבר object - רק ודא שיש order
          Object.values(list.tasks).forEach((task: any, index: number) => {
            if (task.order === undefined) {
              task.order = index;
            }
          });
        }
      });
    });
  }

  // 5. הוספת childLockEnabled ל-settings
  if (!state.settings) {
    state.settings = {};
  }

  if (state.settings.childLockEnabled === undefined) {
    state.settings.childLockEnabled = false;
  }

  // 6. עדכון גרסה
  state.version = 15;
}
```

### 2.4. עדכון קוד שעובד עם tasks/lists/users/people

**עיקרון:** כל מערך עם `id` הופך ל-object. כל `array.find(x => x.id === id)` הופך ל-`object[id]`.

**קבצים שצריך לעדכן:**

1. **Stores** - `userStore`, `peopleStore`, `listStore` — כל הגישות למערכים
2. **Controllers** - כל מקום שמשתמש ב-`list.tasks`, `state.lists[userId]`, `state.users`, `state.people`
3. **Components** - כל `{#each array as item}` → `{#each Object.values(object) as item}`
4. **Logic** - מיון לפי `order` במקום אינדקס (ב-tasks)

#### דוגמה: UserStore

```typescript
// לפני
get currentUser() { return this.users.find(u => u.id === this.currentUserId); }
addUser(userData) { state.users.push(newUser); }
deleteUser(id) { state.users = state.users.filter(u => u.id !== id); }

// אחרי
get currentUser() { return this.currentUserId ? state.users[this.currentUserId] : null; }
addUser(userData) { state.users[newUser.id] = newUser; }
deleteUser(id) { delete state.users[id]; }
```

#### דוגמה: PeopleStore

```typescript
// לפני
getPerson(id) { return state.people.find(p => p.id === id); }
getAllPeople() { return state.people; }
addPerson(name, avatar) { state.people.push(newPerson); }
deletePerson(id) { state.people = state.people.filter(p => p.id !== id); }

// אחרי
getPerson(id) { return state.people[id]; }
getAllPeople() { return Object.values(state.people); }
addPerson(name, avatar) { state.people[newPerson.id] = newPerson; }
deletePerson(id) { delete state.people[id]; }
```

#### דוגמה: Components (Svelte)

```svelte
<!-- לפני -->
{#each users as user (user.id)}

<!-- אחרי -->
{#each Object.values(users) as user (user.id)}
```

#### דוגמה: TasksBoardController

```typescript
// לפני
const tasks = list.tasks;  // Task[]

// אחרי
const tasks = Object.values(list.tasks).sort((a, b) => a.order - b.order);
```

#### דוגמה: הוספת משימה

```typescript
// לפני
function addTask(listId: string, task: Task) {
  const list = getList(listId);
  list.tasks.push(task);
}

// אחרי
function addTask(listId: string, task: Task) {
  const list = getList(listId);
  const maxOrder = Math.max(
    ...Object.values(list.tasks).map(t => t.order),
    -1
  );
  task.order = maxOrder + 1;
  list.tasks[task.id] = task;
}
```

#### דוגמה: מחיקת משימה

```typescript
// לפני
function deleteTask(listId: string, taskId: string) {
  const list = getList(listId);
  list.tasks = list.tasks.filter(t => t.id !== taskId);
}

// אחרי
function deleteTask(listId: string, taskId: string) {
  const list = getList(listId);
  delete list.tasks[taskId];
  // נורמליזציה של order (אופציונלי)
  normalizeTaskOrder(list.tasks);
}
```

### 2.5. בדיקה

**טסטים ידניים:**

1. ✅ טעינת אפליקציה עם נתונים ישנים (v14) - המיגרציה רצה?
2. ✅ הצגת רשימות - הסדר נשמר?
3. ✅ הוספת משימה - `order` נכון?
4. ✅ מחיקת משימה - עובד?
5. ✅ גרירת משימה (drag & drop) - `order` מתעדכן?

**בדיקת מיגרציה:**

```typescript
// test/migration.test.ts
import { migrateToV15 } from '$lib/services/migration';

test('migrateToV15: מערך → object', () => {
  const oldState = {
    version: 14,
    users: [
      { id: 'u_ezra', name: 'עזרא', gender: 'boy', avatar: '', themeColor: '#000' }
    ],
    people: [
      { id: 'p1', name: 'יוסי', avatar: '' }
    ],
    lists: {
      u_ezra: [
        { id: 'list1', tasks: [
          { id: 'task1', name: 'משימה 1' },
          { id: 'task2', name: 'משימה 2' }
        ]}
      ]
    },
    settings: { lastActiveTime: 123 }
  };

  migrateToV15(oldState);

  expect(oldState.version).toBe(15);

  // users: מערך → object
  expect(oldState.users).toBeInstanceOf(Object);
  expect(oldState.users.u_ezra.name).toBe('עזרא');

  // people: מערך → object
  expect(oldState.people).toBeInstanceOf(Object);
  expect(oldState.people.p1.name).toBe('יוסי');

  // lists: מערך → object
  expect(oldState.lists.u_ezra).toBeInstanceOf(Object);
  expect(oldState.lists.u_ezra.list1.tasks).toBeInstanceOf(Object);
  expect(oldState.lists.u_ezra.list1.tasks.task1.order).toBe(0);
  expect(oldState.lists.u_ezra.list1.tasks.task2.order).toBe(1);
  expect(oldState.settings.childLockEnabled).toBe(false);
});
```

---

## 3. שלב 2: לוגיקת Diff & Merge

### 3.1. התקנת jsondiffpatch

```bash
npm install jsondiffpatch
npm install --save-dev @types/jsondiffpatch
```

### 3.2. יצירת syncEngine.ts

**קובץ:** `sveltekit-version/src/lib/services/sync/syncEngine.ts`

```typescript
import * as jsondiffpatch from 'jsondiffpatch';
import type { ContentV2 } from '$lib/services/drive/types';

const TAG = '[SyncEngine]';

// יצירת differ עם הגדרות מותאמות
const differ = jsondiffpatch.create({
  // objectHash: (obj: any) => obj.id,  // לא צריך - כבר objects!
  arrays: {
    detectMove: true,  // זיהוי תזוזות (drag & drop)
    includeValueOnMove: false
  },
  textDiff: {
    minLength: 60  // diff טקסט רק למחרוזות ארוכות
  }
});

/**
 * חישוב delta בין שני states
 */
export function calculateDelta(
  oldState: ContentV2,
  newState: ContentV2
): object | undefined {
  const delta = differ.diff(oldState, newState);

  if (!delta) {
    console.log(TAG, 'אין שינויים בין הגרסאות');
    return undefined;
  }

  console.log(TAG, 'Delta מחושב:', delta);
  return delta;
}

/**
 * החלת delta על state
 */
export function applyDelta(
  baseState: ContentV2,
  delta: object
): ContentV2 {
  const result = differ.patch(
    JSON.parse(JSON.stringify(baseState)),  // clone עמוק
    delta
  );

  console.log(TAG, 'Delta הוחל בהצלחה');
  return result as ContentV2;
}

/**
 * 3-way merge - המוח של המערכת
 *
 * @param common - common ancestor
 * @param local - שינויים מקומיים
 * @param remote - שינויים מרוחקים
 * @returns state ממוזג
 */
export function threeWayMerge(
  common: ContentV2,
  local: ContentV2,
  remote: ContentV2
): ContentV2 {
  console.log(TAG, '3-way merge מתחיל...');

  // 1. חישוב דלתות
  const deltaLocal = differ.diff(common, local);
  const deltaRemote = differ.diff(common, remote);

  if (!deltaLocal && !deltaRemote) {
    console.log(TAG, 'אין שינויים בשני הצדדים');
    return common;
  }

  if (!deltaLocal) {
    console.log(TAG, 'רק remote השתנה');
    return remote;
  }

  if (!deltaRemote) {
    console.log(TAG, 'רק local השתנה');
    return local;
  }

  // 2. ניסיון למזג
  console.log(TAG, 'שני הצדדים השתנו - מבצע merge');

  // התחל מ-common
  let merged = JSON.parse(JSON.stringify(common));

  // החל את deltaRemote
  merged = differ.patch(merged, deltaRemote);

  // נסה להחיל את deltaLocal
  try {
    merged = differ.patch(merged, deltaLocal);
    console.log(TAG, 'Merge הצליח ללא קונפליקטים');
  } catch (error) {
    console.warn(TAG, 'קונפליקט זוהה, משתמש ב-last-write-wins', error);

    // במקרה של קונפליקט - last-write-wins
    // נבדוק timestamps (צריך להוסיף לכל entry ב-history)
    merged = local.lastModified > remote.lastModified ? local : remote;
  }

  // 3. נורמליזציה של order
  normalizeMergedState(merged);

  return merged;
}

/**
 * נורמליזציה של order אחרי merge
 * מטפל בכפילויות ופערים
 */
function normalizeMergedState(state: ContentV2): void {
  console.log(TAG, 'מנרמל order...');

  // עבור כל משתמש
  Object.keys(state.lists).forEach(userId => {
    const userLists = state.lists[userId];

    // עבור כל רשימה
    Object.values(userLists).forEach((list: any) => {
      const tasks = Object.values(list.tasks);

      // מיין לפי order, אם שוויון → לפי id
      tasks.sort((a: any, b: any) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });

      // עדכן order להיות רציף: 0, 1, 2, 3...
      tasks.forEach((task: any, index: number) => {
        task.order = index;
      });
    });
  });

  console.log(TAG, 'נורמליזציה הסתיימה');
}

/**
 * בדיקה אם state A ו-B זהים (ללא timestamp)
 */
export function areStatesEqual(a: ContentV2, b: ContentV2): boolean {
  const aCopy = { ...a };
  const bCopy = { ...b };

  // התעלם מ-timestamps
  delete (aCopy as any).lastModified;
  delete (bCopy as any).lastModified;

  return JSON.stringify(aCopy) === JSON.stringify(bCopy);
}
```

### 3.3. בדיקות יחידה

**קובץ:** `sveltekit-version/src/lib/services/sync/syncEngine.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import {
  calculateDelta,
  applyDelta,
  threeWayMerge
} from './syncEngine';

describe('syncEngine', () => {
  test('calculateDelta: זיהוי שינוי פשוט', () => {
    const old = { name: 'ישן', value: 1 };
    const new_ = { name: 'חדש', value: 1 };

    const delta = calculateDelta(old as any, new_ as any);

    expect(delta).toBeDefined();
    expect(delta).toHaveProperty('name');
  });

  test('applyDelta: החלת delta', () => {
    const base = { name: 'ישן', value: 1 };
    const delta = { name: ['ישן', 'חדש'] };  // jsondiffpatch format

    const result = applyDelta(base as any, delta);

    expect(result.name).toBe('חדש');
    expect(result.value).toBe(1);
  });

  test('threeWayMerge: שינויים שונים', () => {
    const common = {
      lists: {
        u1: {
          list1: {
            tasks: {
              task1: { id: 'task1', name: 'משימה 1', order: 0 }
            }
          }
        }
      }
    };

    const local = {
      lists: {
        u1: {
          list1: {
            tasks: {
              task1: { id: 'task1', name: 'משימה 1', order: 0 },
              task2: { id: 'task2', name: 'משימה 2', order: 1 }  // הוסיף
            }
          }
        }
      }
    };

    const remote = {
      lists: {
        u1: {
          list1: {
            tasks: {
              task1: { id: 'task1', name: 'משימה 1 - ערוך', order: 0 }  // ערך
            }
          }
        }
      }
    };

    const merged = threeWayMerge(common as any, local as any, remote as any);

    // ציפייה: שני השינויים
    expect(merged.lists.u1.list1.tasks.task1.name).toBe('משימה 1 - ערוך');
    expect(merged.lists.u1.list1.tasks.task2).toBeDefined();
  });

  test('threeWayMerge: קונפליקט - last-write-wins', () => {
    const common = {
      lists: { u1: { list1: { tasks: { task1: { name: 'ישן', order: 0 } } } } },
      lastModified: 1000
    };

    const local = {
      lists: { u1: { list1: { tasks: { task1: { name: 'מקומי', order: 0 } } } } },
      lastModified: 2000  // יותר חדש
    };

    const remote = {
      lists: { u1: { list1: { tasks: { task1: { name: 'מרוחק', order: 0 } } } } },
      lastModified: 1500
    };

    const merged = threeWayMerge(common as any, local as any, remote as any);

    // ציפייה: local מנצח (timestamp גבוה יותר)
    expect(merged.lists.u1.list1.tasks.task1.name).toBe('מקומי');
  });
});
```

---

## 4. שלב 3: History.json

### 4.1. טייפים

**קובץ:** `sveltekit-version/src/lib/services/sync/types.ts`

```typescript
import type { ContentV2 } from '$lib/services/drive/types';

/**
 * מבנה history.json - שומר את כל הדלתות וה-snapshots
 */
export interface SyncHistory {
  backupSchemaVersion: number;  // גרסת סכמת הגיבוי
  entries: HistoryEntry[];       // רשימת entries כרונולוגית
}

/**
 * Entry יחיד בהיסטוריה
 */
export type HistoryEntry = SnapshotEntry | DeltaEntry;

/**
 * Snapshot מלא - נקודת ציון
 */
export interface SnapshotEntry {
  type: 'snapshot';
  writeId: string;              // UUID ייחודי לגרסה זו
  parentWriteId: string | null; // writeId של ההורה (null = genesis)
  timestamp: number;             // Date.now()
  deviceId: string;              // מזהה המכשיר שיצר
  deviceName: string;            // שם המכשיר (לUI)
  state: ContentV2;              // State מלא!
}

/**
 * Delta - רק השינויים
 */
export interface DeltaEntry {
  type: 'delta';
  writeId: string;
  parentWriteId: string;         // חובה! (לא null)
  timestamp: number;
  deviceId: string;
  deviceName: string;
  delta: object;                 // jsondiffpatch delta
}

/**
 * תוצאת חיפוש common ancestor
 */
export interface CommonAncestorResult {
  found: boolean;
  writeId: string | null;
  entry: HistoryEntry | null;
  state: ContentV2 | null;       // state משוחזר (snapshot או snapshot + deltas)
}
```

### 4.2. historyManager.ts

**קובץ:** `sveltekit-version/src/lib/services/sync/historyManager.ts`

```typescript
import type {
  SyncHistory,
  HistoryEntry,
  SnapshotEntry,
  DeltaEntry,
  CommonAncestorResult
} from './types';
import type { ContentV2 } from '$lib/services/drive/types';
import { applyDelta } from './syncEngine';

const TAG = '[HistoryManager]';
const SNAPSHOT_INTERVAL = 20;  // snapshot כל 20 גרסאות

/**
 * יצירת history ריק (genesis)
 */
export function createEmptyHistory(): SyncHistory {
  return {
    backupSchemaVersion: 3,  // גרסה חדשה (2 היא הנוכחית)
    entries: []
  };
}

/**
 * הוספת entry להיסטוריה
 */
export function appendToHistory(
  history: SyncHistory,
  entry: HistoryEntry
): void {
  history.entries.push(entry);
  console.log(TAG, `Entry נוסף: ${entry.type} (writeId: ${entry.writeId})`);
}

/**
 * החלטה אם ליצור snapshot או delta
 */
export function shouldCreateSnapshot(history: SyncHistory): boolean {
  // אם אין entries → genesis snapshot
  if (history.entries.length === 0) {
    return true;
  }

  // מצא את ה-snapshot האחרון
  const lastSnapshotIndex = history.entries
    .map((e, i) => ({ e, i }))
    .reverse()
    .find(({ e }) => e.type === 'snapshot')?.i;

  if (lastSnapshotIndex === undefined) {
    // אין snapshot בכלל? (לא אמור לקרות אחרי genesis)
    return true;
  }

  // כמה deltas מאז ה-snapshot האחרון?
  const deltasSinceSnapshot = history.entries.length - lastSnapshotIndex - 1;

  return deltasSinceSnapshot >= SNAPSHOT_INTERVAL;
}

/**
 * חיפוש writeId בהיסטוריה
 */
export function findEntryByWriteId(
  history: SyncHistory,
  writeId: string
): HistoryEntry | null {
  return history.entries.find(e => e.writeId === writeId) || null;
}

/**
 * מציאת common ancestor - המוח של המערכת!
 *
 * @param history - ההיסטוריה המשותפת
 * @param localWriteId - writeId מקומי
 * @param remoteWriteId - writeId מרוחק
 * @returns common ancestor + state משוחזר
 */
export function findCommonAncestor(
  history: SyncHistory,
  localWriteId: string,
  remoteWriteId: string
): CommonAncestorResult {
  console.log(TAG, `מחפש common ancestor בין ${localWriteId} ל-${remoteWriteId}`);

  // 1. בנה שרשרת עבור local
  const localChain = buildChain(history, localWriteId);

  // 2. בנה שרשרת עבור remote
  const remoteChain = buildChain(history, remoteWriteId);

  if (!localChain || !remoteChain) {
    console.error(TAG, 'לא הצלחתי לבנות שרשרת');
    return { found: false, writeId: null, entry: null, state: null };
  }

  // 3. מצא את ה-writeId המשותף הראשון
  const commonWriteId = localChain.find(id => remoteChain.includes(id));

  if (!commonWriteId) {
    console.error(TAG, 'אין common ancestor!');
    return { found: false, writeId: null, entry: null, state: null };
  }

  console.log(TAG, `Common ancestor נמצא: ${commonWriteId}`);

  // 4. שחזר את ה-state של ה-ancestor
  const entry = findEntryByWriteId(history, commonWriteId);
  if (!entry) {
    console.error(TAG, 'Entry לא נמצא (לא אמור לקרות)');
    return { found: false, writeId: commonWriteId, entry: null, state: null };
  }

  const state = reconstructState(history, commonWriteId);

  return { found: true, writeId: commonWriteId, entry, state };
}

/**
 * בניית שרשרת writeIds מ-writeId נתון עד genesis
 *
 * @returns [writeId, parent, grandparent, ..., genesis]
 */
function buildChain(
  history: SyncHistory,
  writeId: string
): string[] | null {
  const chain: string[] = [];
  let currentId: string | null = writeId;

  while (currentId) {
    const entry = findEntryByWriteId(history, currentId);

    if (!entry) {
      console.error(TAG, `Entry לא נמצא: ${currentId}`);
      return null;
    }

    chain.push(currentId);
    currentId = entry.parentWriteId;
  }

  return chain;
}

/**
 * שחזור state מהיסטוריה
 *
 * @param history - ההיסטוריה
 * @param writeId - writeId לשחזור
 * @returns state משוחזר
 */
export function reconstructState(
  history: SyncHistory,
  writeId: string
): ContentV2 | null {
  console.log(TAG, `משחזר state עבור writeId: ${writeId}`);

  // 1. מצא את ה-entry
  const targetEntry = findEntryByWriteId(history, writeId);
  if (!targetEntry) {
    console.error(TAG, 'Entry לא נמצא');
    return null;
  }

  // 2. אם זה snapshot - החזר ישירות
  if (targetEntry.type === 'snapshot') {
    console.log(TAG, 'זה snapshot - מחזיר ישירות');
    return targetEntry.state;
  }

  // 3. זה delta - צריך למצוא snapshot קודם
  const chain = buildChain(history, writeId);
  if (!chain) {
    console.error(TAG, 'לא הצלחתי לבנות שרשרת');
    return null;
  }

  // 4. מצא את ה-snapshot הראשון בשרשרת (מהסוף)
  const snapshotWriteId = chain.reverse().find(id => {
    const entry = findEntryByWriteId(history, id);
    return entry?.type === 'snapshot';
  });

  if (!snapshotWriteId) {
    console.error(TAG, 'אין snapshot בשרשרת');
    return null;
  }

  const snapshotEntry = findEntryByWriteId(history, snapshotWriteId) as SnapshotEntry;
  let state: ContentV2 = snapshotEntry.state;

  console.log(TAG, `מתחיל מ-snapshot: ${snapshotWriteId}`);

  // 5. החל את כל ה-deltas מהסנפשוט עד ה-target
  const snapshotIndex = history.entries.findIndex(e => e.writeId === snapshotWriteId);
  const targetIndex = history.entries.findIndex(e => e.writeId === writeId);

  for (let i = snapshotIndex + 1; i <= targetIndex; i++) {
    const entry = history.entries[i];

    if (entry.type === 'delta') {
      console.log(TAG, `מחיל delta: ${entry.writeId}`);
      state = applyDelta(state, entry.delta);
    }
  }

  console.log(TAG, 'State שוחזר בהצלחה');
  return state;
}

/**
 * מיזוג שתי היסטוריות (מטא-קונפליקט)
 * קורה כשבשני המכשירים הוסיפו entries בזמן שהיו offline
 */
export function mergeHistories(
  localHistory: SyncHistory,
  remoteHistory: SyncHistory
): SyncHistory {
  console.log(TAG, 'ממזג שתי היסטוריות...');

  // 1. מצא entries שיש רק ב-remote
  const localWriteIds = new Set(localHistory.entries.map(e => e.writeId));
  const newEntries = remoteHistory.entries.filter(e => !localWriteIds.has(e.writeId));

  console.log(TAG, `נמצאו ${newEntries.length} entries חדשים מ-remote`);

  // 2. הוסף אותם ל-local
  const merged: SyncHistory = {
    backupSchemaVersion: Math.max(
      localHistory.backupSchemaVersion,
      remoteHistory.backupSchemaVersion
    ),
    entries: [...localHistory.entries, ...newEntries]
  };

  // 3. מיין לפי timestamp
  merged.entries.sort((a, b) => a.timestamp - b.timestamp);

  console.log(TAG, `היסטוריה ממוזגת: ${merged.entries.length} entries`);

  return merged;
}
```

### 4.3. בדיקות

```typescript
// historyManager.test.ts
import { describe, test, expect } from 'vitest';
import {
  createEmptyHistory,
  appendToHistory,
  shouldCreateSnapshot,
  findCommonAncestor,
  reconstructState
} from './historyManager';

describe('historyManager', () => {
  test('createEmptyHistory', () => {
    const history = createEmptyHistory();
    expect(history.entries).toHaveLength(0);
  });

  test('shouldCreateSnapshot: genesis', () => {
    const history = createEmptyHistory();
    expect(shouldCreateSnapshot(history)).toBe(true);
  });

  test('shouldCreateSnapshot: אחרי 20 deltas', () => {
    const history = createEmptyHistory();

    // הוסף snapshot
    appendToHistory(history, {
      type: 'snapshot',
      writeId: 's1',
      parentWriteId: null,
      timestamp: 1000,
      deviceId: 'd1',
      deviceName: 'Device 1',
      state: {} as any
    });

    // הוסף 19 deltas
    for (let i = 0; i < 19; i++) {
      appendToHistory(history, {
        type: 'delta',
        writeId: `d${i}`,
        parentWriteId: i === 0 ? 's1' : `d${i - 1}`,
        timestamp: 1000 + i,
        deviceId: 'd1',
        deviceName: 'Device 1',
        delta: {}
      });
    }

    expect(shouldCreateSnapshot(history)).toBe(false);  // עדיין 19

    // הוסף עוד אחד
    appendToHistory(history, {
      type: 'delta',
      writeId: 'd19',
      parentWriteId: 'd18',
      timestamp: 1019,
      deviceId: 'd1',
      deviceName: 'Device 1',
      delta: {}
    });

    expect(shouldCreateSnapshot(history)).toBe(true);  // 20 - זמן ל-snapshot
  });

  test('findCommonAncestor: שרשרת פשוטה', () => {
    const history = createEmptyHistory();

    // Genesis snapshot
    appendToHistory(history, {
      type: 'snapshot',
      writeId: 'genesis',
      parentWriteId: null,
      timestamp: 1000,
      deviceId: 'd1',
      deviceName: 'Device 1',
      state: { name: 'genesis' } as any
    });

    // Delta 1
    appendToHistory(history, {
      type: 'delta',
      writeId: 'd1',
      parentWriteId: 'genesis',
      timestamp: 2000,
      deviceId: 'd1',
      deviceName: 'Device 1',
      delta: {}
    });

    // Delta 2 (מכשיר A)
    appendToHistory(history, {
      type: 'delta',
      writeId: 'd2a',
      parentWriteId: 'd1',
      timestamp: 3000,
      deviceId: 'd1',
      deviceName: 'Device 1',
      delta: {}
    });

    // Delta 2 (מכשיר B)
    appendToHistory(history, {
      type: 'delta',
      writeId: 'd2b',
      parentWriteId: 'd1',
      timestamp: 3001,
      deviceId: 'd2',
      deviceName: 'Device 2',
      delta: {}
    });

    const result = findCommonAncestor(history, 'd2a', 'd2b');

    expect(result.found).toBe(true);
    expect(result.writeId).toBe('d1');
  });
});
```

---

## 5. שלב 4: אינטגרציה עם Drive

### 5.1. עדכון driveFilesApi.ts

**קובץ:** `sveltekit-version/src/lib/services/drive/driveFilesApi.ts`

הוסף פונקציות לטיפול ב-history.json:

```typescript
const HISTORY_FILENAME = 'daily_schedule_history.json';

/**
 * קריאת history.json
 */
export async function readHistoryJson(
  folderId: string
): Promise<SyncHistory | null> {
  console.log(TAG, 'קורא history.json...');

  try {
    // חפש את הקובץ
    const files = await listFiles({
      folderId,
      query: `name = '${HISTORY_FILENAME}' and trashed = false`
    });

    if (files.length === 0) {
      console.log(TAG, 'history.json לא קיים - זו הפעם הראשונה');
      return null;
    }

    const fileId = files[0].id;
    const content = await downloadFile(fileId);

    return JSON.parse(content);
  } catch (error) {
    console.error(TAG, 'שגיאה בקריאת history.json:', error);
    throw error;
  }
}

/**
 * כתיבת history.json
 */
export async function writeHistoryJson(
  folderId: string,
  history: SyncHistory,
  existingFileId?: string
): Promise<{ fileId: string }> {
  console.log(TAG, 'כותב history.json...');

  const content = JSON.stringify(history, null, 2);
  const blob = new Blob([content], { type: 'application/json' });

  if (existingFileId) {
    // עדכון
    await updateFile(existingFileId, blob);
    return { fileId: existingFileId };
  } else {
    // יצירה
    const fileId = await uploadFile({
      name: HISTORY_FILENAME,
      mimeType: 'application/json',
      blob,
      folderId
    });

    return { fileId };
  }
}
```

### 5.2. עדכון driveBackupV2.ts

**קובץ:** `sveltekit-version/src/lib/services/drive/driveBackupV2.ts`

שילוב ההיסטוריה בגיבוי:

```typescript
import {
  createEmptyHistory,
  appendToHistory,
  shouldCreateSnapshot,
  findCommonAncestor,
  reconstructState,
  mergeHistories
} from '$lib/services/sync/historyManager';
import { calculateDelta, threeWayMerge } from '$lib/services/sync/syncEngine';
import type { HistoryEntry, SnapshotEntry, DeltaEntry } from '$lib/services/sync/types';

/**
 * גיבוי עם היסטוריה
 */
export async function backupWithHistory(params: {
  state: AppState;
  repo: BackupV2Repo;
  db: BackupV2Db;
  device: BackupV2DeviceInfo;
  lastKnownWriteId: string | null;
  onProgress?: (progress: number) => void;
}): Promise<{ success: boolean; writeId: string }> {
  const { state, repo, device, lastKnownWriteId, onProgress } = params;

  console.log(TAG, 'מתחיל גיבוי עם היסטוריה...');

  try {
    // 1. הבטחת מבנה
    const structure = await repo.ensureStructure();

    // 2. קריאת היסטוריה קיימת
    let history = await readHistoryJson(structure.backupFolderId);

    if (!history) {
      console.log(TAG, 'יוצר history ריק (genesis)');
      history = createEmptyHistory();
    }

    // 3. בניית ContentV2 מהמצב הנוכחי
    const currentContent = buildContentPayload(state);

    // 4. האם צריך snapshot או delta?
    const needSnapshot = shouldCreateSnapshot(history);
    const newWriteId = crypto.randomUUID();

    let entry: HistoryEntry;

    if (needSnapshot) {
      console.log(TAG, 'יוצר snapshot');

      entry = {
        type: 'snapshot',
        writeId: newWriteId,
        parentWriteId: lastKnownWriteId,
        timestamp: Date.now(),
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        state: currentContent
      } as SnapshotEntry;
    } else {
      console.log(TAG, 'יוצר delta');

      // מצא את הגרסה הקודמת
      const previousState = lastKnownWriteId
        ? reconstructState(history, lastKnownWriteId)
        : null;

      if (!previousState) {
        console.error(TAG, 'לא הצלחתי לשחזר מצב קודם - fallback ל-snapshot');
        entry = {
          type: 'snapshot',
          writeId: newWriteId,
          parentWriteId: lastKnownWriteId,
          timestamp: Date.now(),
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          state: currentContent
        } as SnapshotEntry;
      } else {
        const delta = calculateDelta(previousState, currentContent);

        if (!delta) {
          console.log(TAG, 'אין שינויים - מדלג על גיבוי');
          return { success: true, writeId: lastKnownWriteId || 'no-change' };
        }

        entry = {
          type: 'delta',
          writeId: newWriteId,
          parentWriteId: lastKnownWriteId!,
          timestamp: Date.now(),
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          delta
        } as DeltaEntry;
      }
    }

    // 5. הוספת entry להיסטוריה
    appendToHistory(history, entry);

    // 6. שמירת קבצים ל-Drive
    onProgress?.(0.3);

    // שמור content.json
    await repo.writeJson(structure.contentFileId, currentContent, {
      onProgress: (p) => onProgress?.(0.3 + p * 0.2)
    });

    onProgress?.(0.5);

    // שמור history.json
    await writeHistoryJson(structure.backupFolderId, history, structure.historyFileId);

    onProgress?.(0.8);

    // שמור progress.json (ללא שינוי - last-write-wins)
    const progressPayload = buildProgressPayload(state);
    await repo.writeJson(structure.progressFileId, progressPayload, {
      onProgress: (p) => onProgress?.(0.8 + p * 0.2)
    });

    onProgress?.(1.0);

    console.log(TAG, `גיבוי הצליח! writeId: ${newWriteId}`);

    return { success: true, writeId: newWriteId };
  } catch (error) {
    console.error(TAG, 'שגיאה בגיבוי:', error);
    throw error;
  }
}

/**
 * שחזור עם merge
 */
export async function restoreWithMerge(params: {
  repo: BackupV2Repo;
  db: BackupV2Db;
  localState: AppState;
  localWriteId: string | null;
  onProgress?: (progress: number) => void;
}): Promise<AppState> {
  const { repo, db, localState, localWriteId, onProgress } = params;

  console.log(TAG, 'משחזר עם merge...');

  try {
    const structure = await repo.ensureStructure();

    onProgress?.(0.1);

    // 1. קרא קבצים מ-Drive
    const [remoteContent, remoteHistory, remoteProgress] = await Promise.all([
      repo.readJson(structure.contentFileId),
      readHistoryJson(structure.backupFolderId),
      repo.readJson(structure.progressFileId)
    ]);

    onProgress?.(0.3);

    if (!remoteHistory) {
      console.log(TAG, 'אין היסטוריה remote - זה גיבוי ראשון');
      return localState;  // אין מה למזג
    }

    // 2. מצא common ancestor
    const remoteWriteId = remoteHistory.entries[remoteHistory.entries.length - 1]?.writeId;

    if (!remoteWriteId) {
      console.error(TAG, 'אין writeId remote');
      return localState;
    }

    if (!localWriteId) {
      console.log(TAG, 'אין writeId מקומי - זו הפעם הראשונה');
      // פשוט השתמש ב-remote
      return hydrateAppState(remoteContent, remoteProgress, db);
    }

    onProgress?.(0.5);

    const ancestorResult = findCommonAncestor(remoteHistory, localWriteId, remoteWriteId);

    if (!ancestorResult.found || !ancestorResult.state) {
      console.error(TAG, 'לא נמצא common ancestor - משתמש ב-last-write-wins');

      // fallback: last-write-wins לפי timestamp
      const localContent = buildContentPayload(localState);
      const merged = localContent.lastModified > remoteContent.lastModified
        ? localContent
        : remoteContent;

      return hydrateAppState(merged, remoteProgress, db);
    }

    onProgress?.(0.7);

    // 3. בצע 3-way merge
    const localContent = buildContentPayload(localState);
    const mergedContent = threeWayMerge(
      ancestorResult.state,
      localContent,
      remoteContent
    );

    onProgress?.(0.9);

    // 4. hydrate ל-AppState
    const mergedState = await hydrateAppState(mergedContent, remoteProgress, db);

    onProgress?.(1.0);

    console.log(TAG, 'Merge הושלם בהצלחה');

    return mergedState;
  } catch (error) {
    console.error(TAG, 'שגיאה בשחזור:', error);
    throw error;
  }
}
```

### 5.3. ETags + Retry Logic

```typescript
/**
 * העלאה עם ETag לזיהוי קונפליקטים
 */
async function uploadWithETag(
  fileId: string,
  content: any,
  etag: string | null,
  maxRetries: number = 10
): Promise<{ success: boolean; newEtag: string | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(etag ? { 'If-Match': etag } : {})
          },
          body: JSON.stringify(content)
        }
      );

      if (response.status === 412) {
        // Precondition Failed - מישהו כתב בינתיים
        console.warn(TAG, `קונפליקט זוהה (ניסיון ${attempt}/${maxRetries})`);

        // הורד מחדש, מזג, נסה שוב
        // ... (לוגיקה של merge)

        continue;  // נסה שוב
      }

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const newEtag = response.headers.get('ETag');
      return { success: true, newEtag };

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(TAG, `ניסיון ${attempt} נכשל, ממתין ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, newEtag: null };
}
```

---

## 6. שלב 5: UI ומשוב

### 6.1. אייקון סטטוס סנכרון

**קומפוננטה:** `sveltekit-version/src/lib/components/SyncStatusIndicator.svelte`

```svelte
<script lang="ts">
  import { syncStatus } from '$lib/stores/syncStore';

  type Status = 'synced' | 'syncing' | 'error' | 'offline';

  let showDetails = $state(false);

  const statusConfig: Record<Status, { icon: string; color: string; label: string }> = {
    synced: { icon: '🟢', color: 'text-green-600', label: 'מסונכרן' },
    syncing: { icon: '🟡', color: 'text-yellow-600', label: 'מסנכרן...' },
    error: { icon: '🔴', color: 'text-red-600', label: 'שגיאה' },
    offline: { icon: '⚪', color: 'text-gray-400', label: 'לא מקוון' }
  };

  $effect(() => {
    console.log('[SyncStatus]', $syncStatus);
  });
</script>

<div class="fixed top-4 left-4 z-50">
  <button
    class="sync-status-button"
    onclick={() => (showDetails = !showDetails)}
    title={statusConfig[$syncStatus.status].label}
  >
    <span class="text-2xl">{statusConfig[$syncStatus.status].icon}</span>
  </button>

  {#if showDetails}
    <div class="sync-details-modal">
      <h3 class="font-bold mb-2">סטטוס סנכרון</h3>

      <div class="space-y-2">
        <div>
          <span class="font-medium">מצב:</span>
          <span class={statusConfig[$syncStatus.status].color}>
            {statusConfig[$syncStatus.status].label}
          </span>
        </div>

        {#if $syncStatus.lastSyncTime}
          <div>
            <span class="font-medium">סנכרון אחרון:</span>
            <span>{formatTimeAgo($syncStatus.lastSyncTime)}</span>
          </div>
        {/if}

        {#if $syncStatus.status === 'error' && $syncStatus.retryAttempt}
          <div>
            <span class="font-medium">ניסיון:</span>
            <span>{$syncStatus.retryAttempt} / 10</span>
          </div>

          {#if $syncStatus.nextRetryIn}
            <div>
              <span class="font-medium">ניסיון הבא בעוד:</span>
              <span>{$syncStatus.nextRetryIn}s</span>
            </div>
          {/if}
        {/if}

        {#if $syncStatus.pendingChanges > 0}
          <div>
            <span class="font-medium">שינויים מקומיים:</span>
            <span>{$syncStatus.pendingChanges}</span>
          </div>
        {/if}
      </div>

      <button
        class="mt-4 btn btn-sm btn-primary"
        onclick={() => (showDetails = false)}
      >
        סגור
      </button>
    </div>
  {/if}
</div>

<style>
  @reference "tailwindcss";

  .sync-status-button {
    @apply w-12 h-12 rounded-full bg-white shadow-lg
           flex items-center justify-center
           hover:scale-110 transition-transform cursor-pointer;
  }

  .sync-details-modal {
    @apply absolute top-14 left-0 bg-white rounded-lg shadow-xl
           p-4 w-64 border border-gray-200;
  }
</style>
```

### 6.2. SyncStore

**Store:** `sveltekit-version/src/lib/stores/syncStore.ts`

```typescript
import { writable } from 'svelte/store';

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'error' | 'offline';
  lastSyncTime: number | null;
  retryAttempt: number | null;
  nextRetryIn: number | null;  // שניות
  pendingChanges: number;
  lastError: string | null;
}

const initialStatus: SyncStatus = {
  status: 'offline',
  lastSyncTime: null,
  retryAttempt: null,
  nextRetryIn: null,
  pendingChanges: 0,
  lastError: null
};

export const syncStatus = writable<SyncStatus>(initialStatus);

/**
 * עדכון סטטוס
 */
export function updateSyncStatus(update: Partial<SyncStatus>) {
  syncStatus.update(s => ({ ...s, ...update }));
}

/**
 * סנכרון החל
 */
export function syncStarted() {
  updateSyncStatus({ status: 'syncing' });
}

/**
 * סנכרון הצליח
 */
export function syncSucceeded() {
  updateSyncStatus({
    status: 'synced',
    lastSyncTime: Date.now(),
    retryAttempt: null,
    nextRetryIn: null,
    lastError: null
  });
}

/**
 * סנכרון נכשל
 */
export function syncFailed(error: string, attempt: number, nextRetryDelay: number) {
  updateSyncStatus({
    status: 'error',
    retryAttempt: attempt,
    nextRetryIn: nextRetryDelay,
    lastError: error
  });
}

/**
 * Offline
 */
export function setOffline() {
  updateSyncStatus({ status: 'offline' });
}
```

### 6.3. Sync Controller

**Controller:** `sveltekit-version/src/lib/logic/syncController.svelte.ts`

```typescript
import { get } from 'svelte/store';
import { appStateStore } from '$lib/stores/appStore';
import { backupWithHistory, restoreWithMerge } from '$lib/services/drive/driveBackupV2';
import {
  syncStarted,
  syncSucceeded,
  syncFailed,
  setOffline
} from '$lib/stores/syncStore';

const TAG = '[SyncController]';
const DEBOUNCE_DELAY = 5000;  // 5 שניות
const MAX_RETRIES = 10;

export class SyncController {
  private debounceTimer: number | null = null;
  private lastKnownWriteId: string | null = null;
  private retryCount = 0;

  constructor() {
    this.setupTriggers();
  }

  /**
   * הגדרת טריגרים לסנכרון
   */
  private setupTriggers() {
    // 1. Visibility change - כשחוזרים לטאב
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log(TAG, 'Tab visible - מסנכרן...');
        this.sync();
      }
    });

    // 2. Online/Offline events
    window.addEventListener('online', () => {
      console.log(TAG, 'חזר online - מסנכרן...');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log(TAG, 'Offline');
      setOffline();
    });

    // 3. App load
    this.sync();
  }

  /**
   * טריגר סנכרון מדחף (debounced)
   */
  public triggerSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.sync();
    }, DEBOUNCE_DELAY);
  }

  /**
   * סנכרון מיידי
   */
  public async sync() {
    if (!navigator.onLine) {
      console.log(TAG, 'Offline - מדלג על סנכרון');
      setOffline();
      return;
    }

    try {
      syncStarted();

      const state = get(appStateStore);

      // TODO: device info מהגדרות
      const device = {
        deviceId: 'device-123',
        deviceName: 'iPad של תמר'
      };

      // TODO: repo מה-Drive API
      const repo = ...;
      const db = ...;

      // 1. נסה לשחזר + למזג
      const mergedState = await restoreWithMerge({
        repo,
        db,
        localState: state,
        localWriteId: this.lastKnownWriteId
      });

      // 2. עדכן local state
      appStateStore.set(mergedState);

      // 3. גבה
      const result = await backupWithHistory({
        state: mergedState,
        repo,
        db,
        device,
        lastKnownWriteId: this.lastKnownWriteId
      });

      this.lastKnownWriteId = result.writeId;
      this.retryCount = 0;

      syncSucceeded();

    } catch (error) {
      console.error(TAG, 'שגיאה בסנכרון:', error);

      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1);  // exponential backoff

        syncFailed(
          error instanceof Error ? error.message : 'שגיאה לא ידועה',
          this.retryCount,
          delay
        );

        console.log(TAG, `ניסיון ${this.retryCount}/${MAX_RETRIES} בעוד ${delay}s`);

        setTimeout(() => {
          this.sync();
        }, delay * 1000);
      } else {
        console.error(TAG, 'הגעתי ל-10 ניסיונות - מוותר');
        syncFailed('הגעתי למקסימום ניסיונות', this.retryCount, 0);
      }
    }
  }
}
```

---

## 7. שלב 6: בדיקות וניקיון

### 7.1. בדיקות E2E

**סקריפט:** `sveltekit-version/tests/e2e/sync.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sync System', () => {
  test('סנכרון בין 2 דפדפנים', async ({ browser }) => {
    // 1. פתח 2 contexts (כמו 2 מכשירים)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 2. טען אפליקציה בשני הדפדפנים
    await page1.goto('http://localhost:5173');
    await page2.goto('http://localhost:5173');

    // 3. בדפדפן 1: הוסף משימה
    await page1.click('[data-testid="add-task-button"]');
    await page1.fill('[data-testid="task-name-input"]', 'משימה חדשה');
    await page1.click('[data-testid="save-task-button"]');

    // 4. המתן לסנכרון (debounce + upload)
    await page1.waitForTimeout(10000);

    // 5. רענן דפדפן 2
    await page2.reload();

    // 6. ודא שהמשימה מופיעה
    await expect(page2.locator('text=משימה חדשה')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('קונפליקט - שני צדדים מוסיפים משימה', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('http://localhost:5173');
    await page2.goto('http://localhost:5173');

    // ניתוק רשת (simulate offline)
    await context1.setOffline(true);
    await context2.setOffline(true);

    // דפדפן 1: הוסף משימה A
    await page1.click('[data-testid="add-task-button"]');
    await page1.fill('[data-testid="task-name-input"]', 'משימה A');
    await page1.click('[data-testid="save-task-button"]');

    // דפדפן 2: הוסף משימה B
    await page2.click('[data-testid="add-task-button"]');
    await page2.fill('[data-testid="task-name-input"]', 'משימה B');
    await page2.click('[data-testid="save-task-button"]');

    // חבר מחדש לרשת
    await context1.setOffline(false);
    await context2.setOffline(false);

    // המתן לסנכרון
    await page1.waitForTimeout(15000);
    await page2.waitForTimeout(15000);

    // שני הדפדפנים צריכים להראות את שתי המשימות
    await expect(page1.locator('text=משימה A')).toBeVisible();
    await expect(page1.locator('text=משימה B')).toBeVisible();

    await expect(page2.locator('text=משימה A')).toBeVisible();
    await expect(page2.locator('text=משימה B')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
```

### 7.2. הסרת קוד ישן

**קבצים למחיקה/שינוי:**

1. ~~`driveBackupV2.ts`~~ - עודכן עם ההיסטוריה (לא נמחק)
2. מחיקת manifest logic ישן (אם לא נחוץ)
3. ניקוי imports מיותרים

### 7.3. תיעוד

עדכן את `docs/walkthrough.md`:

```markdown
## [2026-02-11] [HH:MM]

### מערכת סנכרון עם היסטוריה ו-3-way merge

מימוש מלא של מערכת סנכרון מתקדמת.

---

#### מה בוצע?

**1. מיגרציה v14 → v15**
- מעבר ממערכים ל-objects (`Task[]` → `{ [id]: Task }`)
- הוספת שדה `order` מפורש ל-Task
- הוספת `Settings.childLockEnabled`
- **קבצים שנוצרו**: `migration.ts` (migrateToV15)
- **קבצים ששונו**: `types.ts`, `defaults.ts`

**2. לוגיקת Diff & Merge**
- התקנת `jsondiffpatch`
- מימוש `syncEngine.ts` - calculateDelta, applyDelta, threeWayMerge
- מימוש `historyManager.ts` - findCommonAncestor, reconstructState
- נורמליזציה של `order` אחרי merge
- **קבצים שנוצרו**: `syncEngine.ts`, `historyManager.ts`, `types.ts` (sync)

**3. History.json**
- מבנה SyncHistory עם entries (snapshot/delta)
- שמירה/קריאה של history.json מ-Google Drive
- bootstrap אוטומטי (genesis snapshot)
- **קבצים ששונו**: `driveFilesApi.ts`, `driveBackupV2.ts`

**4. אינטגרציה עם Drive**
- `backupWithHistory()` - גיבוי עם delta/snapshot
- `restoreWithMerge()` - שחזור + 3-way merge
- ETags + retry logic (10 ניסיונות, exponential backoff)
- **קבצים ששונו**: `driveBackupV2.ts`

**5. UI ומשוב**
- אייקון סטטוס סנכרון קבוע (🟢🟡🔴⚪)
- מודאל פרטים (סנכרון אחרון, ניסיון X/10)
- `SyncController` - ניהול טריגרים (visibility, online/offline)
- **קבצים שנוצרו**: `SyncStatusIndicator.svelte`, `syncStore.ts`, `syncController.svelte.ts`

**6. בדיקות**
- Unit tests: syncEngine, historyManager
- E2E tests: סנכרון בין 2 דפדפנים, טיפול בקונפליקטים
- **קבצים שנוצרו**: `syncEngine.test.ts`, `historyManager.test.ts`, `sync.test.ts`

---

#### החלטות ארכיטקטורה

- **מעבר ל-objects**: פותר בעיית אינדקסים עם jsondiffpatch
- **לא tombstones בשלב 1**: ההיסטוריה מספיקה ל-3-way merge
- **10 ניסיונות retry**: exponential backoff (~17 דקות)
- **UI תמיד גלוי**: שקיפות עדיפה על "קסם שחור"

---

#### מעקפים ופתרונות

- **בעיה**: drag & drop במקביל יוצר כפילויות ב-order
- **פתרון**: normalization אחרי כל merge (מיון + עדכון רציף)
```

---

## 8. נספחים

### 8.1. קבצים שנוצרו/שונו - רשימה מלאה

**נוצרו:**
1. `src/lib/services/sync/syncEngine.ts`
2. `src/lib/services/sync/historyManager.ts`
3. `src/lib/services/sync/types.ts`
4. `src/lib/stores/syncStore.ts`
5. `src/lib/logic/syncController.svelte.ts`
6. `src/lib/components/SyncStatusIndicator.svelte`
7. `tests/syncEngine.test.ts`
8. `tests/historyManager.test.ts`
9. `tests/e2e/sync.test.ts`

**שונו:**
1. `src/lib/types.ts` - AppState v15, Task.order, Settings.childLockEnabled, users/people → objects
2. `src/lib/data/defaults.ts` - createDefaultLists() → objects, INITIAL_STATE → users/people objects
3. `src/lib/services/migration.ts` - migrateToV15() (users, people, lists, tasks → objects)
4. `src/lib/services/drive/driveFilesApi.ts` - readHistoryJson(), writeHistoryJson()
5. `src/lib/services/drive/driveBackupV2.ts` - backupWithHistory(), restoreWithMerge()
6. `src/lib/stores/userStore.svelte.ts` - מעבר מ-array ops ל-object ops
7. `src/lib/stores/peopleStore.svelte.ts` - מעבר מ-array ops ל-object ops
8. `src/lib/stores/listStore.svelte.ts` - מעבר מ-array ops ל-object ops
9. כל Controllers שעובדים עם tasks/lists/users/people
10. כל Components שעובדים עם tasks/lists/users/people (`{#each}` → `Object.values()`)

### 8.2. Dependencies

```json
{
  "dependencies": {
    "jsondiffpatch": "^0.6.0"
  },
  "devDependencies": {
    "@types/jsondiffpatch": "^0.6.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

### 8.3. Checklist סיום

- [ ] **מיגרציה v15**
  - [ ] types.ts עודכן (users, people, lists, tasks → objects)
  - [ ] defaults.ts עודכן (INITIAL_STATE עם objects)
  - [ ] migration.ts - migrateToV15 נוסף (6 צעדים: users, people, lists, tasks, settings, version)
  - [ ] userStore.svelte.ts עודכן (find→bracket, push→assign, filter→delete)
  - [ ] peopleStore.svelte.ts עודכן
  - [ ] Components עם `{#each}` עודכנו ל-`Object.values()`
  - [ ] בדיקה: טעינת נתונים ישנים (v14) עובדת

- [ ] **Sync Engine**
  - [ ] jsondiffpatch מותקן
  - [ ] syncEngine.ts נוצר + נבדק
  - [ ] historyManager.ts נוצר + נבדק
  - [ ] Unit tests עוברים

- [ ] **History.json**
  - [ ] driveFilesApi.ts תומך בhistory
  - [ ] backupWithHistory() עובד
  - [ ] restoreWithMerge() עובד

- [ ] **UI**
  - [ ] SyncStatusIndicator מוצג
  - [ ] אייקון מתעדכן (🟢🟡🔴⚪)
  - [ ] פרטים בלחיצה

- [ ] **Triggers**
  - [ ] Visibility change
  - [ ] Online/Offline
  - [ ] Debounce 5s

- [ ] **Retry Logic**
  - [ ] 10 ניסיונות
  - [ ] Exponential backoff
  - [ ] UI מראה ניסיון X/10

- [ ] **בדיקות**
  - [ ] E2E: סנכרון בין 2 דפדפנים
  - [ ] E2E: קונפליקט - שני צדדים מוסיפים
  - [ ] Manual: drag & drop במקביל

- [ ] **תיעוד**
  - [ ] walkthrough.md עודכן
  - [ ] features-status.md עודכן

---

**סיום תוכנית המימוש**

*נכתב ב-2026-02-11*
