import { describe, expect, it } from 'vitest';
import { sha256Blob, sha256String, stableStringify } from '$lib/services/drive/crypto';

describe('Drive V2 crypto helpers', () => {
	it('stableStringify should be deterministic regardless of key order', () => {
		const a = { b: 1, a: 2, nested: { z: 1, y: 2 } };
		const b = { nested: { y: 2, z: 1 }, a: 2, b: 1 };

		expect(stableStringify(a)).toBe(stableStringify(b));
	});

	it('sha256String should be stable and sensitive to changes', async () => {
		const h1 = await sha256String('hello');
		const h2 = await sha256String('hello');
		const h3 = await sha256String('hello!');

		expect(h1).toBe(h2);
		expect(h1).not.toBe(h3);
		expect(h1.startsWith('sha256:')).toBe(true);
	});

	it('sha256Blob should be stable and sensitive to changes', async () => {
		const b1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
		const b2 = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
		const b3 = new Blob([new Uint8Array([1, 2, 4])], { type: 'application/octet-stream' });

		const h1 = await sha256Blob(b1);
		const h2 = await sha256Blob(b2);
		const h3 = await sha256Blob(b3);

		expect(h1).toBe(h2);
		expect(h1).not.toBe(h3);
		expect(h1.startsWith('sha256:')).toBe(true);
	});
});
