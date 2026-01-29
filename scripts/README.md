# 🔐 בדיקת Google OAuth - Silent Refresh

כלי לבדיקת מנגנון ההתחברות של Google OAuth ובחינת יכולת ה-Silent Refresh.

## 📁 קבצים

- **`google-auth-test.html`** - דף בדיקה אינטראקטיבי
- **`test-google-auth.mjs`** - סקריפט בדיקות אוטומטי (Playwright)
- **`README.md`** - המסמך הזה

## 🚀 שימוש מהיר

### אופציה 1: בדיקה ידנית (פשוט)

פשוט פתח את הקובץ בדפדפן:

```bash
# Windows
start scripts/google-auth-test.html

# Mac
open scripts/google-auth-test.html

# Linux
xdg-open scripts/google-auth-test.html
```

לחץ על הכפתורים ובדוק את התנהגות OAuth.

### אופציה 2: בדיקה אוטומטית (Playwright)

הרץ את סקריפט הבדיקות ישירות מתיקיית `scripts/`:

```bash
# עם bun (מומלץ - מהיר וקל)
cd scripts
bun run test-google-auth.mjs

# או עם node
cd scripts
node test-google-auth.mjs
```

**הערה:** הסקריפט משתמש ב-Playwright מ-`sveltekit-version/node_modules` (import יחסי).

**חשוב:** הסקריפט יפתח דפדפן ויחכה שתתחבר ידנית ב-popup של Google!

## 📊 מה הסקריפט בודק?

1. **בדיקה 1: התחברות רגילה**
   - לוחץ על "התחבר רגיל"
   - מחכה שהמשתמש יתחבר ב-popup
   - בודק שהתקבל token ונשמר ב-localStorage

2. **בדיקה 2: מחיקת Token**
   - מוחק את ה-token מ-localStorage
   - מוודא שהמחיקה הצליחה

3. **בדיקה 3: Silent Refresh**
   - מנסה לקבל token חדש **ללא popup** (prompt: '')
   - ✅ אם Google Session Cookie תקף → יקבל token חדש
   - ❌ אם Cookie לא תקף → יכשל

## 📁 תוצאות

אחרי הרצת הסקריפט:

- **`scripts/screenshots/`** - צילומי מסך מכל שלב (gitignored)
- **`scripts/google-auth-test-report.json`** - דוח JSON מפורט (gitignored)
- **פלט קונסול** - סיכום מעוצב

דוגמת פלט:

```
========================================
📊 דוח בדיקות Google OAuth
========================================
⏰ זמן: 29/01/2026, 15:30:45

✓ בדיקה 1: התחברות רגילה
  Token: ya29.a0AV...
  תפוגה: 29/01/2026, 16:30:45
  
✓ בדיקה 2: מחיקת Token

✗ בדיקה 3: Silent Refresh
  שגיאה: לא התקבל token חדש - Cookie לא תקף
  
========================================
📁 דוח מלא: scripts/google-auth-test-report.json
📸 Screenshots: scripts/screenshots/
🌐 HTML: scripts/google-auth-test.html
========================================
```

## 🔍 מה זה Silent Refresh?

**השאלה:** איך Google יודעת מי אתה אחרי שה-Access Token פג (אחרי שעה)?

**התשובה:** Google שומרת **Session Cookie** בדפדפן (תחת `accounts.google.com`).

### התהליך:

1. **התחברות ראשונה:**
   ```
   משתמש → Google (username/password)
        ↓
   Google שומר Cookie (חודשים!) 🍪
        ↓
   Google מחזיר Access Token (שעה) 🎫
   ```

2. **אחרי שעה - Silent Refresh:**
   ```
   App → Google (+ Cookie אוטומטית) 🍪
        ↓
   Google בודק Cookie - תקף? ✅
        ↓
   Google מחזיר Access Token חדש ללא popup! 🎫
   ```

3. **אם Cookie נמחק/פג:**
   ```
   App → Google (אין Cookie תקף) ❌
        ↓
   Google: "צריך התחברות מחדש"
        ↓
   Popup או שגיאה
   ```

### איך לראות את ה-Cookies?

Cookies של Google לא נגישים מ-JavaScript (cross-origin security). כדי לראותם:

1. פתח DevTools (F12)
2. Application → Cookies → `https://accounts.google.com`
3. חפש:
   - `SID` - Session ID
   - `HSID` - Host Session ID
   - `SSID` - Secure Session ID
   - `SAPISID` - API Session ID

אלו ה-Cookies שמזהים אותך!

## 🎯 למה זה חשוב?

**הבעיה הנוכחית:** כל שעה המערכת מתנתקת ומבקשת התחברות מחדש.

**פתרון אפשרי:** 
- Silent Refresh אוטומטי 5 דקות לפני תפוגה
- אם נכשל → הצג כפתור "התחבר מחדש"

## 💡 שימושים נוספים

- **Debug OAuth** - הבן מה קורה בכל שלב
- **בדיקת Session Cookies** - האם הם תקפים?
- **תיעוד** - Screenshots + JSON לתיעוד בעיות
- **למידה** - הבן איך Google OAuth עובד

## 🔧 Troubleshooting

### הסקריפט לא רץ
```bash
# וודא ש-Playwright מותקן בפרויקט הראשי
cd sveltekit-version
bun install

# אם עדיין לא עובד, התקן דפדפנים
cd ..
bunx playwright install
```

### שגיאת Import
אם אתה מקבל שגיאה על import של playwright:
- וודא ש-`sveltekit-version/node_modules/playwright` קיים
- הסקריפט משתמש ב-import יחסי מה-node_modules של הפרויקט

### Silent Refresh תמיד נכשל
זה **צפוי**! Google Session Cookies פגים מהר או נמחקים. זו הבעיה שאנחנו מנסים לפתור.

### הדפדפן לא נפתח
וודא ש-`headless: false` בסקריפט (שורה 63).

## 📚 קישורים

- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Playwright Documentation](https://playwright.dev/)

---

**נוצר:** 2026-01-29  
**מטרה:** בדיקת Silent Refresh ב-Google OAuth
