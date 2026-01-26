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
	{ id: 'animal_therapy', name: 'חוג בעלי חיים', image: 'activity_animal_therapy.png' },
	{ id: 'travel_car', name: 'נוסעים באוטו', image: 'activity_travel_car.png' },
	{ id: 'visit_building', name: 'הולכים לביקור', image: 'activity_visit_building.png' },
	{ id: 'guests_arrive', name: 'אורחים מגיעים', image: 'activity_guests_arrive.png' },
	{ id: 'guests_leave', name: 'נפרדים מהאורחים', image: 'activity_guests_leave.png' },
	{ id: 'back_home', name: 'חזרנו הביתה', image: 'activity_back_home.png' }
] as const;

export const DEFAULT_LIST_DEFINITIONS = [
	{
		id: 'morning_routine',
		name: 'שגרת בוקר',
		logo: '/images/times/list_morning_sun.png',
		items: [
			{
				activityId: 'toilet',
				order: 1,
				communicationBoardUrl: 'https://app.cboard.io/board/6954fe8429a4a1001dc7c33a'
			},
			{ activityId: 'brushing_teeth', order: 2 },
			{ activityId: 'getting_dressed', order: 3 },
			{ activityId: 'breakfast', order: 4 },
			{ activityId: 'going_to_car', order: 5 }
		],
		greeting: 'בוקר טוב',
		peopleIds: ['p_father', 'p_mother'] // בוקר: אבא ואמא
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
		greeting: 'אחרי צהריים טובים',
		peopleIds: ['p_mother'] // ערב: אמא
	},
	{
		id: 'visit_grandparents',
		name: 'נוסעים לסבא וסבתא',
		logo: '/images/people/grandfather.png', // שימוש בתמונה של סבא כלוגו הלוח
		title: 'מתכוננים לנסוע לסבא וסבתא', // כותרת מובנית
		items: [
			{ activityId: 'getting_dressed', order: 1 },
			{ activityId: 'going_to_car', order: 2 },
			{ activityId: 'travel_car', order: 3 },
			{ activityId: 'visit_building', order: 4 },
			{ activityId: 'play_time', order: 5 },
			{ activityId: 'dinner', order: 6 },
			{ activityId: 'travel_car', order: 7 }, // חזרה
			{ activityId: 'back_home', order: 8 },
			{ activityId: 'shower', order: 9 },
			{ activityId: 'sleep_time', order: 10 }
		],
		greeting: 'נסיעה טובה',
		peopleIds: ['p_grandfather', 'p_grandmother']
	},
	{
		id: 'guests_visit',
		name: 'דודים באים לבקר',
		logo: '/images/activities/activity_guests_arrive.png',
		title: 'מתכוננים לביקור של דודים',
		items: [
			{ activityId: 'getting_dressed', order: 1 },
			{ activityId: 'guests_arrive', order: 2 },
			{ activityId: 'play_time', order: 3 },
			{ activityId: 'dinner', order: 4 },
			{ activityId: 'guests_leave', order: 5 },
			{ activityId: 'shower', order: 6 },
			{ activityId: 'sleep_time', order: 7 }
		],
		greeting: 'ברוכים הבאים',
		peopleIds: ['p_uncle', 'p_aunt']
	}
];

// Helper to create initial lists for a user
export function createDefaultLists(): List[] {
	const lists = DEFAULT_LIST_DEFINITIONS.map((def) => ({
		id: def.id,
		name: def.name,
		logo: def.logo,
		greeting: (def as any).greeting,
		title: (def as any).title,
		peopleIds: (def as any).peopleIds, // מיפוי אנשים
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

	return lists;
}

export const INITIAL_STATE: AppState = {
	version: 14,
	users: [
		{
			id: 'u_ezra',
			name: 'עזרא',
			gender: 'boy',
			avatar: '/images/users/ezra.png',
			themeColor: '#4169E1',
			theme: 'theme-focus'
		},
		{
			id: 'u_tzofia',
			name: 'צופיה',
			gender: 'girl',
			avatar: '/images/users/tzofia.png',
			themeColor: '#FF69B4',
			theme: 'theme-playful'
		},
		{
			id: 'u_adam',
			name: 'אדם',
			gender: 'boy',
			avatar: '/images/users/adam.png',
			themeColor: '#32CD32',
			theme: 'theme-gradient'
		}
	],
	lists: {
		u_ezra: createDefaultLists(),
		u_tzofia: createDefaultLists(),
		u_adam: createDefaultLists()
	},
	images: {}, // מאגר מטאדטה של תמונות
	people: [
		{ id: 'p_father', name: 'אבא', avatar: '/images/people/father.png' },
		{ id: 'p_mother', name: 'אמא', avatar: '/images/people/mother.png' },
		{ id: 'p_uncle', name: 'דוד יאיר', avatar: '/images/people/uncle.png' },
		{ id: 'p_aunt', name: 'דודה אפרת', avatar: '/images/people/aunt.png' },
		{ id: 'p_grandfather', name: 'סבא', avatar: '/images/people/grandfather.png' },
		{ id: 'p_grandmother', name: 'סבתא', avatar: '/images/people/grandmother.png' }
	], // מאגר גלובלי של אנשים (צוות/משפחה)
	activeListId: {
		u_ezra: 'morning_routine',
		u_tzofia: 'morning_routine',
		u_adam: 'morning_routine'
	},
	currentUserId: null,
	settings: {
		lastActiveTime: Date.now()
	},
	lastModified: Date.now()
};
