// src/lib/data/defaults.ts
import type { AppState, List } from '$lib/types';

export const ACTIVITIES = [
	{ id: 'toilet', name: 'שירותים', image: 'activity_toilet.png' },
	{ id: 'breakfast', name: 'ארוחת בוקר', image: 'activity_breakfast.png' },
	{ id: 'lunch', name: 'ארוחת צהריים', image: 'activity_lunch.png' },
	{ id: 'dinner', name: 'ארוחת ערב', image: 'activity_dinner.png' },
	{ id: 'brushing_teeth', name: 'לצחצח שיניים', image: 'activity_brushing_teeth.png' },
	{ id: 'shower', name: 'להתקלח', image: 'activity_shower.png' },
	{ id: 'getting_dressed', name: 'להתלבש', image: 'activity_getting_dressed.png' },
	{ id: 'going_to_car', name: 'ללכת לאוטו', image: 'activity_going_to_car.png' },
	{ id: 'play_time', name: 'זמן משחק', image: 'activity_play_time.png' },
	{ id: 'sleep_time', name: 'זמן שינה', image: 'activity_sleep_time.png' },
	{ id: 'tablet', name: 'טאבלט', image: 'activity_tablet.png' },
	{ id: 'lesson', name: 'שיעור', image: 'activity_lesson.png' },
	{ id: 'playground', name: 'ללכת לגינה', image: 'activity_playground.png' },
	{ id: 'arts_and_crafts', name: 'ציור ויצירה', image: 'activity_arts_and_crafts.png' },
	{ id: 'medicine', name: 'לקחת תרופות', image: 'activity_medicine.png' },
	{ id: 'grandparents', name: 'ללכת לסבא וסבתא', image: 'activity_grandparents.png' },
	{ id: 'prayer', name: 'תפילה', image: 'activity_prayer.png' },
	{ id: 'box_work', name: 'עבודה בקופסאות עבודה', image: 'activity_box_work.png' },
	{ id: 'yard', name: 'חצר', image: 'activity_yard.png' },
	{ id: 'animal_therapy', name: 'חוג בעלי חיים', image: 'activity_animal_therapy.png' }
] as const;

export const DEFAULT_LIST_DEFINITIONS = [
	{
		id: 'morning_routine',
		name: 'שגרת בוקר',
		logo: '/images/times/list_morning_sun.png',
		items: [
			{ activityId: 'toilet', order: 1 },
			{ activityId: 'brushing_teeth', order: 2 },
			{ activityId: 'getting_dressed', order: 3 },
			{ activityId: 'breakfast', order: 4 },
			{ activityId: 'going_to_car', order: 5 }
		],
		greeting: 'בוקר טוב'
	},
	{
		id: 'afternoon_routine',
		name: 'אחרי הצהריים',
		logo: '/images/times/list_afternoon_sunset.png',
		items: [
			{ activityId: 'lunch', order: 1 },
			{ activityId: 'play_time', order: 2 },
			{ activityId: 'tablet', order: 3 },
			{ activityId: 'dinner', order: 4 },
			{ activityId: 'shower', order: 5 },
			{ activityId: 'sleep_time', order: 6 }
		],
		greeting: 'אחרי צהריים טובים'
	}
];

// Helper to create initial lists for a user
export function createDefaultLists(): List[] {
	return DEFAULT_LIST_DEFINITIONS.map((def) => ({
		id: def.id,
		name: def.name,
		logo: def.logo,
		greeting: (def as any).greeting,
		tasks: def.items
			.map((item) => {
				const activity = ACTIVITIES.find((a) => a.id === item.activityId);
				if (!activity) return null;

				return {
					id: crypto.randomUUID(),
					name: activity.name,
					imageSrc: `/images/activities/${activity.image}`,
					isDone: false
				};
			})
			.filter((t) => t !== null) as any[]
	}));
}

export const INITIAL_STATE: AppState = {
	version: 1,
	users: [
		{
			id: 'u1',
			name: 'תמר',
			gender: 'girl',
			avatar: '/images/users/tamar.png',
			themeColor: '#FF69B4'
		},
		{
			id: 'u2',
			name: 'יונתן',
			gender: 'boy',
			avatar: '/images/users/yehonatan.png',
			themeColor: '#4169E1'
		},
		{
			id: 'u3',
			name: 'אריאל',
			gender: 'boy',
			avatar: '/images/users/ariel.png',
			themeColor: '#32CD32'
		}
	],
	lists: {
		u1: createDefaultLists(),
		u2: createDefaultLists(),
		u3: createDefaultLists()
	},
	activeListId: {
		u1: 'morning_routine',
		u2: 'morning_routine',
		u3: 'morning_routine'
	},
	currentUserId: null,
	settings: {
		lastActiveTime: Date.now()
	},
	lastModified: Date.now()
};
