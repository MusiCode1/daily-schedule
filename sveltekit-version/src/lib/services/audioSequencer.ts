// src/lib/services/audioSequencer.ts

import { createLogger } from '$lib/logger';

const log = createLogger('AudioSequencer');

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
				log.error(`שגיאה בניגון מקטע (${segment.type}):`, err);
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
				log.warn(`קובץ אודיו לא נמצא או נכשל בטעינה: ${filename}`, e);
				resolve(); // resolve בכל מקרה כדי להמשיך ברצף
			};

			// נגן
			audio.play().catch((err) => {
				log.warn(`ניגון נכשל עבור ${filename}:`, err);
				resolve();
			});
		});
	},

	playTTS(text: string, lang: string = 'he-IL'): Promise<void> {
		return new Promise((resolve) => {
			if (!('speechSynthesis' in window)) {
				log.warn('Web Speech API אינו נתמך בדפדפן זה');
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
				log.warn('שגיאת TTS:', e);
				resolve();
			};

			window.speechSynthesis.speak(utterance);
		});
	}
};
