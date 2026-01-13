// src/lib/services/audio.ts

export const audioService = {
	playDing() {
		const audio = new Audio('/sounds/ui/left-ding.mp3');
		audio.play().catch((err) => console.error('Audio play failed:', err));
	},

	play(filename: string) {
		const audio = new Audio(`/sounds/${filename}`);
		audio.play().catch((err) => console.error('Audio play failed:', err));
	}
};
