// מידע על חיתוך תמונה (crop)
export interface ImageCropData {
	x: number; // מיקום X באחוזים (0-100)
	y: number; // מיקום Y באחוזים (0-100)
	scale: number; // זום (1 = מקורי, 2 = פי 2, וכו')
}

// מטאדטה של תמונה (נשמר בנפרד מהאובייקטים)
export interface ImageMetadata {
	crop?: ImageCropData; // נתוני חיתוך
}

// נתוני תמונה עם crop (לשימוש זמני בממשק)
export interface ImageData {
	src: string; // URL או idb:xxx
	crop?: ImageCropData; // אופציונלי - אם אין, מציג את כל התמונה
}

// סוגי שינוי למשימות
export type TaskChangeType = 'cancelled' | 'added';

export interface Task {
	id: string;
	name: string;
	imageSrc: string | null; // רק מזהה תמונה (idb:xxx או URL)
	isDone: boolean;
	communicationBoardUrl?: string; // קישור ללוח תקשורת (אופציונלי)
	changeType?: TaskChangeType; // סוג השינוי - משימה בוטלה או נוספה (אופציונלי)
}

export interface List {
	id: string;
	name: string;
	tasks: Task[];
	isDefault?: boolean;
	logo?: string; // רק מזהה תמונה
	greeting?: string;
	isHidden?: boolean;
	isLocked?: boolean; // במצב נעול, לחיצה על משימה רק משמיעה את שמה (ללא חגיגה)
	title?: string; // כותרת אופציונלית (להכנה לאירועים)
	description?: string; // תיאור קצר אופציונלי
	peopleIds?: string[]; // מזהי אנשים (צוות/משפחה) לרשימה זו
	isPeopleSectionVisible?: boolean; // האם סקשן האנשים גלוי (ברירת מחדל: true)
}

// איש (צוות/משפחה)
export interface Person {
	id: string;
	name: string;
	avatar: string; // מזהה תמונה (idb:xxx או URL)
}

export type Gender = 'boy' | 'girl';

export type ThemeType =
	| 'theme-focus'
	| 'theme-playful'
	| 'theme-gradient'
	| 'theme-contrast'
	| 'default';

export interface UserProfile {
	id: string;
	name: string;
	gender: Gender;
	avatar: string; // רק מזהה תמונה
	themeColor: string; // Hex color for borders/backgrounds
	theme?: ThemeType;
}

export interface AppState {
	version: number;
	users: UserProfile[];

	lists: { [userId: string]: List[] };

	// מאגר מטאדטה של תמונות (מפתח = מזהה תמונה)
	images: { [imageId: string]: ImageMetadata };

	// מאגר גלובלי של אנשים (צוות/משפחה)
	people: Person[];

	// Track which list is active for each user
	activeListId: { [userId: string]: string };

	currentUserId: string | null;

	settings: {
		lastActiveTime: number;
	};
	lastModified: number;
}
