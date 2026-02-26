/**
 * @module google-drive/constants
 * קבועים עבור מבנה הקבצים והתיקיות ב-Google Drive.
 * מגדיר את שמות הקבצים והתיקיות שמשמשים לגיבוי מלוכד ב-Drive.
 */

/** שם תיקיית הגיבוי הראשית ב-Google Drive */
export const DRIVE_BACKUP_FOLDER_NAME = 'DailyScheduleBackup';

/** שם קובץ ה-manifest — מטא-דאטה של הגיבוי האחרון (writeId, hashes וכו') */
export const DRIVE_MANIFEST_FILE_NAME = 'daily_schedule_manifest.json';
/** שם קובץ התוכן — כולל משימות, לוח זמנים וכו' */
export const DRIVE_CONTENT_FILE_NAME = 'daily_schedule_content.json';
/** שם קובץ ההתקדמות — מצב סימון משימות */
export const DRIVE_PROGRESS_FILE_NAME = 'daily_schedule_progress.json';
/** שם קובץ אינדקס הנכסים — מיפוי hash ל-fileId של תמונות/קבצים */
export const DRIVE_ASSETS_INDEX_FILE_NAME = 'daily_schedule_assets.json';
/** שם קובץ היסטוריית הסנכרון */
export const DRIVE_HISTORY_FILE_NAME = 'daily_schedule_history.json';
/** שם תיקיית הנכסים (תמונות וכו') בתוך תיקיית הגיבוי */
export const DRIVE_ASSETS_FOLDER_NAME = 'assets';
