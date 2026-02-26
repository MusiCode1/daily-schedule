import type { Sha256 } from './syncTypes';

function isPlainObject(value: any): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') return false;
	if (Array.isArray(value)) return false;
	return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function canonicalize(value: any): any {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
	if (isPlainObject(value)) {
		const out: Record<string, any> = {};
		const keys = Object.keys(value).sort();
		for (const key of keys) {
			out[key] = canonicalize((value as any)[key]);
		}
		return out;
	}
	return value;
}

/**
 * ממיר ערך ל-JSON string יציב (deterministic) — מפתחות ממוינים אלפביתית בכל רמה.
 * מבטיח שאותו אובייקט תמיד ייצר את אותה מחרוזת, ללא תלות בסדר הכנסת המפתחות.
 * @param value - הערך להמרה (אובייקט, מערך, primitive וכו')
 * @returns מחרוזת JSON יציבה עם מפתחות ממוינים
 */
export function stableStringify(value: any): string {
	return JSON.stringify(canonicalize(value));
}

function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = '';
	for (const b of bytes) hex += b.toString(16).padStart(2, '0');
	return hex;
}

/**
 * מחשב SHA-256 hash של מחרוזת טקסט.
 * משתמש ב-Web Crypto API (crypto.subtle).
 * @param input - מחרוזת הקלט לחישוב hash
 * @returns hash בפורמט `sha256:<hex>` (branded type)
 */
export async function sha256String(input: string): Promise<Sha256> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return `sha256:${toHex(digest)}`;
}

/**
 * מחשב SHA-256 hash של Blob (קובץ בינארי).
 * משמש לזיהוי ייחודי של assets (תמונות) בסנכרון.
 * @param blob - ה-Blob לחישוב hash
 * @returns hash בפורמט `sha256:<hex>` (branded type)
 */
export async function sha256Blob(blob: Blob): Promise<Sha256> {
	const buf = await blob.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buf);
	return `sha256:${toHex(digest)}`;
}
