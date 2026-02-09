// src/lib/data/texts.ts
import type { Gender } from '$lib/types';
// ---
// הפרדת טקסטים לפי קהל יעד (ילד/מבוגר) כדי לתמוך בתהליך יצירת TTS מוקלט מראש.
// חשוב: אנחנו עדיין מייצאים TEXTS מאוחד לתאימות לאחור.
// ---

const TEXTS_CHILD = {
	// מסך בחירת משתמש (ממשק הילד)
	USER_SELECTOR_TITLE: 'מי משתמש בלוח היום?',
	LOGIN_AS: (name: string) => `התחבר כ-${name}`,

	APP_TITLE: 'סדר יום ויזואלי',
	APP_TITLE_PART1: 'סדר יום',
	APP_TITLE_PART2: 'ויזואלי',
	LOGIN_PAGE_TITLE: 'כניסה - סדר יום ויזואלי',
	LOADING_APP: 'טוען סדר יום...',

	// משוב / חיזוקים (ממשק הילד + הקראה)
	PRAISE_ALUF: (gender: Gender) => (gender === 'boy' ? 'אתה אלוף!' : 'את אלופה!'),
	WELL_DONE: 'כל הכבוד!',
	ALL_DONE_MESSAGE: 'סיימת את כל המשימות להיום!',
	DEFAULT_GREETING_WITH_COMMA: 'בהצלחה,',
	TODAY_NO: 'היום אין',
	FINISHED_PREFIX: (gender: Gender) => (gender === 'boy' ? 'סיימת את' : 'סיימת את'),
	NOW_PREFIX: 'עכשיו,',
	FINISHED_TASK: (gender: Gender, taskName: string) => `סיימת את ${taskName}`,
	NOW_NEXT: (nextTaskName: string) => `. עכשיו, ${nextTaskName}`,
	CHANGE_LABEL: 'שינוי!',

	// לוח / משימות (ממשק הילד)
	NOW: 'עכשיו',
	DONE: 'בוצע',
	LOCKED_LIST: '(נעולה)',

	// אנשים (מוצג בלוח)
	WHO_WILL_BE_WITH_US: 'מי יהיה איתנו היום?',
	SHOW_HIDE_PEOPLE: 'הצג/הסתר אנשים',
	SHOW: 'הצג',
	HIDE: 'הסתר',

	// לוח תקשורת
	COMMUNICATION_BOARD: 'לוח תקשורת',
	OPEN_COMMUNICATION_BOARD: 'פתח לוח תקשורת',
	CLOSE: 'סגור',
	FLOATING_WINDOW_TITLE: 'חלון צף'
} as const;

const TEXTS_ADMIN = {
	// הגדרות / ניהול
	SETTINGS_TITLE: 'הגדרות מערכת',
	USERS_TAB: 'משתמשים',
	LISTS_TAB: 'רשימות',
	PEOPLE_TAB: 'אנשים',
	GENERAL_TAB: 'כללי',
	USER_MANAGEMENT: 'ניהול משתמשים',
	LIST_MANAGEMENT: 'ניהול רשימות',
	PEOPLE_MANAGEMENT: 'ניהול אנשים',
	GENERAL_SETTINGS: 'הגדרות כלליות',
	NEW_USER: '+ משתמש חדש',
	EDIT_USER: 'עריכת משתמש',
	SAVE: 'שמור',
	CANCEL: 'ביטול',
	DELETE: 'מחיקה',
	EDIT: 'עריכה',
	DUPLICATE: 'שכפל',
	COPY: 'שכפל',
	MOVE: 'העבר',
	COPY_TO_USER: 'העבר/שכפל למשתמש',
	COPY_LIST_TO_USER: 'בחר משתמש יעד',
	MOVE_INSTEAD_OF_COPY: 'העבר (במקום לשכפל) - ימחק את המקור',
	RESET_ALL_TASKS: 'אפס את כל המשימות',
	RESET_TASKS_CONFIRM: 'לאפס את כל המשימות ברשימה זו? (כל המשימות יסומנו כלא בוצעו)',
	HIDE_LIST: 'הסתר רשימה',
	SHOW_LIST: 'הצג רשימה',
	HIDDEN_LIST: '(מוסתרת)',
	LOCK_LIST: 'נעל רשימה (תרגול)',
	UNLOCK_LIST: 'שחרר נעילה',
	BACK_TO_BOARD: '➡️ חזרה ללוח',
	SWITCH_USER_ARIA: 'החלף משתמש',
	ADVANCED_SETTINGS_TITLE: 'הגדרות מתקדמות',
	FULLSCREEN_ENTER: 'מסך מלא',
	FULLSCREEN_EXIT: 'צא ממסך מלא',
	EDIT_MODE_ENTER: 'מצב עריכה',
	EDIT_MODE_EXIT: 'סגור עריכה',
	LIST_ACTIONS_PANEL_TITLE: 'ניהול רשימה',
	NEW_LIST_ACTION: 'רשימה חדשה',
	EDIT_LIST_ACTION: 'ערוך רשימה',
	DELETE_LIST_ACTION: 'מחק רשימה',
	RESET_TASKS_ACTION: 'אפס משימות',
	RESET_TASKS_CONFIRM_BOARD: 'האם אתה בטוח שברצונך לאפס את כל המשימות?',
	NO_TASKS_IN_LIST: 'אין משימות ברשימה זו.',
	CLICK_PLUS_TO_ADD: 'לחץ על + כדי להוסיף.',

	// רשימות
	NEW_LIST: '+ רשימה חדשה',
	EDIT_LIST: 'עריכת רשימה',
	LIST_NAME: 'שם הרשימה',
	GREETING: 'ברכה',
	GREETING_PLACEHOLDER: 'למשל: בוקר טוב',
	DEFAULT_GREETING: 'בהצלחה',
	LOGO: 'אייקון/תמונה',
	LIST_TITLE: 'כותרת (אופציונלי)',
	LIST_TITLE_PLACEHOLDER: 'לדוגמה: "ביום ראשון נוסעים לטיול!"',
	LIST_DESCRIPTION: 'תיאור (אופציונלי)',
	LIST_DESCRIPTION_PLACEHOLDER: 'תיאור קצר של האירוע או הפעילות',
	FOR_USER_LABEL: 'עבור:',
	DELETE_LIST_CONFIRM: 'למחוק את הרשימה?',
	TASKS_COUNT: (count: number) => `${count} משימות`,
	LIST_COPY_SUFFIX: ' (עותק)',

	// אנשים (צוות ומשפחה)
	PEOPLE: 'אנשים',
	NEW_PERSON: 'הוסף אדם חדש',
	EDIT_PERSON: 'עריכת אדם',
	PERSON_NAME: 'שם האדם',
	SELECT_PEOPLE_FOR_LIST: 'בחר אנשים לרשימה זו',
	DELETE_PERSON_CONFIRM: 'למחוק את האדם? הוא יוסר מכל הרשימות שבהן הוא מופיע.',
	NO_PEOPLE_IN_DB: 'אין אנשים במאגר',
	CLICK_ADD_PERSON_TO_START: 'לחץ על "הוסף אדם חדש" כדי להתחיל',

	// מודאל הוספה
	ADD_ACTIVITY: 'הוסף פעילות',
	COLLAPSE_ACTIVITIES_GRID: 'כווץ רשת פעילויות',
	EXPAND_ACTIVITIES_GRID: 'הרחב רשת פעילויות',
	ACTIVITY_NAME: 'שם הפעילות',
	CHOOSE_OR_TYPE: 'בחר מהרשימה או הקלד...',
	CHOOSE_IMAGE_OPTIONAL: 'בחירת תמונה (אופציונלי):',
	COMMUNICATION_BOARD_URL: 'קישור ללוח תקשורת (אופציונלי)',
	COMMUNICATION_BOARD_PLACEHOLDER: 'https://app.cboard.io/board/...',
	MARK_AS_CHANGE: 'סמן כמשימת שינוי',
	CHANGE_CANCELLED: 'משימה בוטלה',
	CHANGE_ADDED: 'פעילות חדשה',
	NEW_ACTIVITY_LABEL: 'פעילות חדשה',

	// טפסים
	NAME: 'שם',
	GENDER: 'מין',
	BOY: 'בן',
	GIRL: 'בת',
	AVATAR: 'תמונה',
	ADD_ACTION: 'הוסף',
	UPDATE_ACTION: 'עדכן',
	DELETE_TASK_CONFIRM: 'למחוק?',
	EDIT_ACTION: 'ערוך',
	DELETE_ACTION: 'מחק',

	// תמונות
	IMAGE_ALT_GENERIC: 'תמונה',
	LOGO_ALT: 'לוגו',
	PERSON_AVATAR_ALT: 'תמונת איש',
	APP_LOGO_ALT: 'לוגו האפליקציה',
	IMAGE_CROP_TITLE: 'התאמת תמונה',
	IMAGE_CROP_INSTRUCTIONS: 'גרור להזזה, השתמש בכפתורים לזום',
	IMAGE_EDIT_ALT: 'עריכת תמונה',
	RESET: 'איפוס',
	CONFIRM: 'אישור',
	REMOVE_IMAGE_TITLE: 'הסר תמונה',
	EDIT_CROP_ACTION: 'ערוך חיתוך',
	REPLACE_IMAGE: 'החלף תמונה',
	UPLOAD_IMAGE: 'העלה תמונה',
	SAVING_ELLIPSIS: 'שומר...',
	SAVE_ERROR: 'שגיאה בשמירת התמונה',

	// גוגל דרייב / גיבוי
	GOOGLE_DRIVE_TITLE: 'גיבוי וסנכרון (Google Drive)',
	CONNECT_DRIVE: 'התחבר לגוגל דרייב',
	DISCONNECT_DRIVE: 'התנתק',
	BACKUP_NOW: 'בצע גיבוי עכשיו',
	RESTORE_FROM_BACKUP: 'שחזר מגיבוי קיים',
	AUTO_BACKUP: 'גיבוי אוטומטי',
	LAST_BACKUP: 'גיבוי אחרון:',
	NO_BACKUPS_FOUND: 'לא נמצאו קבצי גיבוי',
	BACKUP_SUCCESS: 'הגיבוי בוצע בהצלחה!',
	RESTORE_SUCCESS: 'הנתונים שוחזרו בהצלחה! (נא לרענן)',
	ERROR_GENERIC: 'אירעה שגיאה בחיבור או בפעולה',
	CONNECTED_AS: 'מחובר כ:',
	RESTORE_CONFIRM:
		'האם אתה בטוח? פעולה זו תמחק את המידע הנוכחי במכשיר זה ותחליף אותו במידע מהגיבוי.',
	// קונפליקט וסנכרון
	CONFLICT_TITLE: 'זוהה גיבוי חדש יותר',
	CONFLICT_REMOTE_NEWER: 'הגיבוי בענן עדכני יותר מהמידע במכשיר הזה.',
	CONFLICT_LOCAL_NEWER:
		'המידע במכשיר הזה עדכני יותר, אך הגיבוי בענן מכיל שינויים ממכשיר אחר (ייתכן שתאבד את השינויים שם אם תדרוס).',
	CONFLICT_WITH_DEVICE: (deviceName: string) => `זוהו שינויים ממכשיר אחר ("${deviceName}").`,
	REMOTE_VERSION: 'גיבוי בענן',
	LOCAL_VERSION: 'מידע מקומי',
	RECOMMENDED_SUFFIX: ' (מומלץ)',
	KEEP_REMOTE: 'עדכן מהענן',
	KEEP_LOCAL: 'השאר מקומי',
	// Redirect Mode
	REDIRECT_MODE_LABEL: 'מצב הפניה (Redirect Mode) - פתרון לחסימת פופ-אפ',
	REDIRECT_MODE_DESC: 'מומלץ למצבי קיוסק או דפדפנים שחוסמים חלונות קופצים.',

	CLIENT_ID_LABEL: 'מזהה לקוח (Client ID) - מתקדם',
	CLIENT_ID_PLACEHOLDER: 'הזן Client ID מותאם אישית (אופציונלי)',
	APPLY_CLIENT_ID_RECONNECT: 'אנא התנתק והתחבר מחדש כדי להחיל את ה-Client ID החדש.',
	DRIVE_DESC: 'גבה את הנתונים שלך לענן וסנכרן בין מכשירים.',
	SAVE_BACKUP_LOCAL_TITLE: 'שמור גיבוי לקובץ מקומי',
	DOWNLOAD_FILE_TITLE: 'הורד קובץ',
	UNKNOWN: 'לא ידוע',
	GENERIC_USER: 'משתמש',

	// מדיניות פרטיות
	PRIVACY_TITLE: 'מדיניות פרטיות',
	PRIVACY_UPDATED_AT: 'עודכן לאחרונה: 14 בינואר 2026',
	PRIVACY_WELCOME_PREFIX: 'ברוכים הבאים לאפליקציית',
	PRIVACY_WELCOME_SUFFIX:
		'אנו מכבדים את הפרטיות שלכם ומחויבים להגן עליה. מסמך זה מסביר את נהלי הפרטיות שלנו.',
	PRIVACY_DOES_NOT: 'אינה',
	PRIVACY_ONLY: 'אך ורק',
	PRIVACY_SECTION_1_TITLE: '1. איסוף מידע',
	PRIVACY_SECTION_1_PREFIX: 'האפליקציה ',
	PRIVACY_SECTION_1_SUFFIX:
		' אוספת, שומרת או משתפת מידע אישי מזהה (PII) על המשתמשים בשרתים שלנו. כל הנתונים שאתם מזינים (משתמשים, משימות, תמונות) נשמרים באופן מקומי על המכשיר שלכם (ב-LocalStorage וב-IndexedDB) או ב-Google Drive האישי שלכם (אם בחרתם להתחבר).',
	PRIVACY_SECTION_2_TITLE: '2. הרשאות ושימוש ב-Google Drive',
	PRIVACY_SECTION_2_INTRO:
		'האפליקציה מאפשרת גיבוי וסנכרון נתונים באמצעות Google Drive. לצורך כך, אנו מבקשים את ההרשאה הבאה:',
	PRIVACY_SECTION_2_SCOPE_DESC_PREFIX: 'הרשאה זו מאפשרת לאפליקציה גישה ',
	PRIVACY_SECTION_2_SCOPE_DESC_SUFFIX:
		' לקבצים שהיא יצרה בעצמה. לאפליקציה אין גישה לשאר הקבצים ב-Drive שלכם.',
	PRIVACY_SECTION_2_COMPLIANCE_PREFIX: 'השימוש בנתונים שהתקבלו מ-Google APIs יעשה בהתאם ל-',
	PRIVACY_SECTION_2_COMPLIANCE_LINK_LABEL: 'מדיניות נתוני המשתמש של שירותי Google API',
	PRIVACY_SECTION_2_COMPLIANCE_SUFFIX: ', כולל דרישות השימוש המוגבל.',
	PRIVACY_SECTION_3_TITLE: '3. טלמטריה ומעקב',
	PRIVACY_SECTION_3_BODY:
		'נכון לגרסה זו, האפליקציה אינה מכילה רכיבי מעקב, פרסומות או שירותי ניתוח (Analytics) צד שלישי האוספים מידע על דפוסי השימוש שלכם.',
	PRIVACY_SECTION_4_TITLE: '4. יצירת קשר',
	PRIVACY_SECTION_4_BODY: 'אם יש לכם שאלות בנוגע למדיניות זו, ניתן ליצור קשר עם המפתח.',
	PRIVACY_BACK_HOME: 'חזרה לדף הבית',

	// דף בדיקה - לוח תקשורת (Cboard)
	TEST_BOARD_TITLE: '💬 מערכת תקשורת - Cboard',
	TEST_BOARD_INFO:
		'בחר לוח תקשורת מהכפתורים למטה. החלון יופיע ויהיה ניתן לגרור ולשנות גודל.',
	TEST_BOARD_INSTRUCTIONS_TITLE: '💡 הוראות שימוש:',
	TEST_BOARD_INSTRUCTION_MOVE_LABEL: 'להזזת החלון:',
	TEST_BOARD_INSTRUCTION_MOVE_DESC: 'אחוז בפס הסגול העליון וגרור',
	TEST_BOARD_INSTRUCTION_RESIZE_LABEL: 'לשינוי גודל:',
	TEST_BOARD_INSTRUCTION_RESIZE_DESC: 'משוך מקצוות החלון או מהפינה השמאלית התחתונה',
	TEST_BOARD_INSTRUCTION_CLOSE_LABEL: 'לסגירה:',
	TEST_BOARD_INSTRUCTION_CLOSE_DESC: 'לחץ על ה-X בפינת החלון',
	TEST_BOARD_INSTRUCTION_TOUCH_LABEL: 'מסך מגע:',
	TEST_BOARD_INSTRUCTION_TOUCH_DESC: 'כל הפעולות נתמכות במסך מגע',
	TEST_BOARD_DEMO_TITLE: 'תוכן הדף הראשי',
	TEST_BOARD_DEMO_P1: 'החלון צף מעל התוכן הזה ולא חוסם אותו.',
	TEST_BOARD_DEMO_P2: 'אפשר להזיז את החלון לכל מקום על המסך.',
	TEST_BOARD_DEMO_PLACEHOLDER:
		'זהו אזור לדוגמה - יכול להיות כאן לוח פעילות TEACCH או כל תוכן אחר',
	TEST_BOARD_BOARD_MOTI: 'לוח למוטי',
	TEST_BOARD_BOARD_MOISHI: 'לוח למוישי',
	TEST_BOARD_BOARD_AVISHAI_FEELINGS: 'לוח רגשות לאבישי',

	// התראות / אישורים
	DELETE_USER_CONFIRM: 'למחוק את המשתמש? פעולה זו תמחק גם את כל הרשימות שלו!',
	CANNOT_DELETE_LAST_LIST: 'אי אפשר למחוק את הרשימה האחרונה.',
	DELETE_CURRENT_LIST_CONFIRM: 'למחוק את הרשימה הנוכחית?',
	NEW_LIST_NAME_PROMPT: 'שם הרשימה החדשה:',

	// Sync / סטטוסים
	PREPARING_BACKUP: 'מכין נתונים לגיבוי...',
	UPLOADING_TO_DRIVE: 'מעלה ל-Google Drive...',
	UPLOADING_BACKUP_TO_DRIVE: 'מעלה גיבוי ל-Google Drive...',
	PREPARING_DOWNLOAD_FILE: 'מכין קובץ להורדה...',
	DOWNLOADING_FILE_FROM_DRIVE: 'מוריד קובץ מ-Google Drive...',
	CREATING_DOWNLOAD_FILE: 'יוצר קובץ להורדה...',
	DOWNLOAD_FAILED: 'הורדה נכשלה',
	DOWNLOADING_FROM_CLOUD: 'מוריד נתונים מהענן...',
	CREATING_BACKUP_FILE_ERROR: 'שגיאה ביצירת קובץ הגיבוי',
	DOWNLOADING_FILE_ERROR: 'שגיאה בהורדת הקובץ',
	STARTING_RESTORE: 'מתחיל תהליך שחזור...',
	DOWNLOADING_BACKUP_FILE: 'מוריד קובץ גיבוי...',
	EXTRACTING_IMAGES: 'מחלץ ושומר תמונות (זה עשוי לקחת רגע)...',
	SAVING_AND_REFRESHING: 'שומר נתונים ומרענן...',

	// Legacy / מיגרציות
	LEGACY_GREETING_HELLO: 'שלום'
} as const;

export const TEXTS = {
	...TEXTS_ADMIN,
	...TEXTS_CHILD
} as const;

export type TextAudience = 'child' | 'admin' | 'shared';
export type TextTtsPolicy = 'preRecorded' | 'runtimeOk';

// מפת מטא-דאטה בסיסית. המטרה היא להתחיל עם הדברים הקריטיים (ילד + דיבור) ולהרחיב בהדרגה.
export const TEXTS_META: Partial<Record<keyof typeof TEXTS, { audience: TextAudience; tts?: TextTtsPolicy }>> = {
	// טקסטים שמומלץ להקליט מראש (כי הם נאמרים כרגע ב-TTS)
	CHANGE_LABEL: { audience: 'child', tts: 'preRecorded' },
	TODAY_NO: { audience: 'child', tts: 'preRecorded' },

	// טקסטים של הילד (UI)
	USER_SELECTOR_TITLE: { audience: 'child' },
	LOADING_APP: { audience: 'child' },
	ALL_DONE_MESSAGE: { audience: 'child' },
	NOW: { audience: 'child' },
	DONE: { audience: 'child' },

	// מפתחות שמופיעים גם בלוח (Child) וגם במסכי ניהול (Admin)
	CANCEL: { audience: 'shared' },
	NEW_PERSON: { audience: 'shared' },
	NO_PEOPLE_IN_DB: { audience: 'shared' },
	CLICK_ADD_PERSON_TO_START: { audience: 'shared' },
	HIDE_LIST: { audience: 'shared' },
	SHOW_LIST: { audience: 'shared' }
};

// רשימת מפתחות שטקסט היעד שלהם אמור להיות מוקלט מראש כחלק מ-TTS “ילדי”.
// כרגע הרשימה נוצרת על בסיס TEXTS_META (רק מה שסומן במפורש).
export const CHILD_PRE_RECORDED_TTS_KEYS = (Object.keys(TEXTS_META) as Array<keyof typeof TEXTS>)
	.filter((k) => TEXTS_META[k]?.audience === 'child' && TEXTS_META[k]?.tts === 'preRecorded');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const txt = (key: keyof typeof TEXTS, ...args: any[]) => {
	const value = TEXTS[key];

	if (typeof value === 'function') {
		if (args.length === 0) {
			throw new Error(`Missing arguments for text key "${key}". Expected a function but no arguments were provided.`);
		}
		// TypeScript לא מסוגל להסיק חתימת פונקציה מדויקת לכל key כאן; אנחנו מאחדים לטיפוס כללי.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (value as (...fnArgs: any[]) => string)(...args);
	}

	return value;
}
