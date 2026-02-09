import { BOOST_WORDS, type BoostWord } from '$lib/data/boosts';
import type { Gender, Task } from '$lib/types';
import { audioService } from './audio';
import { type AudioSegment } from './audioSequencer';
import { ACTIVITIES } from '$lib/data/defaults';
import { LanguageService } from './language';
import { TEXTS } from '$lib/data/texts';
import { ttsService } from './tts';

export const boostService = {
	getRandomBoost(gender: Gender): string {
		const randomIndex = Math.floor(Math.random() * BOOST_WORDS.length);
		const boost = BOOST_WORDS[randomIndex];

		let text = '';
		if (boost.text) {
			text = boost.text;
		} else if (boost.gendered) {
			text = boost.gendered[gender];
		} else {
			text = TEXTS.WELL_DONE; // Fallback
		}

		// ניגון אודיו ספציפי
		const audioId = typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;

		if (audioId) {
			// Resolve TTS ID to file
			const filename = ttsService.getTtsFile(audioId);
			if (filename) {
				audioService.play(filename);
			} else {
				// No file found for ID, fallback to ding
				audioService.playDing();
			}
		} else {
			audioService.playDing();
		}

		return text;
	},

	getFeedbackSequence(gender: Gender, task: Task, userName: string, nextTask?: Task) {
		return LanguageService.getFeedbackSequence(gender, task, userName, nextTask);
	}
};
