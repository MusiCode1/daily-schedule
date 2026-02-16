<script lang="ts">
	import { TEXTS } from '$lib/services/language';
	import { driveBackupSettingsController } from '$lib/logic/driveBackupSettings.svelte';
	import { syncStatus } from '$lib/stores/syncStore';

	const controller = driveBackupSettingsController;

	function getSyncStatusLabel(status: 'synced' | 'syncing' | 'error' | 'offline'): string {
		if (status === 'synced') return TEXTS.SYNC_STATUS_SYNCED;
		if (status === 'syncing') return TEXTS.SYNC_STATUS_SYNCING;
		if (status === 'error') return TEXTS.SYNC_STATUS_ERROR;
		return TEXTS.SYNC_STATUS_OFFLINE;
	}
</script>

<div class="google-drive-card">
	<div class="card-header">
		<div class="drive-icon">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path
					d="M12 12v9"
				/><path d="m16 16-4-9-4 9" /></svg
			>
		</div>
		<h3>{TEXTS.GOOGLE_DRIVE_TITLE}</h3>
	</div>

	<div class="card-content">
		{#if controller.isLoading}
			<p>{TEXTS.LOADING_APP}</p>
		{:else if !controller.isConnected}
			<div class="connect-section">
				<p>{TEXTS.DRIVE_DESC}</p>

				<button class="btn-google" onclick={() => controller.signIn()}>
					<span class="icon">G</span>
					{TEXTS.CONNECT_DRIVE}
				</button>

				<div class="advanced-settings">
					<label
						class="toggle-row"
						title={TEXTS.REDIRECT_MODE_DESC}
						style="justify-content: flex-end; margin-bottom: 0.5rem; font-size: 0.85rem;"
					>
						<span>{TEXTS.REDIRECT_MODE_LABEL}</span>
						<input
							type="checkbox"
							bind:checked={controller.useRedirectMode}
							onchange={() => controller.saveLocalSettings()}
						/>
					</label>

					<details>
						<summary>{TEXTS.CLIENT_ID_LABEL}</summary>
						<div class="input-group">
							<input
								type="text"
								bind:value={controller.customClientId}
								placeholder={TEXTS.CLIENT_ID_PLACEHOLDER}
								onchange={() => controller.saveLocalSettings()}
							/>
						</div>
					</details>
				</div>
			</div>
		{:else}
			<div class="status-section">
				<div class="user-info">
					{#if controller.userInfo?.photoLink}
						<img src={controller.userInfo.photoLink} alt={TEXTS.AVATAR} class="g-avatar" />
					{/if}
					<div>
						<span class="label">{TEXTS.CONNECTED_AS}</span>
						<span class="value"
							>{controller.userInfo?.displayName ||
								controller.userInfo?.emailAddress ||
								TEXTS.GENERIC_USER}</span
						>
					</div>
				</div>

				<div class="sync-info">
					<div>
						<span class="label">{TEXTS.SYNC_STATUS_LABEL}</span>
						<span class="value">{getSyncStatusLabel($syncStatus.status)}</span>
					</div>
					{#if $syncStatus.lastSyncTime}
						<div>
							<span class="label">{TEXTS.LAST_SYNC}</span>
							<span class="value">{new Date($syncStatus.lastSyncTime).toLocaleString('he-IL')}</span>
						</div>
					{/if}
					{#if controller.lastRemoteBackupTime}
						<div>
							<span class="label">{TEXTS.LAST_BACKUP}</span>
							<span class="value"
								>{new Date(controller.lastRemoteBackupTime).toLocaleString('he-IL')}</span
							>
						</div>
					{/if}
				</div>

				<div class="actions-row">
					<button class="btn-outline" onclick={() => controller.signOut()}>
						{TEXTS.DISCONNECT_DRIVE}
					</button>
					<button
						class="btn-primary"
						onclick={() => controller.syncNow()}
						disabled={controller.isSyncingNow}
					>
						{controller.isSyncingNow ? '...' : TEXTS.SYNC_NOW}
					</button>
				</div>
			</div>
		{/if}

		{#if controller.successMessage}
			<div class="msg success">{controller.successMessage}</div>
		{/if}
		{#if controller.errorMessage}
			<div class="msg error">{controller.errorMessage}</div>
		{/if}
	</div>
</div>

<style>
	.google-drive-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 640px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		color: #334155;
	}

	.card-header h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	.drive-icon {
		color: #6366f1;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.connect-section {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.btn-google {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: #4285f4;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-google:hover {
		background: #3367d6;
	}

	.btn-google .icon {
		background: white;
		color: #4285f4;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 14px;
	}

	.advanced-settings {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: #94a3b8;
		text-align: right;
	}

	.advanced-settings summary {
		cursor: pointer;
		list-style: none;
		text-align: center;
	}

	.input-group input {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		user-select: none;
	}

	.toggle-row input {
		width: 1.2rem;
		height: 1.2rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		background: #f8fafc;
		padding: 0.75rem;
		border-radius: 12px;
	}

	.g-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}

	.sync-info {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.85rem;
		color: #64748b;
		margin-left: 0.35rem;
	}

	.value {
		font-weight: 600;
		color: #1e293b;
	}

	.actions-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.btn-outline {
		background: white;
		border: 1px solid #e2e8f0;
		color: #475569;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.btn-outline:hover {
		background: #f1f5f9;
	}

	.btn-primary {
		background: #6366f1;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.msg {
		padding: 0.5rem;
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
</style>
