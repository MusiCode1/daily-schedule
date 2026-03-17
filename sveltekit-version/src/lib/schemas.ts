// סכמות ArkType — מקור האמת לטיפוסי הפרויקט.
// הטיפוסים מופקים אוטומטית מהסכמות (type inference).
import { type } from 'arktype';

const $ = type.scope({

	activity: {
		id: 'string',
		name: 'string',
		image: 'string | null'
	},
	// ─── תמונות ───

	imageCropData: {
		x: 'number',
		y: 'number',
		scale: 'number'
	},

	imageMetadata: {
		'crop?': 'imageCropData'
	},

	imageData: {
		src: 'string',
		'crop?': 'imageCropData'
	},

	// ─── משימות ───

	taskChangeType: "'cancelled' | 'added'",

	task: {
		id: 'string',
		name: 'string',
		imageSrc: 'string | null',
		order: 'number',
		'communicationBoardUrl?': 'string',
		'changeType?': 'taskChangeType'
	},

	// ─── רשימות ───

	list: {
		id: 'string',
		name: 'string',
		tasks: 'Record<string, task>',
		'isDefault?': 'boolean',
		'logo?': 'string',
		'greeting?': 'string',
		'isHidden?': 'boolean',
		'isLocked?': 'boolean',
		'title?': 'string',
		'description?': 'string',
		'peopleIds?': 'string[]',
		'isPeopleSectionVisible?': 'boolean',
		'order?': 'number'
	},

	// ─── אנשים ───

	person: {
		id: 'string',
		name: 'string',
		avatar: 'string'
	},

	// ─── משתמשים ───

	gender: "'boy' | 'girl'",

	themeType:
		"'theme-focus' | 'theme-playful' | 'theme-gradient' | 'theme-contrast' | 'default'",

	userProfile: {
		id: 'string',
		name: 'string',
		gender: 'gender',
		avatar: 'string',
		themeColor: 'string',
		'theme?': 'themeType'
	},

	// ─── קיצורי דרך ───

	websiteShortcut: {
		id: 'string',
		label: 'string',
		url: 'string',
		'emoji?': 'string'
	},

	// ─── סנכרון ───

	syncMetadata: {
		lastModified: 'number',
		lastModifiedByDeviceId: 'string',
		writeId: 'string',
		'parentWriteId?': 'string',
		'parentTimestamp?': 'number'
	},

	// ─── הגדרות ───

	appSettings: {
		activeListId: 'Record<string, string>',
		currentUserId: 'string | null',
		childLockEnabled: 'boolean',
		websiteShortcuts: 'websiteShortcut[]',
		taskClickCooldownEnabled: 'boolean'
	},

	localDevice: {
		lastModified: 'number',
		lastActiveTime: 'number',
		'syncMetadata?': 'syncMetadata'
	},

	// ─── מצב ראשי ───

	appState: {
		version: 'number',
		users: 'Record<string, userProfile>',
		people: 'Record<string, person>',
		lists: 'Record<string, Record<string, list>>',
		images: 'Record<string, imageMetadata>',
		taskProgress: 'Record<string, boolean>',
		settings: 'appSettings',
		localDevice: 'localDevice'
	},

	savedWebsite: {
		id: 'string',
		label: 'string',
		url: 'string',
		'logoUrl?': 'string'
	}
});


export const schemas = $.export();

// ─── ייצוא טיפוסים ───
export type Activity = typeof schemas.activity.infer;
export type ImageCropData = typeof schemas.imageCropData.infer;
export type ImageMetadata = typeof schemas.imageMetadata.infer;
export type ImageData = typeof schemas.imageData.infer;
export type TaskChangeType = typeof schemas.taskChangeType.infer;
export type Task = typeof schemas.task.infer;
export type List = typeof schemas.list.infer;
export type Person = typeof schemas.person.infer;
export type Gender = typeof schemas.gender.infer;
export type ThemeType = typeof schemas.themeType.infer;
export type UserProfile = typeof schemas.userProfile.infer;
export type WebsiteShortcut = typeof schemas.websiteShortcut.infer;
export type SyncMetadata = typeof schemas.syncMetadata.infer;
export type AppState = typeof schemas.appState.infer;
export type SavedWebsite = typeof schemas.savedWebsite.infer;
