export interface Task {
	id: string;
	name: string;
	imageSrc: string | null;
	isDone: boolean;
}

export interface List {
	id: string;
	name: string;
	tasks: Task[];
	isDefault?: boolean;
	logo?: string;
	greeting?: string;
}

export type Gender = 'boy' | 'girl';

export interface UserProfile {
	id: string;
	name: string;
	gender: Gender;
	avatar: string; // URL or local path
	themeColor: string; // Hex color for borders/backgrounds
}

export interface AppState {
	version: number;
	users: UserProfile[];
	// user_id -> list_id -> Task[] (Legacy support, maybe we just store Lists)
	// Let's stick to the plan: users have lists.
	// Actually, let's simplify. Each user has a set of lists.

	lists: { [userId: string]: List[] };

	// Track which list is active for each user
	activeListId: { [userId: string]: string };

	currentUserId: string | null;

	settings: {
		lastActiveTime: number;
	};
	lastModified: number;
}
