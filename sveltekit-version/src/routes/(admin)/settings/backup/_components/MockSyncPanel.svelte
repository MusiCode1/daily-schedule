<script lang="ts">
	import { syncController } from '$lib/logic/syncController.svelte';
	import { syncStatus } from '$lib/stores/syncStore';
	import { deviceState } from '$lib/stores/deviceState';

	let isSyncing = $state(false);
	let lastError = $state('');
	let lastSuccess = $state('');
	let syncCount = $state(0);

	const statusLabels: Record<string, string> = {
		synced: 'מסונכרן',
		syncing: 'מסנכרן...',
		error: 'שגיאה',
		offline: 'לא מחובר'
	};

	function getWriteId(): string {
		const ds = deviceState.load();
		return ds.drive?.lastKnownWriteId || 'אין';
	}

	async function doSync() {
		if (isSyncing) return;
		isSyncing = true;
		lastError = '';
		lastSuccess = '';

		try {
			await syncController.sync({ manual: true });
			syncCount++;

			// בדיקת סטטוס אחרי סנכרון
			const unsub = syncStatus.subscribe((s) => {
				if (s.status === 'error') {
					lastError = s.errorMessage || 'שגיאה לא ידועה';
				} else if (s.status === 'synced') {
					lastSuccess = `סנכרון #${syncCount} הושלם`;
				}
			});
			unsub();
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		} finally {
			isSyncing = false;
		}
	}
</script>

<div class="mock-sync-card">
	<div class="card-header">
		<div class="mock-icon">🧪</div>
		<h3>סנכרון (מצב בדיקה — Mock Server)</h3>
	</div>

	<div class="card-content">
		<!-- כפתור סנכרון -->
		<button
			class="btn-sync"
			onclick={doSync}
			disabled={isSyncing}
		>
			{isSyncing ? '⏳ מסנכרן...' : '🔄 סנכרן עכשיו'}
		</button>

		<!-- סטטוס -->
		<div class="info-grid">
			<div class="info-row">
				<span class="label">סטטוס:</span>
				<span class="value status-{$syncStatus.status}">
					{statusLabels[$syncStatus.status] || $syncStatus.status}
				</span>
			</div>

			<div class="info-row">
				<span class="label">סנכרון אחרון:</span>
				<span class="value">
					{$syncStatus.lastSyncTime
						? new Date($syncStatus.lastSyncTime).toLocaleString('he-IL')
						: 'טרם סונכרן'}
				</span>
			</div>

			<div class="info-row">
				<span class="label">Write ID:</span>
				<span class="value mono">{getWriteId()}</span>
			</div>

			<div class="info-row">
				<span class="label">מספר סנכרונים (סשן):</span>
				<span class="value">{syncCount}</span>
			</div>

			{#if $syncStatus.retryAttempt}
				<div class="info-row">
					<span class="label">ניסיון חוזר:</span>
					<span class="value">{$syncStatus.retryAttempt} (עוד {$syncStatus.nextRetryIn} שניות)</span>
				</div>
			{/if}
		</div>

		<!-- הודעות -->
		{#if lastSuccess}
			<div class="msg success">{lastSuccess}</div>
		{/if}
		{#if lastError}
			<div class="msg error">{lastError}</div>
		{/if}
		{#if $syncStatus.errorMessage}
			<div class="msg error">שגיאת sync store: {$syncStatus.errorMessage}</div>
		{/if}

		<div class="mock-note">
			שרת מדומה: <code>http://localhost:3001</code>
		</div>
	</div>
</div>

<style>
	.mock-sync-card {
		background: #fffbeb;
		border: 2px solid #f59e0b;
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 640px;
		box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.15);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		color: #92400e;
	}

	.card-header h3 {
		margin: 0;
		font-size: 1.15rem;
	}

	.mock-icon {
		font-size: 1.5rem;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.btn-sync {
		background: #6366f1;
		color: white;
		border: none;
		padding: 0.85rem 1.5rem;
		border-radius: 10px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-sync:hover:not(:disabled) {
		background: #4f46e5;
		transform: translateY(-1px);
	}

	.btn-sync:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.info-grid {
		background: white;
		border: 1px solid #fde68a;
		border-radius: 12px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: 0.85rem;
		color: #92400e;
	}

	.value {
		font-weight: 600;
		color: #1e293b;
	}

	.value.mono {
		font-family: monospace;
		font-size: 0.8rem;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status-synced { color: #16a34a; }
	.status-syncing { color: #2563eb; }
	.status-error { color: #dc2626; }
	.status-offline { color: #9ca3af; }

	.msg {
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		font-size: 0.9rem;
		text-align: center;
	}

	.msg.success {
		background: #dcfce7;
		color: #166534;
	}

	.msg.error {
		background: #fee2e2;
		color: #991b1b;
	}

	.mock-note {
		text-align: center;
		font-size: 0.8rem;
		color: #a3a3a3;
	}

	.mock-note code {
		background: #f5f5f5;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
</style>
