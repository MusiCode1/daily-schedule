# נהלי עדכון גרסה (Release Procedures)

מסמך זה מרכז את הבדיקות והפעולות שיש לבצע לפני כל העלאת גרסה חדשה ל-Production, כדי למנוע רגרסיות ובעיות תאימות לאחור.

## בדיקות מיגרציה (Migration Tests)

כאשר משנים את מבנה הנתונים ב-LocalStorage, חובה לוודא שהקוד יודע להתמודד עם נתונים מהגרסה הקודמת.

### מיגרציה לאותנטיקציה (Google Auth Storage)

יש לבצע בדיקה זו בכל שינוי הקשור ל-OAuth / טוקנים, ובפרט ל-`googleAuthService` או למבנה ה-state הפר-מכשיר (`daily-schedule-device-state`).

1.  **הכנת הסביבה (Pre-Condition):**
    - וודא שהמערכת נקייה (התנתק, מחק LocalStorage).
    - פתח את הקונסולה (F12).

2.  **הזרקת נתונים ישנים:**
    הרץ את הקוד הבא בקונסולה כדי לדמות משתמש בגרסה הקודמת:

    ```javascript
    // יצירת טוקן 'ישן' למטרת בדיקה
    localStorage.setItem("gdrive_token", "test-legacy-token-" + Date.now());
    // תוקף לעוד שעה
    localStorage.setItem("gdrive_expiry", (Date.now() + 3600000).toString());

    console.log("Legacy data injected. Reload page now.");
    ```

3.  **טעינת גרסה חדשה:**
    - רענן את הדף (F5).
    - המתן לטעינת האפליקציה.

4.  **אימות (Validation):**
    - בדוק ב-Application -> Local Storage.
    - וודא שהמפתחות הישנים `gdrive_token` ו-`gdrive_expiry` נעלמו.
    - וודא שקיים מפתח חדש `daily-schedule-device-state`.
    - וודא שבתוכו יש `auth.googleAuthStorage.accessToken` ושזה הטוקן שהזרקת.
