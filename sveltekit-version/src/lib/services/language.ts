// src/lib/services/language.ts
import { ACTIVITIES } from '$lib/data/defaults';
import type { Gender } from '$lib/types';
import { BOOST_WORDS, type BoostWord } from '$lib/data/boosts';

export const TEXTS = {
	APP_TITLE: 'סדר יום ויזואלי',

	// הגדרות / בחירת משתמש
	SETTINGS_TITLE: 'הגדרות מערכת',
	USERS_TAB: 'משתמשים',
	LISTS_TAB: 'רשימות',
	GENERAL_TAB: 'כללי',
	USER_MANAGEMENT: 'ניהול משתמשים',
	LIST_MANAGEMENT: 'ניהול רשימות',
	GENERAL_SETTINGS: 'הגדרות כלליות',
	USER_SELECTOR_TITLE: 'מי משתמש בלוח היום?',
	LOGIN_AS: (name: string) => `התחבר כ-${name}`,
	NEW_USER: '+ משתמש חדש',
	EDIT_USER: 'עריכת משתמש',
	SAVE: 'שמור',
	CANCEL: 'ביטול',
	DELETE: 'מחיקה',
	EDIT: 'עריכה',
	BACK_TO_BOARD: '➡️ חזרה ללוח',

	// רשימות
	NEW_LIST: '+ רשימה חדשה',
	EDIT_LIST: 'עריכת רשימה',
	LIST_NAME: 'שם הרשימה',
	GREETING: 'ברכה',
	GREETING_PLACEHOLDER: 'למשל: בוקר טוב',
	DEFAULT_GREETING: 'בהצלחה',
	LOGO: 'אייקון/תמונה',

	// מודאל הוספה
	ADD_ACTIVITY: 'הוסף פעילות',
	ACTIVITY_NAME: 'שם הפעילות',
	CHOOSE_OR_TYPE: 'בחר מהרשימה או הקלד...',
	CHOOSE_IMAGE_OPTIONAL: 'בחירת תמונה (אופציונלי):',

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
	NOW_NEXT: (nextTaskName: string) => `. עכשיו, ${nextTaskName}`
};

export const LanguageService = {
	getFeedbackSequence(
		gender: Gender,
		taskName: string,
		userName: string,
		nextTaskName?: string
	): { text: string; sequence: Array<{ type: 'file' | 'tts'; content: string }>; praise: string } {
		const sequence: Array<{ type: 'file' | 'tts'; content: string }> = [];
		let fullTextParts: string[] = [];

		// --- חלק 0: שם המשתמש ("יונתן!") ---
		// מיפוי שמות לקבצים
		const nameMap: Record<string, string> = {
			תמר: 'names/tamar.mp3',
			יונתן: 'names/yonatan.mp3',
			אריאל: 'names/ariel.mp3',
			אבישי: 'names/avishai.mp3'
		};

		const nameFile = nameMap[userName];

		if (nameFile) {
			sequence.push({ type: 'file', content: nameFile });
		} else {
			// fallback ל-TTS אם השם לא ברשימה
			sequence.push({ type: 'tts', content: userName });
		}

		fullTextParts.push(`${userName}! `);

		// --- חלק 1: "סיימת את [משימה]" ---
		// "סיימת את..."
		const prefixFile = gender === 'boy' ? 'finished_opt_boy.mp3' : 'finished_opt_girl.mp3';
		sequence.push({ type: 'file', content: prefixFile });
		fullTextParts.push(TEXTS.FINISHED_TASK(gender, taskName));

		// שם המשימה (קובץ או TTS)
		const taskId = this.findActivityIdByName(taskName);
		if (taskId) {
			sequence.push({ type: 'file', content: `${taskId}.mp3` });
		} else {
			sequence.push({ type: 'tts', content: taskName });
		}

		// --- חלק 2: חיזוק (מחמאה) ---
		const randomIndex = Math.floor(Math.random() * BOOST_WORDS.length);
		const boost = BOOST_WORDS[randomIndex];

		const boostText = boost.gendered ? boost.gendered[gender] : boost.text || TEXTS.WELL_DONE;
		fullTextParts.push(`! ${boostText}`);

		const boostRequestFile =
			typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;

		if (boostRequestFile) {
			sequence.push({ type: 'file', content: boostRequestFile });
		}

		// --- חלק 3: המשימה הבאה או סיום הכל ---
		if (nextTaskName) {
			// "ועכשיו..."
			sequence.push({ type: 'file', content: 'now.mp3' });
			fullTextParts.push(TEXTS.NOW_NEXT(nextTaskName));

			// שם המשימה הבאה
			const nextId = this.findActivityIdByName(nextTaskName);
			if (nextId) {
				sequence.push({ type: 'file', content: `${nextId}.mp3` });
			} else {
				sequence.push({ type: 'tts', content: nextTaskName });
			}
		} else {
			// הכל הושלם!
			const allDoneFile = gender === 'boy' ? 'all_done_boy.mp3' : 'all_done_girl.mp3';
			sequence.push({ type: 'file', content: allDoneFile });
			fullTextParts.push(`. ${TEXTS.ALL_DONE_MESSAGE}`);
		}

		return {
			text: fullTextParts.join(''),
			sequence,
			praise: boostText
		};
	},

	findActivityIdByName(name: string): string | undefined {
		const activity = ACTIVITIES.find((a) => a.name === name);
		return activity?.id;
	}
};
