// src/lib/data/boosts.ts
import type { Gender } from '$lib/types';

export type BoostWord = {
	id: string;
	audioFile?: string | { boy: string; girl: string }; // Allow gendered audio
} & (
	| { text: string; gendered?: { boy: string; girl: string } }
	| { text?: never; gendered: { boy: string; girl: string } }
);

export const BOOST_WORDS: BoostWord[] = [
	{
		id: 'aluf',
		gendered: { boy: 'אַתָּה אַלּוּף!', girl: 'אַתְּ אַלּוּפָה!' },
		audioFile: { boy: 'aluf.mp3', girl: 'alufa.mp3' }
	},
	{
		id: 'yeled_nehedar',
		gendered: { boy: 'אַתָּה יֶלֶד נֶהֱדָר!', girl: 'אַתְּ יַלְדָּה נֶהֱדֶרֶת!' },
		audioFile: { boy: 'nehedar.mp3', girl: 'nehederet.mp3' }
	},
	{
		id: 'meule',
		text: 'מְעוּלֶה!',
		audioFile: 'meule.mp3'
	},
	{
		id: 'asita_ze',
		gendered: { boy: 'עָשִׂיתָ אֶת זֶה!', girl: 'עָשִׂית אֶת זֶה!' },
		audioFile: { boy: 'asita_ze_boy.mp3', girl: 'asita_ze_girl.mp3' }
	},
	{
		id: 'fun_task',
		text: 'סִיַּמְתָּ אֶת הַמְּשִׂימָה, אֵיזֶה כֵּיף!',
		gendered: { boy: 'סִיַּמְתָּ אֶת הַמְּשִׂימָה!', girl: 'סִיַּמְתְּ אֶת הַמְּשִׂימָה!' },
		audioFile: { boy: 'finished_task_boy.mp3', girl: 'finished_task_girl.mp3' }
	},
	{
		id: 'yofi',
		text: 'יוֹפִי!',
		audioFile: 'yofi.mp3'
	},
	{
		id: 'eize_kef',
		text: 'אֵיזֶה כֵּיף!',
		audioFile: 'eize_kef.mp3'
	}
];
