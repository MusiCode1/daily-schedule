<script lang="ts">
	import { onMount } from 'svelte';
	import { KIOSK_TEXTS } from './texts';
	import { ctrl, extractDomain } from './kioskController.svelte';
	import { CONNECTION_STATUS_TEXT } from './texts';
	import DeviceInfoPanel from './DeviceInfoPanel.svelte';
	import ActionsPanel from './ActionsPanel.svelte';
	import ScreenTab from './ScreenTab.svelte';
	import LoginCard from './LoginCard.svelte';

	let newLabel = $state('');
	let newUrl = $state('');
	let newLogoUrl = $state('');
	let initialized = $state(false);
	let activeTab = $state<'device' | 'nav' | 'screen'>('device');

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		const fromQr = ctrl.loadFromUrlParam(params);
		if (fromQr) {
			history.replaceState(null, '', location.pathname);
			await ctrl.connect();
		} else {
			ctrl.loadFromStorage();
			if (ctrl.baseUrl) {
				await ctrl.connect();
			}
		}
		initialized = true;
	});

	function handleAddWebsite() {
		if (!newLabel.trim() || !newUrl.trim()) return;
		ctrl.addWebsite(newLabel.trim(), newUrl.trim(), newLogoUrl.trim() || undefined);
		newLabel = '';
		newUrl = '';
		newLogoUrl = '';
	}

	function getLogoUrl(site: { url: string; logoUrl?: string }): string {
		if (site.logoUrl) return site.logoUrl;
		const domain = extractDomain(site.url);
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}
</script>

{#if !initialized}
	<div class="splash">
		<div class="spinner"></div>
		{#if CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
			<p class="status-text" class:error={ctrl.connectionStatus.startsWith('error')}>
				{CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
			</p>
		{/if}
	</div>
{:else if !ctrl.deviceInfo}
	<LoginCard onConnect={() => ctrl.connect()} />
{:else}
	<div class="main-screen">
		<header class="page-header">
			<h1>🖥️ {KIOSK_TEXTS.PAGE_TITLE}</h1>
			<div class="header-actions">
				<button class="btn danger" onclick={() => ctrl.disconnect()}>
					{KIOSK_TEXTS.DISCONNECT}
				</button>
			</div>
		</header>

		{#if ctrl.feedback}
			<div
				class="feedback"
				class:success={ctrl.feedback.type === 'success'}
				class:error={ctrl.feedback.type === 'error'}
			>
				{ctrl.feedback.message}
			</div>
		{/if}

		<!-- טאבים -->
		<nav class="tabs">
			<button
				class="tab"
				class:active={activeTab === 'device'}
				onclick={() => (activeTab = 'device')}
			>
				📟 {KIOSK_TEXTS.TAB_DEVICE}
			</button>
			<button
				class="tab"
				class:active={activeTab === 'nav'}
				onclick={() => (activeTab = 'nav')}
			>
				🌐 {KIOSK_TEXTS.TAB_NAV}
			</button>
			<button
				class="tab"
				class:active={activeTab === 'screen'}
				onclick={() => (activeTab = 'screen')}
			>
				📷 {KIOSK_TEXTS.TAB_SCREEN}
			</button>
		</nav>

		<div class="scroll-area">

			<!-- ===== טאב מכשיר ===== -->
			{#if activeTab === 'device'}

				<!-- מידע מכשיר -->
				<section class="card">
					<h2>📱 {KIOSK_TEXTS.DEVICE_INFO_TITLE}</h2>
					<DeviceInfoPanel
						deviceInfo={ctrl.deviceInfo}
						onRefresh={() => ctrl.refresh()}
						isRefreshing={ctrl.isConnecting}
					/>
				</section>

				<!-- מצב קיוסק + תחזוקה -->
				<section class="card">
					<h2>⚙️ {KIOSK_TEXTS.KIOSK_SECTION}</h2>
					<div class="toggles-group">
						<!-- מצב קיוסק — הגדרות (kioskMode) -->
						<div class="toggle-row">
							<div class="toggle-label-group">
								<span class="toggle-label">🔒 {KIOSK_TEXTS.KIOSK_MODE_LABEL}</span>
								{#if ctrl.deviceInfo.kioskMode}
									<span class="toggle-warning">{KIOSK_TEXTS.KIOSK_MODE_WARNING}</span>
								{/if}
							</div>
							<div class="toggle-state-label">
								{ctrl.deviceInfo.kioskMode
									? KIOSK_TEXTS.KIOSK_MODE_ENABLED
									: KIOSK_TEXTS.KIOSK_MODE_DISABLED}
							</div>
							<button
								class="toggle-btn"
								class:on={ctrl.deviceInfo.kioskMode}
								onclick={() => ctrl.toggleKioskMode()}
								disabled={ctrl.isLoading}
								aria-label={KIOSK_TEXTS.KIOSK_MODE_LABEL}
								aria-pressed={ctrl.deviceInfo.kioskMode}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>

						<!-- נעילה זמנית (kioskLocked) -->
						<div class="toggle-row">
							<div class="toggle-label-group">
								<span class="toggle-label">🔓 {KIOSK_TEXTS.KIOSK_LOCK_LABEL}</span>
								<span class="toggle-hint">{KIOSK_TEXTS.KIOSK_LOCK_HINT}</span>
							</div>
							<div class="toggle-state-label">
								{ctrl.deviceInfo.kioskLocked
									? KIOSK_TEXTS.KIOSK_LOCK_LOCKED
									: KIOSK_TEXTS.KIOSK_LOCK_UNLOCKED}
							</div>
							<button
								class="toggle-btn"
								class:on={ctrl.deviceInfo.kioskLocked}
								onclick={() => ctrl.toggleKiosk()}
								disabled={ctrl.isLoading || !ctrl.deviceInfo.kioskMode}
								aria-label={KIOSK_TEXTS.KIOSK_LOCK_LABEL}
								aria-pressed={ctrl.deviceInfo.kioskLocked}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>

						<!-- טאגל מצב תחזוקה -->
						<div class="toggle-row">
							<span class="toggle-label">🛠️ {KIOSK_TEXTS.MAINTENANCE_LABEL}</span>
							<div class="toggle-state-label">
								{ctrl.deviceInfo.maintenanceMode
									? KIOSK_TEXTS.MAINTENANCE_ON_STATE
									: KIOSK_TEXTS.MAINTENANCE_OFF_STATE}
							</div>
							<button
								class="toggle-btn"
								class:on={ctrl.deviceInfo.maintenanceMode}
								onclick={() => ctrl.toggleMaintenance()}
								disabled={ctrl.isLoading}
								aria-label={KIOSK_TEXTS.MAINTENANCE_LABEL}
								aria-pressed={ctrl.deviceInfo.maintenanceMode}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>
					</div>
				</section>

				<!-- שמע ומסך -->
				<section class="card">
					<h2>🔊 {KIOSK_TEXTS.VOLUME_LABEL}</h2>
					<div class="vol-bar-wrap">
						<div class="vol-bar" style="width: {ctrl.isMuted ? 0 : ctrl.volumeLevel}%"></div>
					</div>
					<div class="volume-row">
						<button
							class="vol-btn"
							onclick={() => ctrl.volumeDown()}
							disabled={ctrl.volumeLevel === 0 || ctrl.isMuted}
							aria-label={KIOSK_TEXTS.VOLUME_DOWN}
						>–</button>
						<button
							class="vol-btn mute-btn"
							class:muted={ctrl.isMuted}
							onclick={() => ctrl.toggleMute()}
							aria-label={ctrl.isMuted ? KIOSK_TEXTS.VOLUME_UNMUTE : KIOSK_TEXTS.VOLUME_MUTE}
						>{ctrl.isMuted ? '🔇' : '🔊'}</button>
						<button
							class="vol-btn"
							onclick={() => ctrl.volumeUp()}
							disabled={ctrl.volumeLevel >= 100}
							aria-label={KIOSK_TEXTS.VOLUME_UP}
						>+</button>
						<span class="vol-value">{ctrl.isMuted ? 0 : ctrl.volumeLevel}%</span>
					</div>

					<div class="screen-row">
						<button
							class="action-btn screen-btn"
							onclick={() => ctrl.toggleScreen()}
							disabled={ctrl.isLoading}
						>
							{ctrl.deviceInfo?.screenOn
								? '🌑 ' + KIOSK_TEXTS.SCREEN_TOGGLE_OFF
								: '💡 ' + KIOSK_TEXTS.SCREEN_TOGGLE_ON}
						</button>
					</div>
				</section>

				<!-- ריסטארט -->
				<section class="card">
					<h2>♻️ פעולות קריטיות</h2>
					<div class="restart-row">
						<button
							class="action-btn restart-app-btn"
							onclick={() => ctrl.restartApp()}
							disabled={ctrl.isLoading}
						>
							🔄 {KIOSK_TEXTS.RESTART_APP_BTN}
						</button>
						<button
							class="action-btn restart-device-btn"
							onclick={() => ctrl.rebootDevice()}
							disabled={ctrl.isLoading}
						>
							⚠️ {KIOSK_TEXTS.REBOOT_DEVICE_BTN}
						</button>
					</div>
				</section>

			<!-- ===== טאב ניווט ===== -->
			{:else if activeTab === 'nav'}

				<!-- ניווט לאתרים -->
				<section class="card">
					<h2>🌐 {KIOSK_TEXTS.WEBSITES_SECTION}</h2>

					{#if ctrl.websites.length > 0}
						<div class="websites-grid">
							{#each ctrl.websites as site, i (site.url + i)}
								<div class="site-card-wrapper">
									<button
										class="site-card"
										onclick={() => ctrl.navigateToUrl(site.url)}
										disabled={ctrl.isLoading}
										title={site.url}
									>
										<img
											class="site-logo"
											src={getLogoUrl(site)}
											alt=""
											onerror={(e) => {
												(e.currentTarget as HTMLImageElement).style.display = 'none';
											}}
										/>
										<span class="site-label">{site.label}</span>
									</button>
									<button
										class="remove-btn"
										onclick={() => ctrl.removeWebsite(i)}
										aria-label="הסר"
										title="הסר"
									>🗑️</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-hint">עדיין לא הוספת אתרים. הוסף אתר למטה.</p>
					{/if}

					<!-- הוספת אתר -->
					<div class="add-website-form">
						<h3>➕ {KIOSK_TEXTS.ADD_WEBSITE_SECTION}</h3>
						<div class="add-row">
							<input
								type="text"
								bind:value={newLabel}
								placeholder={KIOSK_TEXTS.WEBSITE_LABEL_PLACEHOLDER}
							/>
							<input
								type="url"
								bind:value={newUrl}
								placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
								dir="ltr"
							/>
							<input
								type="url"
								bind:value={newLogoUrl}
								placeholder={KIOSK_TEXTS.WEBSITE_LOGO_PLACEHOLDER}
								dir="ltr"
							/>
							<button
								class="btn primary"
								onclick={handleAddWebsite}
								disabled={!newLabel.trim() || !newUrl.trim()}
							>
								{KIOSK_TEXTS.ADD_BTN}
							</button>
						</div>
					</div>
				</section>

				<!-- פעולות ניווט -->
				<section class="card">
					<h2>⚡ {KIOSK_TEXTS.ACTIONS_SECTION}</h2>
					<ActionsPanel />
				</section>

			<!-- ===== טאב מסך חי ===== -->
			{:else if activeTab === 'screen'}

				<section class="card">
					<h2>📷 {KIOSK_TEXTS.TAB_SCREEN}</h2>
					<ScreenTab />
				</section>

			{/if}

		</div>
	</div>
{/if}

<svelte:head>
	<title>{KIOSK_TEXTS.PAGE_TITLE}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<style>
	/* ===== ספינר ===== */
	.splash {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e2e8f0;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.status-text {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #64748b;
		text-align: center;
	}

	.status-text.error {
		color: #dc2626;
		font-weight: 600;
	}

	/* ===== מסך ניהול ===== */
	.main-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		direction: rtl;
		background: #f8fafc;
		font-family: 'Rubik', sans-serif;
	}

	.page-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: white;
		border-bottom: 1px solid #e2e8f0;
	}

	.page-header h1 {
		font-size: 1.25rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* ===== טאבים ===== */
	.tabs {
		flex-shrink: 0;
		display: flex;
		background: white;
		border-bottom: 1px solid #e2e8f0;
		padding: 0 1rem;
	}

	.tab {
		padding: 0.7rem 1.25rem;
		border: none;
		background: none;
		font-size: 0.9rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.15s;
		font-family: inherit;
		white-space: nowrap;
	}

	.tab:hover {
		color: #334155;
	}

	.tab.active {
		color: #6366f1;
		border-bottom-color: #6366f1;
	}

	/* ===== אזור גלילה ===== */
	.scroll-area {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	/* ===== כותרות ===== */
	h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #334155;
		margin: 0 0 0.9rem 0;
	}

	h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: #475569;
		margin: 1rem 0 0.6rem 0;
	}

	/* ===== כרטיס ===== */
	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 1.25rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	/* ===== פידבק ===== */
	.feedback {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.7rem 1.4rem;
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.9rem;
		text-align: center;
		white-space: nowrap;
		z-index: 100;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		animation: fade-in 0.2s ease;
	}

	@keyframes fade-in {
		from { opacity: 0; transform: translateX(-50%) translateY(8px); }
		to { opacity: 1; transform: translateX(-50%) translateY(0); }
	}

	.feedback.success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.feedback.error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	/* ===== לחצנים ===== */
	.btn {
		padding: 0.6rem 1.1rem;
		border-radius: 10px;
		border: none;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.primary {
		background: #6366f1;
		color: white;
	}

	.btn.primary:not(:disabled):hover {
		background: #4f46e5;
		transform: translateY(-1px);
	}

	.btn.danger {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.btn.danger:not(:disabled):hover {
		background: #fecaca;
	}

	/* ===== טאגלים ===== */
	.toggles-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.toggle-label-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.toggle-label {
		font-size: 0.95rem;
		font-weight: 600;
		color: #334155;
	}

	.toggle-hint {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.toggle-warning {
		font-size: 0.75rem;
		color: #b45309;
	}

	.toggle-state-label {
		font-size: 0.8rem;
		color: #94a3b8;
		min-width: 2.5rem;
		text-align: center;
	}

	.toggle-btn {
		position: relative;
		width: 44px;
		height: 24px;
		border-radius: 999px;
		border: none;
		background: #cbd5e1;
		cursor: pointer;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.toggle-btn.on {
		background: #6366f1;
	}

	.toggle-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s;
	}

	.toggle-btn.on .toggle-thumb {
		transform: translateX(-20px);
	}

	/* ===== ווליום ===== */
	.volume-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.6rem;
		margin-bottom: 0.75rem;
	}

	.vol-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid #e2e8f0;
		background: #f1f5f9;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.vol-btn:not(:disabled):hover {
		background: #e2e8f0;
	}

	.vol-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.mute-btn.muted {
		background: #fee2e2;
		border-color: #fecaca;
		color: #991b1b;
	}

	.vol-bar-wrap {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
	}

	.vol-bar {
		height: 100%;
		background: #6366f1;
		border-radius: 999px;
		transition: width 0.2s;
	}

	.vol-value {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 600;
		min-width: 2.5rem;
		text-align: center;
	}

	.screen-row {
		display: flex;
	}

	/* ===== ריסטארט ===== */
	.restart-row {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.restart-row > .action-btn {
		width: 100%;
		white-space: nowrap;
	}

	.action-btn {
		padding: 0.6rem 1rem;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		background: #f1f5f9;
		color: #334155;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}

	.action-btn:not(:disabled):hover {
		background: #e2e8f0;
	}

	.action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.screen-btn {
		background: #fef9c3;
		color: #854d0e;
		border-color: #fde68a;
		width: 100%;
		white-space: nowrap;
	}

	.screen-btn:not(:disabled):hover {
		background: #fde68a;
	}

	.restart-app-btn {
		background: #ede9fe;
		color: #5b21b6;
		border-color: #ddd6fe;
	}

	.restart-app-btn:not(:disabled):hover {
		background: #ddd6fe;
	}

	.restart-device-btn {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}

	.restart-device-btn:not(:disabled):hover {
		background: #fecaca;
	}

	/* ===== אתרים ===== */
	.websites-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.site-card-wrapper {
		position: relative;
	}

	.site-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 1.1rem 1rem 0.9rem;
		width: 110px;
		height: 140px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.site-card:not(:disabled):hover {
		background: #e0e7ff;
		border-color: #a5b4fc;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
	}

	.site-card:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.site-logo {
		width: 52px;
		height: 52px;
		object-fit: contain;
		border-radius: 10px;
	}

	.site-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #334155;
		text-align: center;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		line-height: 1.3;
		width: 100%;
	}

	.remove-btn {
		position: absolute;
		top: -8px;
		left: -8px;
		background: white;
		border: 1px solid #e2e8f0;
		cursor: pointer;
		font-size: 0.75rem;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.site-card-wrapper:hover .remove-btn {
		opacity: 1;
	}

	.remove-btn:hover {
		background: #fee2e2;
		border-color: #fecaca;
	}

	.empty-hint {
		color: #94a3b8;
		font-size: 0.9rem;
		text-align: center;
		padding: 1rem;
	}

	/* ===== הוספת אתר ===== */
	.add-website-form {
		border-top: 1px solid #f1f5f9;
		margin-top: 1rem;
		padding-top: 0.5rem;
	}

	.add-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.add-row input,
	input[type='text'],
	input[type='url'] {
		flex: 1;
		min-width: 150px;
		padding: 0.6rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
		background: #f8fafc;
	}

	input:focus {
		border-color: #6366f1;
		background: white;
	}
</style>
