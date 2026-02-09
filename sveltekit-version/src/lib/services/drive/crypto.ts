import type { Sha256 } from './types';

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

export function stableStringify(value: any): string {
	return JSON.stringify(canonicalize(value));
}

function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = '';
	for (const b of bytes) hex += b.toString(16).padStart(2, '0');
	return hex;
}

export async function sha256String(input: string): Promise<Sha256> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return `sha256:${toHex(digest)}`;
}

export async function sha256Blob(blob: Blob): Promise<Sha256> {
	const buf = await blob.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buf);
	return `sha256:${toHex(digest)}`;
}

