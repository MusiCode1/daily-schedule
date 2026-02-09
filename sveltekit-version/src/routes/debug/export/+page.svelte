<script lang="ts">
	import { onMount } from 'svelte';

	let includeSensitive = $state(false);
	let snapshotText = $state('');
	let errorText = $state('');

	const LEGACY_KEYS = [
		'device_id',
		'device_name',
		'last_known_write_id',
		'auto_backup_enabled',
		'use_redirect_mode',
		'google_client_id_override',
		'google_auth_storage',
		'gdrive_token',
		'gdrive_expiry',
		'floating-board-state'
	] as const;

	function safeParseJson(text: string | null) {
		if (!text) return null;
		try {
			return JSON.parse(text);
		} catch {
			return { __parseError: true, raw: text };
		}
	}

	function redactSensitive(obj: any) {
		if (!obj || typeof obj !== 'object') return obj;

		// שכפול כדי לא לשנות אובייקטים חיים
		const clone = typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

		// google_auth_storage (legacy)
		if (clone.accessToken) clone.accessToken = '__REDACTED__';

		// daily-schedule-device-state.auth.googleAuthStorage
		if (clone.auth?.googleAuthStorage?.accessToken) {
			clone.auth.googleAuthStorage.accessToken = '__REDACTED__';
		}

		return clone;
	}

	function buildSnapshot() {
		const stateRaw = localStorage.getItem('daily-schedule-data');
		const deviceStateRaw = localStorage.getItem('daily-schedule-device-state');

		const legacy: Record<string, any> = {};
		for (const key of LEGACY_KEYS) {
			const value = localStorage.getItem(key);
			legacy[key] = safeParseJson(value) ?? value;
		}

		const snapshot = {
			generatedAt: new Date().toISOString(),
			userAgent: navigator.userAgent,
			keys: {
				'daily-schedule-data': safeParseJson(stateRaw),
				'daily-schedule-device-state': safeParseJson(deviceStateRaw)
			},
			legacyKeys: legacy
		};

		const finalSnapshot = includeSensitive ? snapshot : redactSensitive(snapshot);
		snapshotText = JSON.stringify(finalSnapshot, null, 2);
	}

	function downloadSnapshot() {
		const blob = new Blob([snapshotText], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'daily-schedule-local-snapshot.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	onMount(() => {
		try {
			buildSnapshot();
		} catch (e: any) {
			errorText = e?.message ? String(e.message) : 'שגיאה לא ידועה';
		}
	});
</script>

<div class="p-6 max-w-4xl mx-auto space-y-4">
	<h1 class="text-2xl font-bold">ייצוא Snapshot מקומי (Debug)</h1>

	<p class="text-sm text-slate-600">
		המסך הזה מיועד לשליפת דוגמא חיה מהדפדפן לצורך בדיקות מיגרציה. כברירת מחדל אנחנו
		מסתירים טוקנים.
	</p>

	{#if errorText}
		<div class="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
			{errorText}
		</div>
	{/if}

	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={includeSensitive} onchange={buildSnapshot} />
		כלול מידע רגיש (טוקנים)
	</label>

	<div class="flex gap-2">
		<button class="btn btn-primary" type="button" onclick={downloadSnapshot} disabled={!snapshotText}>
			הורד קובץ JSON
		</button>
		<button class="btn" type="button" onclick={buildSnapshot}>רענן</button>
	</div>

	<textarea
		class="w-full h-[60vh] font-mono text-xs p-3 rounded-lg border border-slate-200"
		readonly
		value={snapshotText}
	></textarea>
</div>
