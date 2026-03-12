<script lang="ts">
	import { TEXTS } from '$lib/services/language';
	import { fileSyncSettingsController } from '$lib/logic/fileSyncSettings.svelte';

	const controller = fileSyncSettingsController;

	let fileInput: HTMLInputElement;

	function handleFileSelect() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		controller.importZip(file);
		fileInput.value = '';
	}
</script>

<div class="file-backup-card">
	<div class="card-header">
		<div class="file-icon">
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
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
		</div>
		<h3>{TEXTS.FILE_SYNC_TITLE}</h3>
	</div>

	<div class="card-content">
		<p class="description">{TEXTS.FILE_SYNC_DESC}</p>

		<div class="actions-section">
			<button
				class="btn-primary"
				onclick={() => controller.exportZip()}
				disabled={controller.isExporting}
			>
				{controller.isExporting ? TEXTS.FILE_EXPORTING : TEXTS.FILE_EXPORT_BUTTON}
			</button>

			<div class="import-section">
				<input
					bind:this={fileInput}
					type="file"
					accept=".zip"
					class="file-input"
					id="file-import-input"
					onchange={handleFileSelect}
					disabled={controller.isImporting}
				/>
				<label for="file-import-input" class="btn-outline" class:disabled={controller.isImporting}>
					{controller.isImporting ? TEXTS.FILE_IMPORTING : TEXTS.FILE_IMPORT_BUTTON}
				</label>
			</div>
		</div>

		{#if controller.successMessage}
			<div class="msg success">{controller.successMessage}</div>
		{/if}
		{#if controller.errorMessage}
			<div class="msg error">{controller.errorMessage}</div>
		{/if}
	</div>
</div>

<style>
	.file-backup-card {
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

	.file-icon {
		color: #6366f1;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.description {
		color: #64748b;
		font-size: 0.9rem;
		text-align: center;
		margin: 0;
	}

	.actions-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.btn-primary {
		background: #6366f1;
		color: white;
		border: none;
		padding: 0.65rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
		font-size: 1rem;
	}

	.btn-primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.file-input {
		display: none;
	}

	.btn-outline {
		display: block;
		background: white;
		border: 1px solid #e2e8f0;
		color: #475569;
		padding: 0.65rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		text-align: center;
		width: 100%;
		font-size: 1rem;
		font-weight: 500;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	.btn-outline:hover {
		background: #f1f5f9;
	}

	.btn-outline.disabled {
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
