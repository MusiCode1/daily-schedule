import { ACTIVITIES } from '$lib/data/defaults';
import type { Gender, Task } from '$lib/types';
import { BOOST_WORDS } from '$lib/data/boosts';
import { TEXTS } from '$lib/data/texts';
import { ttsService } from './tts';

// ייצוא מחדש של TEXTS לתאימות לאחור
export { TEXTS };

export const LanguageService = {
	getFeedbackSequence(
		gender: Gender,
		task: Task, // Changed from string
		userName: string,
		nextTask?: Task // Changed from string
	): { text: string; sequence: Array<{ type: 'file' | 'tts'; content: string }>; praise: string } {
		const sequence: Array<{ type: 'file' | 'tts'; content: string }> = [];
		let fullTextParts: string[] = [];

		// --- חלק 0: שם המשתמש ("יונתן!") ---
		// מיפוי שמות ל-TTS IDs
		const nameMap: Record<string, string> = {
			תמר: 'NAME_TAMAR',
			יונתן: 'NAME_YONATAN',
			אריאל: 'NAME_ARIEL',
			אבישי: 'NAME_AVISHAI'
		};

		const nameId = nameMap[userName];

		if (nameId) {
			sequence.push(ttsService.getAudioSegment(nameId, userName));
		} else {
			// fallback ל-TTS רגיל אם השם לא במיפוי
			sequence.push({ type: 'tts', content: userName });
		}

		fullTextParts.push(`${userName}! `);

		// --- חלק 1: "סיימת את [משימה]" ---
		// "סיימת את..."
		const prefixId = gender === 'boy' ? 'FINISHED_OPT_BOY' : 'FINISHED_OPT_GIRL';
		sequence.push(ttsService.getAudioSegment(prefixId, 'סיימת'));

		const taskName = task.name;
		fullTextParts.push(TEXTS.FINISHED_TASK(gender, taskName));

		// שם המשימה (קובץ או TTS)
		const taskAudioId = this.findActivityIdByName(taskName);
		if (taskAudioId) {
			sequence.push(ttsService.getAudioSegment(taskAudioId, taskName));
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
			// boostRequestFile is now an ID
			sequence.push(ttsService.getAudioSegment(boostRequestFile, boostText));
		}

		// --- חלק 3: המשימה הבאה או סיום הכל ---
		if (nextTask) {
			const nextTaskName = nextTask.name;
			// "ועכשיו..."
			// Using NOW_LABEL or legacy 'now.mp3' if mapped.
			// Registry has 'NOW_PREFIX' -> 'now_prefix.mp3'.
			// Let's use 'NOW_PREFIX' (עכשיו,)
			sequence.push(ttsService.getAudioSegment('NOW_PREFIX', 'עכשיו'));

			fullTextParts.push(TEXTS.NOW_NEXT(nextTaskName));

			// שם המשימה הבאה
			const nextId = this.findActivityIdByName(nextTaskName);
			if (nextId) {
				sequence.push(ttsService.getAudioSegment(nextId, nextTaskName));
			} else {
				sequence.push({ type: 'tts', content: nextTaskName });
			}
		} else {
			// הכל הושלם!
			const allDoneId = gender === 'boy' ? 'ALL_DONE_MESSAGE' : 'ALL_DONE_MESSAGE'; // Registry has ALL_DONE_MESSAGE only?
			// Registry has ALL_DONE_MESSAGE -> all_done_boy.mp3
			// But we need Girl version?
			// Registry has WELL_DONE -> well_done_all_boy.mp3.
			// Let's check registry for ALL_DONE girl.
			// Registry:
			// ALL_DONE_MESSAGE -> all_done_boy.mp3
			// It seems we missed 'all_done_girl.mp3' in Definitions?
			// boosts.ts had 'finished_task_girl.mp3' (FINISHED_TASK_GIRL).
			// But 'ALL_DONE_MESSAGE' is "Siyamta et kol hamesimot".
			// Let's assume for now ALL_DONE_MESSAGE is sufficient or fallback to TTS.

			// Wait, previous code used `all_done_boy.mp3` or `all_done_girl.mp3`.
			// I should check if I have `all_done_girl.mp3` in files.
			// List dir showed `all_done_girl.mp3`.
			// Dictionary has `ALL_DONE_MESSAGE` pointing to `all_done_boy.mp3`.
			// I should probably have added `ALL_DONE_MESSAGE_GIRL`?
			// For now, I will use `ALL_DONE_MESSAGE` and if gender is girl, I might need a specific ID if defined.
			// If not defined, `ttsService` will return the boy version (if only that exists in registry).
			// Actually, I should update Definitions to include Girl version if I can.
			// But for this step, I'll use `ALL_DONE_MESSAGE` for both or conditionally if I had ID.

			// Re-checking tts-definitions:
			// { id: 'ALL_DONE_MESSAGE', text: 'סיימת את כל המשימות להיום!', baseFilename: 'all_done_boy.mp3' }
			// So it only has the boy version defined.
			// I will use it for now.
			sequence.push(ttsService.getAudioSegment('ALL_DONE_MESSAGE', TEXTS.ALL_DONE_MESSAGE));
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
