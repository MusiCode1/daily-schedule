/**
 * בדיקות אינטגרציה לתרחיש הבאג: שינויים מקומיים לא מועלים
 *
 * תרחיש הבאג המקורי (לפני התיקון):
 *  1. מכשיר A מסנכרן בהצלחה → lastKnownWriteId = X, previousState = state_X
 *  2. משתמש מבצע שינוי מקומי → globalState = state_X + שינויים
 *  3. מכשיר A מסנכרן שוב:
 *     - restoreWithMerge מחזיר localState (כי writeIds תואמים)
 *     - הקוד הבאגי: previousState מוחלף ב-stateForUpload לפני חישוב hasLocalChanges
 *     - calculateDelta(currentState, currentState) = null → hasLocalChanges = false
 *     - shouldUpload = false → סנכרון מדלג על ה-upload!
 *     - UI מציג "הצלחה" - אבל השינויים לא הועלו לענן
 */

import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import {
	backupWithHistory,
	restoreWithMerge,
	type BackupV2Db,
	type BackupV2Repo
} from '$lib/services/drive/driveBackupV2';
import { calculateDelta } from '$lib/services/sync/syncEngine';
import type { Sha256 } from '$lib/services/drive/types';
import type { AppState } from '$lib/types';

function deepClone<T>(v: T): T {
	return JSON.parse(JSON.stringify(v)) as T;
}

function getFirstIds(state: AppState) {
	const firstUserId = Object.keys(state.users)[0];
	const firstListId = Object.keys(state.lists[firstUserId])[0];
	const firstTaskId = Object.keys(state.lists[firstUserId][firstListId].tasks)[0];
	return { firstUserId, firstListId, firstTaskId };
}

function makeInMemoryRepo(): BackupV2Repo & {
	store: Map<string, any>;
	writeCount: number;
} {
	const store = new Map<string, any>();
	let writeCount = 0;
	const ids = {
		backupFolderId: 'folder:backup',
		assetsFolderId: 'folder:assets',
		manifestFileId: 'file:manifest',
		contentFileId: 'file:content',
		progressFileId: 'file:progress',
		assetsIndexFileId: 'file:assetsIndex',
		historyFileId: 'file:history'
	};

	return {
		store,
		get writeCount() {
			return writeCount;
		},
		async ensureStructure() {
			return ids;
		},
		async readJson(fileId: string) {
			if (!store.has(fileId)) throw new Error(`Missing json file: ${fileId}`);
			return deepClone(store.get(fileId));
		},
		async writeJson(fileId: string, data: any, opts?: { appProperties?: Record<string, string> }) {
			opts; // suppress unused
			store.set(fileId, deepClone(data));
			writeCount++;
		},
		async readHistoryJson(fileId: string) {
			if (!store.has(fileId)) throw new Error(`Missing history file: ${fileId}`);
			return deepClone(store.get(fileId));
		},
		async writeHistoryJson(fileId: string, data: any) {
			store.set(fileId, deepClone(data));
		},
		async uploadAsset(params: { hash: Sha256; blob: Blob; mimeType: string }) {
			params; // suppress unused
			return { fileId: `asset:${params.hash}`, size: params.blob.size };
		},
		async downloadAsset(fileId: string): Promise<Blob> {
			throw new Error(`downloadAsset not expected in this test: ${fileId}`);
		}
	};
}

function makeInMemoryDb(): BackupV2Db {
	return {
		async getImage() {
			return null;
		},
		async saveImage(blob: Blob, idOverride?: string) {
			return idOverride ?? `idb:${Math.random()}`;
		}
	};
}

const DEVICE_A = { deviceId: 'device-a', deviceName: 'Device A' };

describe('זרימת הסנכרון: שינויים מקומיים חייבים להיות מועלים', () => {
	it('שינויים שנעשו בין שני סנכרונים עוקבים חייבים להתגלות ולהיות מועלים', async () => {
		const repo = makeInMemoryRepo();
		const db = makeInMemoryDb();

		// שלב 1: state ראשוני עם גיבוי ראשון
		const stateAfterFirstSync = deepClone(INITIAL_STATE) as AppState;
		const { firstUserId, firstListId, firstTaskId } = getFirstIds(stateAfterFirstSync);
		stateAfterFirstSync.lists[firstUserId][firstListId].tasks[firstTaskId].name = 'שם מקורי';

		let writeIdCounter = 0;
		const generateWriteId = () => `write-${++writeIdCounter}`;

		const firstSyncResult = await backupWithHistory({
			state: stateAfterFirstSync,
			repo,
			db,
			device: DEVICE_A,
			lastKnownWriteId: null,
			previousState: null,
			forceSnapshot: true,
			cache: {},
			generateWriteId
		});

		// מדמים את מה שה-SyncController שומר אחרי גיבוי ראשון:
		// previousState = stateAfterFirstSync
		// lastKnownWriteId = firstSyncResult.writeId
		let lastKnownWriteId: string | null = firstSyncResult.writeId;
		let previousState: AppState = deepClone(stateAfterFirstSync);

		expect(lastKnownWriteId).toBe('write-1');

		// שלב 2: המשתמש עורך משימה (שינוי מקומי)
		const localStateWithChanges = deepClone(stateAfterFirstSync) as AppState;
		localStateWithChanges.lists[firstUserId][firstListId].tasks[firstTaskId].name = 'שם חדש!';
		localStateWithChanges.lastModified = Date.now();

		// שלב 3: סנכרון שני - הענן עדיין ב-write-1 (writeIds תואמים)
		const restoreResult = await restoreWithMerge({
			manifestFileId: 'file:manifest',
			repo,
			db,
			localState: localStateWithChanges,
			localWriteId: lastKnownWriteId
		});

		// restoreWithMerge צריך להחזיר את localState כי writeIds תואמים
		const remoteWriteId = restoreResult.manifest.syncMetadata.writeId;
		expect(remoteWriteId).toBe('write-1'); // הענן עדיין ב-write-1

		// בדיקה: restoreWithMerge מחזיר את localState (עם השינויים)
		expect(restoreResult.merged).toBe(false);
		const stateForUpload = restoreResult.state;
		expect(
			stateForUpload.lists[firstUserId][firstListId].tasks[firstTaskId].name
		).toBe('שם חדש!');

		// ===== גרעין הבאג =====
		// shouldApplyRemoteState = false (כי writeIds תואמים)
		const shouldApplyRemoteState =
			restoreResult.merged || !lastKnownWriteId || lastKnownWriteId !== remoteWriteId;
		expect(shouldApplyRemoteState).toBe(false); // writeIds תואמים → לא עדכנו global state

		// לפני התיקון: הקוד היה עושה:
		//   if (!restoreResult.merged) previousState = cloneAppState(stateForUpload)
		// כלומר: previousState = stateForUpload (= localStateWithChanges)
		// ואז: calculateDelta(localStateWithChanges, localStateWithChanges) = null
		// hasLocalChanges = false → shouldUpload = false → BUG!

		// התיקון: רק כאשר shouldApplyRemoteState === true נעדכן את previousState
		// (כלומר: רק כשמשכנו state חדש מהענן)
		if (!restoreResult.merged && shouldApplyRemoteState) {
			// ← זה לא נכנס כי shouldApplyRemoteState = false
			previousState = deepClone(stateForUpload);
		}

		// בדיקה: previousState נשמר כ-stateAfterFirstSync (לא הוחלף!)
		expect(
			previousState.lists[firstUserId][firstListId].tasks[firstTaskId].name
		).toBe('שם מקורי'); // לא הוחלף

		// בדיקה: calculateDelta מגלה שינויים בין ה-baseline לבין state הנוכחי
		const delta = calculateDelta(previousState, stateForUpload);
		expect(delta).not.toBeNull(); // יש שינויים!
		expect(delta).not.toBeUndefined();

		const hasLocalChanges = previousState ? !!delta : true;
		expect(hasLocalChanges).toBe(true); // שינויים מקומיים מזוהים ✓

		const shouldUpload = !remoteWriteId || restoreResult.merged || hasLocalChanges;
		expect(shouldUpload).toBe(true); // הגיבוי אמור לקרות ✓

		// שלב 4: בצע את הגיבוי בפועל
		const secondSyncResult = await backupWithHistory({
			state: stateForUpload,
			repo,
			db,
			device: DEVICE_A,
			lastKnownWriteId,
			previousState,
			cache: {},
			generateWriteId
		});

		expect(secondSyncResult.writeId).toBe('write-2'); // גיבוי חדש נוצר ✓

		// שלב 5: שחזור על מכשיר B - צריך לראות את השינויים
		const restoreOnDeviceB = await restoreWithMerge({
			manifestFileId: 'file:manifest',
			repo,
			db: makeInMemoryDb(),
			localState: null,
			localWriteId: null
		});

		const taskOnB =
			restoreOnDeviceB.state.lists[firstUserId][firstListId].tasks[firstTaskId];
		expect(taskOnB.name).toBe('שם חדש!'); // מכשיר B רואה את השינויים ✓
	});

	it('כשה-writeIds שונים (remote חדש יותר), previousState חייב להתעדכן', async () => {
		const repo = makeInMemoryRepo();
		const db = makeInMemoryDb();

		// state ראשוני
		const baseState = deepClone(INITIAL_STATE) as AppState;
		const { firstUserId, firstListId, firstTaskId } = getFirstIds(baseState);

		let writeIdCounter = 0;
		const generateWriteId = () => `write-${++writeIdCounter}`;

		// מכשיר A מגבה state ראשוני
		await backupWithHistory({
			state: baseState,
			repo,
			db,
			device: DEVICE_A,
			lastKnownWriteId: null,
			previousState: null,
			forceSnapshot: true,
			cache: {},
			generateWriteId
		});

		// מכשיר A מעדכן ומגבה שוב (write-2)
		const stateFromDeviceA = deepClone(baseState) as AppState;
		stateFromDeviceA.lists[firstUserId][firstListId].tasks[firstTaskId].name = 'שינוי מ-A';
		stateFromDeviceA.lastModified = Date.now();

		await backupWithHistory({
			state: stateFromDeviceA,
			repo,
			db,
			device: DEVICE_A,
			lastKnownWriteId: 'write-1',
			previousState: baseState,
			cache: {},
			generateWriteId
		});

		// מכשיר B מסנכרן - אין לו כלום (lastKnownWriteId = null)
		const restoreResult = await restoreWithMerge({
			manifestFileId: 'file:manifest',
			repo,
			db: makeInMemoryDb(),
			localState: null, // מכשיר B אין לו state מקומי
			localWriteId: null
		});

		// B מקבל את state של A
		expect(
			restoreResult.state.lists[firstUserId][firstListId].tasks[firstTaskId].name
		).toBe('שינוי מ-A'); // ✓

		const remoteWriteId = restoreResult.manifest.syncMetadata.writeId;
		const lastKnownWriteIdOnB: string | null = null; // מכשיר B לא סנכרן בעבר
		const shouldApplyRemoteState =
			restoreResult.merged || !lastKnownWriteIdOnB || lastKnownWriteIdOnB !== remoteWriteId;
		expect(shouldApplyRemoteState).toBe(true);

		// כאן previousState צריך להתעדכן (כי shouldApplyRemoteState = true)
		// כדי שבסנכרון הבא, B לא יטעה לחשוב שיש לו שינויים מקומיים
		let previousStateOnB: AppState | null = null;
		const stateForUpload = restoreResult.state;

		if (!restoreResult.merged && shouldApplyRemoteState) {
			previousStateOnB = deepClone(stateForUpload);
		}

		// בדיקה: previousStateOnB הוגדר לstate שמשכנו
		expect(previousStateOnB).not.toBeNull();
		const deltaAfterPull = calculateDelta(previousStateOnB!, stateForUpload);
		expect(deltaAfterPull).toBeUndefined(); // אין שינויים - B לא צריך לעלות כלום ✓

		const hasLocalChanges = previousStateOnB ? !!deltaAfterPull : true;
		const shouldUpload = !remoteWriteId || restoreResult.merged || hasLocalChanges;
		expect(shouldUpload).toBe(false); // B לא מעלה כלום ✓
	});
});
