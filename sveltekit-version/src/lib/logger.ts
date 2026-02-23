// מודול לוגינג מרכזי — יצירת לוגר ייעודי לכל מודול

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// הגדרות גלובליות: ברירת מחדל לפי סביבה
const globalConfig: { level: LogLevel; enabled: boolean } = {
	level: import.meta.env.DEV ? 'debug' : 'warn',
	enabled: true
};

// הגדרות ייעודיות פר-מודול (מאפשרות override)
const moduleConfigs = new Map<string, { level?: LogLevel; enabled?: boolean }>();

/**
 * יוצר לוגר ייעודי למודול.
 * @example
 * const log = createLogger('AudioSequencer');
 * log.debug('מנגן מקטע:', segment);
 * log.error('שגיאה:', err);
 */
export function createLogger(moduleName: string) {
	const tag = `[${moduleName}]`;

	const canLog = (lvl: LogLevel): boolean => {
		const cfg = moduleConfigs.get(moduleName);
		if (!(cfg?.enabled ?? globalConfig.enabled)) return false;
		return LEVELS[lvl] >= LEVELS[cfg?.level ?? globalConfig.level];
	};

	return {
		debug: (...args: unknown[]) => canLog('debug') && console.debug(tag, ...args),
		info:  (...args: unknown[]) => canLog('info')  && console.info(tag, ...args),
		warn:  (...args: unknown[]) => canLog('warn')  && console.warn(tag, ...args),
		error: (...args: unknown[]) => canLog('error') && console.error(tag, ...args)
	};
}

/**
 * ממשק ניהול לוגינג גלובלי.
 * בסביבת dev חשוף גם ב-window.__logManager לשליטה מה-console.
 *
 * @example
 * // שתיקת כל הלוגים
 * logManager.setGlobalEnabled(false)
 *
 * // הגברת דיבאג למודול ספציפי בלבד
 * logManager.setModuleLevel('Migration', 'debug')
 */
export const logManager = {
	setGlobalLevel:   (level: LogLevel)            => { globalConfig.level = level; },
	setGlobalEnabled: (enabled: boolean)           => { globalConfig.enabled = enabled; },
	setModuleLevel:   (module: string, level: LogLevel)  =>
		moduleConfigs.set(module, { ...moduleConfigs.get(module), level }),
	setModuleEnabled: (module: string, enabled: boolean) =>
		moduleConfigs.set(module, { ...moduleConfigs.get(module), enabled })
};

// חשיפה ל-window בסביבת dev לשליטה נוחה מה-console
if (import.meta.env.DEV && typeof window !== 'undefined') {
	(window as unknown as Record<string, unknown>).__logManager = logManager;
}
