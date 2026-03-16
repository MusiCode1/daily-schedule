// src/lib/services/audioSequencer.ts

import { createLogger } from '$lib/logger';

const log = createLogger('AudioSequencer');

export type AudioSegment =
	| { type: 'file'; content: string } // תוכן הוא שם קובץ ב-/sounds/
	| { type: 'tts'; content: string }; // תוכן הוא טקסט להקראה

export const audioSequencer = {
	// מונה גרסאות – עולה בכל קריאה ל-stop(), מבטל את הלולאה הפעילה
	_sequenceVersion: 0,

	// callback לעצירת האודיו/TTS הנוכחי ו-resolve של ה-Promise שלו
	_stopCurrentAudio: (() => {}) as () => void,

	/**
	 * עוצר את ניגון האודיו הנוכחי ומבטל את ה-sequence הפעיל.
	 * ה-Promise של playSequence יסתיים מיד.
	 */
	stop() {
		this._sequenceVersion++;
		this._stopCurrentAudio();
		this._stopCurrentAudio = () => {};
	},

	/**
	 * מנגן רצף של מקטעי אודיו (קבצים או TTS) אחד אחרי השני.
	 * אם כבר מתנגן sequence – עוצר אותו תחילה.
	 * מחזיר Promise שמסתיים כאשר הרצף כולו מסתיים (או כשמבוטל).
	 */
	async playSequence(sequence: AudioSegment[]): Promise<void> {
		this.stop(); // עצור ניגון קודם
		const version = this._sequenceVersion;

		for (const segment of sequence) {
			if (this._sequenceVersion !== version) return; // בוטלנו
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
		return new Promise((resolve) => {
			const audio = new Audio(`/sounds/${filename}`);

			// הגדרת callback לעצירה מיידית
			this._stopCurrentAudio = () => {
				audio.pause();
				resolve();
			};

			// טיפול בסיום
			audio.onended = () => {
				this._stopCurrentAudio = () => {};
				resolve();
			};

			// טיפול בשגיאות (למשל, קובץ לא נמצא)
			audio.onerror = (e) => {
				log.warn(`קובץ אודיו לא נמצא או נכשל בטעינה: ${filename}`, e);
				this._stopCurrentAudio = () => {};
				resolve(); // resolve בכל מקרה כדי להמשיך ברצף
			};

			// נגן
			audio.play().catch((err) => {
				log.warn(`ניגון נכשל עבור ${filename}:`, err);
				this._stopCurrentAudio = () => {};
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

			// הגדרת callback לעצירה מיידית
			this._stopCurrentAudio = () => {
				window.speechSynthesis.cancel();
				resolve();
			};

			utterance.onend = () => {
				this._stopCurrentAudio = () => {};
				resolve();
			};
			utterance.onerror = (e) => {
				log.warn('שגיאת TTS:', e);
				this._stopCurrentAudio = () => {};
				resolve();
			};

			window.speechSynthesis.speak(utterance);
		});
	}
};
