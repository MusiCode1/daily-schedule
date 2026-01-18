import { globalState } from './globalState.svelte';
import type { ImageMetadata } from '../types';

/**
 * Store לניהול מטאדטה של תמונות (crop וכו')
 * 
 * מפריד בין מזהה התמונה (idb:xxx) לבין המטאדטה שלה (crop).
 * זה שומר על מבנה נקי ומאפשר לנהל מטאדטה מרכזית לכל התמונות.
 */
export class ImageStore {
	/**
	 * שליפת מטאדטה של תמונה
	 * @param imageId - מזהה התמונה (למשל: idb:abc123 או /images/avatar.png)
	 * @returns מטאדטה של התמונה או null אם לא קיימת
	 */
	getImageMetadata(imageId: string | null): ImageMetadata | null {
		if (!imageId) return null;
		return globalState.state.images[imageId] || null;
	}

	/**
	 * שמירת מטאדטה של תמונה
	 * @param imageId - מזהה התמונה
	 * @param metadata - מטאדטה לשמירה
	 */
	setImageMetadata(imageId: string, metadata: ImageMetadata): void {
		globalState.state.images[imageId] = metadata;
		globalState.save();
	}

	/**
	 * מחיקת מטאדטה של תמונה
	 * @param imageId - מזהה התמונה
	 */
	deleteImageMetadata(imageId: string): void {
		delete globalState.state.images[imageId];
		globalState.save();
	}

	/**
	 * בדיקה אם קיימת מטאדטה לתמונה
	 * @param imageId - מזהה התמונה
	 */
	hasImageMetadata(imageId: string | null): boolean {
		if (!imageId) return false;
		return imageId in globalState.state.images;
	}

	/**
	 * עדכון חלקי של מטאדטה (למשל רק crop)
	 * @param imageId - מזהה התמונה
	 * @param updates - עדכונים חלקיים
	 */
	updateImageMetadata(imageId: string, updates: Partial<ImageMetadata>): void {
		const existing = this.getImageMetadata(imageId) || {};
		this.setImageMetadata(imageId, { ...existing, ...updates });
	}
}

export const imageStore = new ImageStore();
