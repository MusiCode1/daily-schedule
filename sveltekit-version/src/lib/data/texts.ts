// src/lib/data/texts.ts
import type { Gender } from '$lib/types';

export const TEXTS = {
	APP_TITLE: 'סדר יום ויזואלי',

	// הגדרות / בחירת משתמש
	SETTINGS_TITLE: 'הגדרות מערכת',
	USERS_TAB: 'משתמשים',
	LISTS_TAB: 'רשימות',
	PEOPLE_TAB: 'אנשים',
	GENERAL_TAB: 'כללי',
	USER_MANAGEMENT: 'ניהול משתמשים',
	LIST_MANAGEMENT: 'ניהול רשימות',
	PEOPLE_MANAGEMENT: 'ניהול אנשים',
	GENERAL_SETTINGS: 'הגדרות כלליות',
	USER_SELECTOR_TITLE: 'מי משתמש בלוח היום?',
	LOGIN_AS: (name: string) => `התחבר כ-${name}`,
	NEW_USER: '+ משתמש חדש',
	EDIT_USER: 'עריכת משתמש',
	SAVE: 'שמור',
	CANCEL: 'ביטול',
	DELETE: 'מחיקה',
	EDIT: 'עריכה',
	DUPLICATE: 'שכפל',
	RESET_ALL_TASKS: 'אפס את כל המשימות',
	RESET_TASKS_CONFIRM: 'לאפס את כל המשימות ברשימה זו? (כל המשימות יסומנו כלא בוצעו)',
	HIDE_LIST: 'הסתר רשימה',
	SHOW_LIST: 'הצג רשימה',
	HIDDEN_LIST: '(מוסתרת)',
	BACK_TO_BOARD: '➡️ חזרה ללוח',

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

	// אנשים (צוות ומשפחה)
	PEOPLE: 'אנשים',
	NEW_PERSON: 'הוסף אדם חדש',
	EDIT_PERSON: 'עריכת אדם',
	PERSON_NAME: 'שם האדם',
	WHO_WILL_BE_WITH_US: 'מי יהיה איתנו היום?',
	SELECT_PEOPLE_FOR_LIST: 'בחר אנשים לרשימה זו',
	SHOW_HIDE_PEOPLE: 'הצג/הסתר אנשים',

	// מודאל הוספה
	ADD_ACTIVITY: 'הוסף פעילות',
	ACTIVITY_NAME: 'שם הפעילות',
	CHOOSE_OR_TYPE: 'בחר מהרשימה או הקלד...',
	CHOOSE_IMAGE_OPTIONAL: 'בחירת תמונה (אופציונלי):',
	COMMUNICATION_BOARD_URL: 'קישור ללוח תקשורת (אופציונלי)',
	COMMUNICATION_BOARD_PLACEHOLDER: 'https://app.cboard.io/board/...',
	COMMUNICATION_BOARD: 'לוח תקשורת',
	OPEN_COMMUNICATION_BOARD: 'פתח לוח תקשורת',
	MARK_AS_CHANGE: 'סמן כמשימת שינוי',
	CHANGE_CANCELLED: 'משימה בוטלה',
	CHANGE_ADDED: 'פעילות חדשה',
	CHANGE_LABEL: 'שינוי!',
	NEW_ACTIVITY_LABEL: 'פעילות חדשה',

	// טפסים
	NAME: 'שם',
	GENDER: 'מין',
	BOY: 'בן',
	GIRL: 'בת',
	AVATAR: 'תמונה',

	// משוב / חיזוקים
	WELL_DONE: 'כל הכבוד!',
	ALL_DONE_MESSAGE: 'סיימת את כל המשימות להיום!',
	FINISHED_PREFIX: (gender: Gender) => (gender === 'boy' ? 'סיימת את' : 'סיימת את'),
	NOW_PREFIX: 'עכשיו,',
	FINISHED_TASK: (gender: Gender, taskName: string) => `סיימת את ${taskName}`,
	NOW_NEXT: (nextTaskName: string) => `. עכשיו, ${nextTaskName}`,

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
	CONFLICT_REMOTE_NEWER:
		'נראה שהשתמשת באפליקציה במכשיר אחר. הגיבוי בענן עדכני יותר מהמידע במכשיר הזה.',
	REMOTE_VERSION: 'גיבוי בענן (מומלץ)',
	LOCAL_VERSION: 'מידע מקומי (דריסת הענן)',
	KEEP_REMOTE: 'עדכן מהענן',
	KEEP_LOCAL: 'השאר מקומי',
	CLIENT_ID_LABEL: 'מזהה לקוח (Client ID) - מתקדם',
	CLIENT_ID_PLACEHOLDER: 'הזן Client ID מותאם אישית (אופציונלי)'
};
