// Google Client ID
// This should be replaced with the actual Client ID from Google Cloud Console
// For local development, this might need to be added// Google Drive API Configuration
export const GOOGLE_CLIENT_ID =
	import.meta.env.VITE_GOOGLE_CLIENT_ID ||
	'98969397312-kbgbaude0d54rfc4qf1h2ks0me1vr7ac.apps.googleusercontent.com'; // TODO: User needs to provide this
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
export const BACKUP_FILE_NAME = 'daily_schedule_backup.json';
