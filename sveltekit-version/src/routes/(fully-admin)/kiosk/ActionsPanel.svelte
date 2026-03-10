<script lang="ts">
	import { ctrl } from './kioskController.svelte';
	import { KIOSK_TEXTS } from './texts';
	import AppDropdown from './AppDropdown.svelte';

	let selectedPackage = $state('');
	let customUrl = $state('');

	function handleLaunchApp() {
		if (!selectedPackage) return;
		ctrl.launchApp(selectedPackage);
		selectedPackage = '';
	}

	function handleLoadUrl() {
		if (!customUrl.trim()) return;
		ctrl.navigateToUrl(customUrl.trim());
		customUrl = '';
	}
</script>

<div class="actions">
	<!-- קדמה / רקע -->
	<div class="action-group">
		<button class="action-btn" onclick={() => ctrl.toForeground()} disabled={ctrl.isLoading}>
			🟢 {KIOSK_TEXTS.TO_FOREGROUND}
		</button>
		<button class="action-btn" onclick={() => ctrl.toBackground()} disabled={ctrl.isLoading}>
			⬛ {KIOSK_TEXTS.TO_BACKGROUND}
		</button>
	</div>

	<!-- כתובת בית -->
	<div class="action-group">
		<button class="action-btn" onclick={() => ctrl.loadStartUrl()} disabled={ctrl.isLoading}>
			🏠 {KIOSK_TEXTS.LOAD_START_URL_BTN}
		</button>
	</div>

	<!-- פתח URL -->
	<div class="action-group input-row">
		<input
			type="url"
			bind:value={customUrl}
			placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
			dir="ltr"
			onkeydown={(e) => e.key === 'Enter' && handleLoadUrl()}
		/>
		<button
			class="action-btn primary"
			onclick={handleLoadUrl}
			disabled={ctrl.isLoading || !customUrl.trim()}
		>
			🌐 {KIOSK_TEXTS.LOAD_CUSTOM_URL_BTN}
		</button>
	</div>

	<!-- הפעל אפליקציה -->
	<div class="app-launcher">
		{#if ctrl.recentApps.length > 0}
			<div class="recent-apps">
				<span class="recent-label">{KIOSK_TEXTS.RECENT_APPS}:</span>
				{#each ctrl.recentApps as app (app.package)}
					<button
						class="recent-btn"
						onclick={() => ctrl.launchApp(app.package)}
						title={app.label}
						disabled={ctrl.isLoading}
					>
						<img src="data:image/png;base64,{app.icon}" alt={app.label} />
					</button>
				{/each}
			</div>
		{/if}
		<div class="action-group input-row">
			{#if ctrl.appList.length > 0}
				<AppDropdown apps={ctrl.appList} bind:value={selectedPackage} disabled={ctrl.isLoading} />
			{:else}
				<button class="action-btn" onclick={() => ctrl.loadApps()} disabled={ctrl.appsLoading}>
					{ctrl.appsLoading ? '⏳...' : '📋 ' + KIOSK_TEXTS.LOAD_APPS_BTN}
				</button>
			{/if}
			<button
				class="action-btn primary"
				onclick={handleLaunchApp}
				disabled={ctrl.isLoading || !selectedPackage}
			>
				📱 {KIOSK_TEXTS.LAUNCH_APP_BTN}
			</button>
		</div>
	</div>
</div>

<style>
	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-group {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		width: 100%;
	}

	.action-group > .action-btn {
		flex: 1;
	}

	.input-row {
		align-items: center;
	}

	.input-row input {
		flex: 1;
		min-width: 160px;
		padding: 0.55rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		background: #f8fafc;
		transition: border-color 0.2s;
	}

	.input-row input:focus {
		border-color: #6366f1;
		background: white;
	}

	.app-launcher {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.recent-apps {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.recent-label {
		font-size: 0.8rem;
		color: #94a3b8;
		font-weight: 500;
	}

	.recent-btn {
		padding: 3px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
	}

	.recent-btn img {
		width: 32px;
		height: 32px;
		object-fit: contain;
		border-radius: 6px;
		display: block;
	}

	.recent-btn:not(:disabled):hover {
		border-color: #a5b4fc;
		background: #ede9fe;
		transform: translateY(-1px);
	}

	.recent-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.action-btn {
		padding: 0.55rem 1rem;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		background: #f1f5f9;
		color: #334155;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: normal;
	}

	.action-btn:not(:disabled):hover {
		background: #e2e8f0;
		border-color: #cbd5e1;
	}

	.action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.action-btn.primary {
		background: #6366f1;
		color: white;
		border-color: #6366f1;
	}

	.action-btn.primary:not(:disabled):hover {
		background: #4f46e5;
		border-color: #4f46e5;
	}
</style>
