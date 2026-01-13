// src/lib/services/boosts.ts
import { BOOST_WORDS, type BoostWord } from '$lib/data/boosts';
import type { Gender } from '$lib/types';
import { audioService } from './audio';
import { type AudioSegment } from './audioSequencer';
import { ACTIVITIES } from '$lib/data/defaults';
import { LanguageService } from './language';

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
			text = 'כל הכבוד!'; // Fallback
		}

		// Play specific audio
		const audioFile =
			typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;

		if (audioFile) {
			audioService.play(audioFile);
		} else {
			audioService.playDing();
		}

		return text;
	},

	getFeedbackSequence(gender: Gender, taskName: string, nextTaskName?: string) {
		return LanguageService.getFeedbackSequence(gender, taskName, nextTaskName);
	}
};
