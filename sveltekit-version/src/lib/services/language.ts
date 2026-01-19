// src/lib/services/language.ts
import { ACTIVITIES } from '$lib/data/defaults';
import type { Gender } from '$lib/types';
import { BOOST_WORDS } from '$lib/data/boosts';
import { TEXTS } from '$lib/data/texts';

// ייצוא מחדש של TEXTS לתאימות לאחור
export { TEXTS };

export const LanguageService = {
	getFeedbackSequence(
		gender: Gender,
		taskName: string,
		userName: string,
		nextTaskName?: string
	): { text: string; sequence: Array<{ type: 'file' | 'tts'; content: string }>; praise: string } {
		const sequence: Array<{ type: 'file' | 'tts'; content: string }> = [];
		let fullTextParts: string[] = [];

		// --- חלק 0: שם המשתמש ("יונתן!") ---
		// מיפוי שמות לקבצים
		const nameMap: Record<string, string> = {
			תמר: 'names/tamar.mp3',
			יונתן: 'names/yonatan.mp3',
			אריאל: 'names/ariel.mp3',
			אבישי: 'names/avishai.mp3'
		};

		const nameFile = nameMap[userName];

		if (nameFile) {
			sequence.push({ type: 'file', content: nameFile });
		} else {
			// fallback ל-TTS אם השם לא ברשימה
			sequence.push({ type: 'tts', content: userName });
		}

		fullTextParts.push(`${userName}! `);

		// --- חלק 1: "סיימת את [משימה]" ---
		// "סיימת את..."
		const prefixFile = gender === 'boy' ? 'finished_opt_boy.mp3' : 'finished_opt_girl.mp3';
		sequence.push({ type: 'file', content: prefixFile });
		fullTextParts.push(TEXTS.FINISHED_TASK(gender, taskName));

		// שם המשימה (קובץ או TTS)
		const taskId = this.findActivityIdByName(taskName);
		if (taskId) {
			sequence.push({ type: 'file', content: `${taskId}.mp3` });
		} else {
			sequence.push({ type: 'tts', content: taskName });
		}

		// --- חלק 2: חיזוק (מחמאה) ---
		const randomIndex = Math.floor(Math.random() * BOOST_WORDS.length);
		const boost = BOOST_WORDS[randomIndex];

		const boostText = boost.gendered ? boost.gendered[gender] : boost.text || TEXTS.WELL_DONE;
		fullTextParts.push(`! ${boostText}`);

		const boostRequestFile =
			typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;

		if (boostRequestFile) {
			sequence.push({ type: 'file', content: boostRequestFile });
		}

		// --- חלק 3: המשימה הבאה או סיום הכל ---
		if (nextTaskName) {
			// "ועכשיו..."
			sequence.push({ type: 'file', content: 'now.mp3' });
			fullTextParts.push(TEXTS.NOW_NEXT(nextTaskName));

			// שם המשימה הבאה
			const nextId = this.findActivityIdByName(nextTaskName);
			if (nextId) {
				sequence.push({ type: 'file', content: `${nextId}.mp3` });
			} else {
				sequence.push({ type: 'tts', content: nextTaskName });
			}
		} else {
			// הכל הושלם!
			const allDoneFile = gender === 'boy' ? 'all_done_boy.mp3' : 'all_done_girl.mp3';
			sequence.push({ type: 'file', content: allDoneFile });
			fullTextParts.push(`. ${TEXTS.ALL_DONE_MESSAGE}`);
		}

		return {
			text: fullTextParts.join(''),
			sequence,
			praise: boostText
		};
	},

	findActivityIdByName(name: string): string | undefined {
		const activity = ACTIVITIES.find((a) => a.name === name);
		return activity?.id;
	}
};
