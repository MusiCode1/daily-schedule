// src/lib/services/audioSequencer.ts

export type AudioSegment =
	| { type: 'file'; content: string } // תוכן הוא שם קובץ ב-/sounds/
	| { type: 'tts'; content: string }; // תוכן הוא טקסט להקראה

export const audioSequencer = {
	/**
	 * מנגן רצף של מקטעי אודיו (קבצים או TTS) אחד אחרי השני.
	 * מחזיר Promise שמסתיים כאשר הרצף כולו מסתיים.
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
				// המשך למקטע הבא גם אם אחד נכשל
			}
		}
	},

	playFile(filename: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const audio = new Audio(`/sounds/${filename}`);

			// טיפול בסיום
			audio.onended = () => resolve();

			// טיפול בשגיאות (למשל, קובץ לא נמצא)
			audio.onerror = (e) => {
				console.warn(`Audio file not found or failed to load: ${filename}`, e);
				resolve(); // resolve בכל מקרה כדי להמשיך ברצף
			};

			// נגן
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

			// ביטול קודם
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
