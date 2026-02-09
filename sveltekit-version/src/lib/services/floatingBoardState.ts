import { browser } from '$app/environment';
import { deviceState, type FloatingBoardPosition } from '$lib/stores/deviceState';

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
			const ds = deviceState.load();
			const parsed = ds.settings.ui.floatingBoard;

			// ולידציה בסיסית של הערכים
			if (
				typeof parsed?.top !== 'number' ||
				typeof parsed?.left !== 'number' ||
				typeof parsed?.width !== 'number' ||
				typeof parsed?.height !== 'number'
			) {
				console.warn('Invalid floating board state, using defaults');
				deviceState.update((draft) => {
					draft.settings.ui.floatingBoard = { ...DEFAULT_STATE };
				});
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
			const normalized: FloatingBoardPosition = {
				top: parsed.top,
				left: parsed.left,
				width: Math.max(400, Math.min(parsed.width, screenWidth * 0.95)),
				height: Math.max(300, Math.min(parsed.height, screenHeight * 0.9))
			};

			// אם בוצעו תיקונים (גבולות/גדלים), נשמור אותם כדי שהמצב יתיישר.
			if (
				normalized.top !== parsed.top ||
				normalized.left !== parsed.left ||
				normalized.width !== parsed.width ||
				normalized.height !== parsed.height
			) {
				deviceState.update((draft) => {
					draft.settings.ui.floatingBoard = normalized;
				});
			}

			return normalized;
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

			deviceState.update((draft) => {
				draft.settings.ui.floatingBoard = position;
			});
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
			deviceState.update((draft) => {
				draft.settings.ui.floatingBoard = { ...DEFAULT_STATE };
			});
		} catch (error) {
			console.error('Failed to reset floating board state:', error);
		}
	}
};
