// src/lib/services/audioSequencer.ts

export type AudioSegment =
	| { type: 'file'; content: string } // content is filename in /sounds/
	| { type: 'tts'; content: string }; // content is text to speak

export const audioSequencer = {
	/**
	 * Plays a sequence of audio segments (files or TTS) one by one.
	 * Returns a promise that resolves when the entire sequence is finished.
	 */
	async playSequence(sequence: AudioSegment[]): Promise<void> {
		for (const segment of sequence) {
			try {
				if (segment.type === 'file') {
					await this.playFile(segment.content);
				} else {
					await this.playTTS(segment.content);
				}
			} catch (err) {
				console.error(`Error playing segment (${segment.type}):`, err);
				// Continue to next segment even if one fails
			}
		}
	},

	playFile(filename: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const audio = new Audio(`/sounds/${filename}`);

			// Handle completion
			audio.onended = () => resolve();

			// Handle errors (e.g., file not found)
			audio.onerror = (e) => {
				console.warn(`Audio file not found or failed to load: ${filename}`, e);
				resolve(); // Resolve anyway to continue sequence
			};

			// Play
			audio.play().catch((err) => {
				console.warn(`Playback failed for ${filename}:`, err);
				resolve();
			});
		});
	},

	playTTS(text: string, lang: string = 'he-IL'): Promise<void> {
		return new Promise((resolve) => {
			if (!('speechSynthesis' in window)) {
				console.warn('Web Speech API not supported');
				resolve();
				return;
			}

			// Cancel previous
			window.speechSynthesis.cancel();

			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = lang;
			utterance.rate = 0.9;

			utterance.onend = () => resolve();
			utterance.onerror = (e) => {
				console.warn('TTS Error:', e);
				resolve();
			};

			window.speechSynthesis.speak(utterance);
		});
	}
};
