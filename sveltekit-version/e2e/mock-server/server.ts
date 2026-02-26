/**
 * שרת סנכרון מדומה לבדיקות E2E.
 *
 * מדמה את Google Drive API עבור בדיקות Playwright.
 * שומר נתונים בתיקיית temp (ברירת מחדל: os.tmpdir()/mock-sync/)
 *
 * נקודות קצה:
 *   GET/POST /manifest, /content, /progress, /history, /assets
 *   GET/POST /blobs/:hash   — קבצים בינאריים (תמונות)
 *   POST     /reset         — מחיקת כל הנתונים (לפני כל בדיקה)
 *   GET      /health        — בדיקת זמינות (ל-Playwright webServer)
 *
 * פרמטרים (CLI → env → defaults):
 *   bun e2e/mock-server/server.ts --port 3002 --store-dir /tmp/my-sync
 *   MOCK_SYNC_PORT=3002 MOCK_SYNC_STORE_DIR=/tmp/my-sync bun e2e/mock-server/server.ts
 */

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';

// ─── פרמטרים ─────────────────────────────────────────────────────────────────

function parseCliArg(name: string): string | undefined {
	const flag = `--${name}`;
	const idx = process.argv.indexOf(flag);
	return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
}

const PORT = Number(parseCliArg('port') || process.env.MOCK_SYNC_PORT || 3001);
const STORE_DIR = parseCliArg('store-dir') || process.env.MOCK_SYNC_STORE_DIR || join(tmpdir(), 'mock-sync');
const BLOBS_DIR = join(STORE_DIR, 'blobs');

// ─── אתחול ───────────────────────────────────────────────────────────────────

await mkdir(BLOBS_DIR, { recursive: true });
console.log(`[MockSyncServer] Store dir: ${STORE_DIR}`);

// ─── עזרים ───────────────────────────────────────────────────────────────────

function corsHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type'
	};
}

function jsonRes(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...corsHeaders() }
	});
}

function noContent(): Response {
	return new Response(null, { status: 204, headers: corsHeaders() });
}

function notFound(): Response {
	return new Response('Not found', { status: 404, headers: corsHeaders() });
}

async function readJson(name: string): Promise<unknown | null> {
	try {
		const text = await readFile(join(STORE_DIR, `${name}.json`), 'utf-8');
		return JSON.parse(text);
	} catch {
		return null;
	}
}

async function writeJson(name: string, data: unknown): Promise<void> {
	await writeFile(join(STORE_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

/** sha256:abc123 → sha256_abc123 (תואם Windows filesystem) */
function hashToFileName(hash: string): string {
	return hash.replace(/:/g, '_');
}

// ─── שרת ─────────────────────────────────────────────────────────────────────

const JSON_ROUTES = ['manifest', 'content', 'progress', 'history', 'assets'] as const;

Bun.serve({
	port: PORT,

	async fetch(req) {
		const { pathname } = new URL(req.url);
		const method = req.method;

		if (method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders() });
		}

		// ── Health ────────────────────────────────────────────────────────────
		if (pathname === '/health') {
			return new Response('OK', { headers: corsHeaders() });
		}

		// ── Reset ─────────────────────────────────────────────────────────────
		if (pathname === '/reset' && method === 'POST') {
			await rm(STORE_DIR, { recursive: true, force: true });
			await mkdir(BLOBS_DIR, { recursive: true });
			console.log('[MockSyncServer] State reset');
			return jsonRes({ ok: true });
		}

		// ── JSON endpoints ────────────────────────────────────────────────────
		for (const name of JSON_ROUTES) {
			if (pathname !== `/${name}`) continue;

			if (method === 'GET') {
				const data = await readJson(name);
				return data === null ? noContent() : jsonRes(data);
			}
			if (method === 'POST') {
				const incoming = await req.json();

				// history: מיזוג entries לפי writeId (מונע race condition בין שני טאבים)
				if (name === 'history' && incoming && (incoming as any).entries) {
					const existing = (await readJson('history')) as any;
					if (existing?.entries) {
						const existingIds = new Set(existing.entries.map((e: any) => e.writeId));
						const newEntries = (incoming as any).entries.filter(
							(e: any) => !existingIds.has(e.writeId)
						);
						if (newEntries.length > 0) {
							existing.entries.push(...newEntries);
							existing.entries.sort((a: any, b: any) => a.timestamp - b.timestamp);
							existing.backupSchemaVersion = Math.max(
								existing.backupSchemaVersion ?? 0,
								(incoming as any).backupSchemaVersion ?? 0
							);
							await writeJson(name, existing);
							console.log(`[MockSyncServer] History merged: +${newEntries.length} entries (total: ${existing.entries.length})`);
							return jsonRes({ ok: true });
						}
					}
				}

				await writeJson(name, incoming);
				return jsonRes({ ok: true });
			}
		}

		// ── Binary blobs ──────────────────────────────────────────────────────
		if (pathname.startsWith('/blobs/')) {
			const hash = decodeURIComponent(pathname.slice('/blobs/'.length));
			const filePath = join(BLOBS_DIR, hashToFileName(hash));

			if (method === 'GET') {
				try {
					const data = await readFile(filePath);
					return new Response(data, {
						headers: { 'Content-Type': 'application/octet-stream', ...corsHeaders() }
					});
				} catch {
					return notFound();
				}
			}

			if (method === 'POST') {
				const buf = await req.arrayBuffer();
				await writeFile(filePath, Buffer.from(buf));
				return jsonRes({ ok: true });
			}
		}

		return notFound();
	}
});

console.log(`[MockSyncServer] Running on http://localhost:${PORT}`);
