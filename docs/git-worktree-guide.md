# מדריך קצר: Git Worktree

## מה זה Worktree?

`worktree` הוא תיקיית עבודה נוספת לאותו ריפו, כך שאפשר לעבוד במקביל על כמה ענפים בלי לעשות כל רגע `checkout`.

- **ענף (branch)** = מצביע בהיסטוריית Git.
- **Worktree** = תיקייה פיזית עם `HEAD`/`index` משלה, שמחוברת לענף אחד (או ל-detached HEAD).

### מה זה אומר בפועל: `HEAD` ו-`index`

- **`HEAD`**: המיקום הנוכחי בהיסטוריה (בדרך כלל הענף הפעיל בתיקייה הזו).
- **`index`**: אזור ה-Staging המקומי של התיקייה הזו (`git add` לפני `git commit`).

בגלל שלכל Worktree יש `HEAD` ו-`index` משלו:

- אפשר שב-worktree אחד תהיה על `main`, וב-worktree אחר על `feature-login`.
- אפשר לעשות `git add`/`git commit` בכל Worktree בנפרד, בלי לערבב Staging ביניהם.
- מה שמשותף לכל ה-worktrees הוא מאגר האובייקטים והיסטוריית ה-Git של אותו ריפו.

דוגמה:

- `repo/` על `main`
- `.worktrees/feature-login/` על `feature-login`

לכל אחת מהתיקיות יש מצב עבודה עצמאי, אבל שתיהן שייכות לאותו ריפו.

## איך יוצרים Worktree?

### 1) יצירה מהירה (לרוב יוצר ענף חדש לפי שם התיקייה)

```bash
git worktree add .worktrees/feature-login
```

בדרך כלל Git ייצור ענף חדש בשם `feature-login` מה-`HEAD` הנוכחי ויעבור אליו בתוך ה-worktree החדש.

### 2) יצירה עם שם ענף מפורש

```bash
git worktree add -b feature-login .worktrees/feature-login main
```

זה יוצר ענף `feature-login` מהענף `main`.

### 3) חיבור Worktree לענף קיים

```bash
git worktree add .worktrees/hotfix-123 hotfix-123
```

### 4) מצב Detached (ללא ענף)

```bash
git worktree add --detach .worktrees/debug <commit-sha>
```

## איך מוחקים Worktree?

1. לצאת מהתיקייה שרוצים למחוק (אם אתה עומד בתוכה).
2. להסיר את ה-worktree:

```bash
git worktree remove .worktrees/feature-login
```

אם יש שינויים לא שמורים:

```bash
git worktree remove --force .worktrees/feature-login
```

3. לנקות רישומים ישנים (אופציונלי):

```bash
git worktree prune
```

4. אם זה היה ענף זמני ורוצים למחוק גם אותו:

```bash
git branch -d feature-login
```

## איך מקבלים רשימת Worktrees?

הפקודה הבסיסית:

```bash
git worktree list
```

פלט טיפוסי יציג לכל Worktree:

- נתיב תיקייה
- קומיט נוכחי
- ענף פעיל (או `detached`)

לפלט מפורט יותר (נוח לסקריפטים):

```bash
git worktree list --porcelain
```

## שאלות נפוצות

### האם אוטומטית נוצר ענף?

לא תמיד. ברירת המחדל `git worktree add <path>` בדרך כלל תיצור ענף חדש לפי שם התיקייה (אם לא העברת ענף/commit מפורש).

### אם לא נוצר ענף אוטומטית, מה מבדיל?

- אם נתת **שם ענף קיים**: ה-worktree יעבוד על הענף הזה.
- אם נתת **commit hash** או `--detach`: תהיה במצב detached HEAD (לא על ענף).

### קומיט מתוך Worktree נכנס לענף הראשי?

קומיט נכנס לענף שפעיל בתוך אותו worktree, לא אוטומטית ל-`main`.

- אם ה-worktree על `feature-login` -> הקומיט נכנס ל-`feature-login`.
- אם ה-worktree על `main` -> הקומיט נכנס ל-`main`.
- אם detached -> הקומיט לא יושב על ענף עד שתיצור/תחבר ענף.

בדיקה מהירה:

```bash
git branch --show-current
```
