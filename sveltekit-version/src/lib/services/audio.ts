// src/lib/services/audio.ts

import { createLogger } from '$lib/logger';

const log = createLogger('Audio');

export const audioService = {
	playDing() {
		const audio = new Audio('/sounds/ui/left-ding.mp3');
		audio.play().catch((err) => log.error('ניגון אודיו נכשל:', err));
	},

	play(filename: string) {
		const audio = new Audio(`/sounds/${filename}`);
		audio.play().catch((err) => log.error('ניגון אודיו נכשל:', err));
	}
};
