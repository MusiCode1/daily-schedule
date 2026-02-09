# טקסטים מועשרים ל-TTS (Enhanced Inputs)

קובץ זה נוצר על בסיס `tts-source-texts.md` וכולל תגיות אודיו (`[happy]`, `[excited]`, `[whisper]` וכו') בהתאם להנחיות ב-`eleven-v3-enhancing-input`.

## 1. ממשק הילד (קבוע)

| מזהה (Key)                    | טקסט מקורי                 | טקסט מועשר (Enhanced Text)                      |
| :---------------------------- | :------------------------- | :---------------------------------------------- |
| `USER_SELECTOR_TITLE`         | מי משתמש בלוח היום?        | [happy] מי משתמש בלוח היום?                     |
| `APP_TITLE_PART1`             | סדר יום                    | [excited] סדר יום                               |
| `APP_TITLE_PART2`             | ויזואלי                    | [excited] ויזואלי                               |
| `LOADING_APP`                 | טוען סדר יום...            | [humming] טוען סדר יום...                       |
| `PRAISE_ALUF` (בן)            | אתה אלוף!                  | [excited] אתה אלוף! [laughing]                  |
| `PRAISE_ALUF` (בת)            | את אלופה!                  | [excited] את אלופה! [laughing]                  |
| `WELL_DONE`                   | כל הכבוד!                  | [excited] כל הכבוד! [laughing]                  |
| `ALL_DONE_MESSAGE`            | סיימת את כל המשימות להיום! | [excited] סיימת את כל המשימות להיום! [laughing] |
| `DEFAULT_GREETING_WITH_COMMA` | בהצלחה,                    | [warmly] בהצלחה,                                |
| `TODAY_NO`                    | היום אין                   | [gentle] היום אין                               |
| `FINISHED_PREFIX`             | סיימת את                   | [happy] סיימת את                                |
| `NOW_PREFIX`                  | עכשיו,                     | [energetic] עכשיו,                              |
| `CHANGE_LABEL`                | שינוי!                     | [surprised] שינוי!                              |
| `NOW`                         | עכשיו                      | [assertive] עכשיו                               |
| `DONE`                        | בוצע                       | [satisfied] בוצע                                |
| `WHO_WILL_BE_WITH_US`         | מי יהיה איתנו היום?        | [curious] מי יהיה איתנו היום?                   |
| `COMMUNICATION_BOARD`         | לוח תקשורת                 | [calm] לוח תקשורת                               |
| `OPEN_COMMUNICATION_BOARD`    | פתח לוח תקשורת             | [calm] פתח לוח תקשורת                           |
| `CLOSE`                       | סגור                       | [calm] סגור                                     |
| `FLOATING_WINDOW_TITLE`       | חלון צף                    | [calm] חלון צף                                  |

## 2. פעילויות (Activities)

| מזהה (ID)         | טקסט מקורי           | טקסט מועשר (Enhanced Text)         |
| :---------------- | :------------------- | :--------------------------------- |
| `toilet`          | שירותים              | [whisper] שירותים                  |
| `breakfast`       | ארוחת בוקר           | [happy] ארוחת בוקר                 |
| `lunch`           | ארוחת צהריים         | [happy] ארוחת צהריים               |
| `dinner`          | ארוחת ערב            | [happy] ארוחת ערב                  |
| `brushing_teeth`  | לצחצח שיניים         | [energetic] לצחצח שיניים!          |
| `shower`          | להתקלח               | [relaxed] להתקלח...                |
| `getting_dressed` | להתלבש               | [energetic] להתלבש!                |
| `going_to_car`    | ללכת לאוטו           | [excited] ללכת לאוטו!              |
| `play_time`       | זמן משחק             | [excited] זמן משחק! [laughing]     |
| `sleep_time`      | זמן שינה             | [whisper] זמן שינה... [yawn]       |
| `tablet`          | טאבלט                | [happy] טאבלט                      |
| `lesson`          | שיעור                | [calm] שיעור                       |
| `playground`      | ללכת לגינה           | [excited] ללכת לגינה!              |
| `arts_and_crafts` | ציור ויצירה          | [creative] ציור ויצירה             |
| `medicine`        | לקחת תרופות          | [gentle] לקחת תרופות               |
| `grandparents`    | ללכת לסבא וסבתא      | [happy] ללכת לסבא וסבתא!           |
| `prayer`          | תפילה                | [respectful] תפילה                 |
| `box_work`        | עבודה בקופסאות עבודה | [focused] עבודה בקופסאות עבודה     |
| `yard`            | חצר                  | [happy] חצר!                       |
| `animal_therapy`  | חוג בעלי חיים        | [happy] חוג בעלי חיים              |
| `travel_car`      | נוסעים באוטו         | [excited] נוסעים באוטו! [laughing] |
| `visit_building`  | הולכים לביקור        | [happy] הולכים לביקור              |
| `guests_arrive`   | אורחים מגיעים        | [excited] אורחים מגיעים!           |
| `guests_leave`    | נפרדים מהאורחים      | [warmly] נפרדים מהאורחים           |
| `back_home`       | חזרנו הביתה          | [relieved] חזרנו הביתה [sighs]     |

## 3. רשימות וברכות (Lists & Greetings)

| סוג         | טקסט מקורי                | טקסט מועשר (Enhanced Text)               |
| :---------- | :------------------------ | :--------------------------------------- |
| שם רשימה    | שגרת בוקר                 | [energetic] שגרת בוקר!                   |
| ברכה        | בוקר טוב                  | [happy] בוקר טוב!                        |
| שם רשימה    | אחרי הצהריים              | [calm] אחרי הצהריים                      |
| ברכה        | אחרי צהריים טובים         | [warmly] אחרי צהריים טובים               |
| שם רשימה    | נוסעים לסבא וסבתא         | [happy] נוסעים לסבא וסבתא!               |
| כותרת רשימה | מתכוננים לנסוע לסבא וסבתא | [expectant] מתכוננים לנסוע לסבא וסבתא... |
| ברכה        | נסיעה טובה                | [happy] נסיעה טובה!                      |
| שם רשימה    | דודים באים לבקר           | [excited] דודים באים לבקר!               |
| כותרת רשימה | מתכוננים לביקור של דודים  | [excited] מתכוננים לביקור של דודים!      |
| ברכה        | ברוכים הבאים              | [welcoming] ברוכים הבאים!                |
