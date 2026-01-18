import { browser } from '$app/environment';

// ממשק למיקום וגודל החלון הצף
interface FloatingBoardPosition {
	top: number;
	left: number;
	width: number;
	height: number;
}

// מפתח ב-localStorage
const STORAGE_KEY = 'floating-board-state';

// ערכי ברירת מחדל
const DEFAULT_STATE: FloatingBoardPosition = {
	top: 100,
	left: 100,
	width: 800,
	height: 600
};

/**
 * שירות לניהול מצב החלון הצף של לוח התקשורת
 * שומר ומטעין את המיקום והגודל מ-localStorage
 */
export const floatingBoardState = {
	/**
	 * טוען את מצב החלון השמור
	 * @returns המיקום והגודל השמורים, או ברירת מחדל אם אין שמור/שגיאה
	 */
	load(): FloatingBoardPosition {
		// בצד השרת, להחזיר ברירת מחדל
		if (!browser) {
			return { ...DEFAULT_STATE };
		}

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) {
				return { ...DEFAULT_STATE };
			}

			const parsed = JSON.parse(stored) as FloatingBoardPosition;

			// ולידציה בסיסית של הערכים
			if (
				typeof parsed.top !== 'number' ||
				typeof parsed.left !== 'number' ||
				typeof parsed.width !== 'number' ||
				typeof parsed.height !== 'number'
			) {
				console.warn('Invalid floating board state, using defaults');
				return { ...DEFAULT_STATE };
			}

			// וידוא שהחלון נמצא בתוך גבולות המסך
			// אם המיקום מחוץ לגבולות, נשתמש בברירת מחדל
			const screenWidth = window.innerWidth;
			const screenHeight = window.innerHeight;

			// בדיקה שהחלון לא מחוץ למסך (לפחות 200px רוחב ו-100px גובה גלויים)
			if (parsed.left < 0 || parsed.left > screenWidth - 200) {
				parsed.left = DEFAULT_STATE.left;
			}
			if (parsed.top < 0 || parsed.top > screenHeight - 100) {
				parsed.top = DEFAULT_STATE.top;
			}

			// וידוא גודל מינימלי ומקסימלי סביר
			parsed.width = Math.max(400, Math.min(parsed.width, screenWidth * 0.95));
			parsed.height = Math.max(300, Math.min(parsed.height, screenHeight * 0.9));

			return parsed;
		} catch (error) {
			console.error('Failed to load floating board state:', error);
			return { ...DEFAULT_STATE };
		}
	},

	/**
	 * שומר את מצב החלון ל-localStorage
	 * @param position המיקום והגודל לשמירה
	 */
	save(position: FloatingBoardPosition): void {
		// אין לשמור בצד השרת
		if (!browser) {
			return;
		}

		try {
			// ולידציה בסיסית לפני שמירה
			if (
				typeof position.top !== 'number' ||
				typeof position.left !== 'number' ||
				typeof position.width !== 'number' ||
				typeof position.height !== 'number' ||
				isNaN(position.top) ||
				isNaN(position.left) ||
				isNaN(position.width) ||
				isNaN(position.height)
			) {
				console.warn('Invalid position data, not saving');
				return;
			}

			localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
		} catch (error) {
			console.error('Failed to save floating board state:', error);
		}
	},

	/**
	 * מוחק את המצב השמור (שימושי לדיבאג או איפוס)
	 */
	reset(): void {
		if (!browser) {
			return;
		}

		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error('Failed to reset floating board state:', error);
		}
	}
};
