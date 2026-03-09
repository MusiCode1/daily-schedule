<script lang="ts">
	import { onMount } from 'svelte';
	import { KIOSK_TEXTS } from './texts';
	import { ctrl, extractDomain } from './kioskController.svelte';
	import DeviceInfoPanel from './DeviceInfoPanel.svelte';
	import ActionsPanel from './ActionsPanel.svelte';
	import LoginCard from './LoginCard.svelte';

	let newLabel = $state('');
	let newUrl = $state('');
	let newLogoUrl = $state('');
	let initialized = $state(false);

	onMount(async () => {
		ctrl.loadFromStorage();
		if (ctrl.baseUrl) {
			await ctrl.connect();
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
	<!-- ספינר טעינה ראשונית -->
	<div class="splash">
		<div class="spinner"></div>
	</div>
{:else if !ctrl.deviceInfo}
	<!-- מסך לוגין -->
	<LoginCard onConnect={() => ctrl.connect()} />
{:else}
	<!-- מסך ניהול -->
	<div class="main-screen">
		<header class="page-header">
			<h1>🖥️ {KIOSK_TEXTS.PAGE_TITLE}</h1>
			<div class="header-actions">
				<button class="btn danger" onclick={() => ctrl.disconnect()}>
					{KIOSK_TEXTS.DISCONNECT}
				</button>
			</div>
		</header>

		<!-- הודעת פידבק צפה -->
		{#if ctrl.feedback}
			<div
				class="feedback"
				class:success={ctrl.feedback.type === 'success'}
				class:error={ctrl.feedback.type === 'error'}
			>
				{ctrl.feedback.message}
			</div>
		{/if}

		<div class="scroll-area">
			<!-- מידע מכשיר -->
			<section class="card">
				<h2>📱 {KIOSK_TEXTS.DEVICE_INFO_TITLE}</h2>
				<DeviceInfoPanel
					deviceInfo={ctrl.deviceInfo}
					onRefresh={() => ctrl.refresh()}
					isRefreshing={ctrl.isConnecting}
				/>
			</section>

			<!-- מצב קיוסק -->
			<section class="card">
				<h2>⚙️ {KIOSK_TEXTS.KIOSK_SECTION}</h2>
				<div class="kiosk-buttons">
					<button
						class="btn kiosk-lock"
						onclick={() => ctrl.enableKioskMode()}
						disabled={ctrl.isLoading}
					>
						🔒 {KIOSK_TEXTS.LOCK_KIOSK}
					</button>
					<button
						class="btn kiosk-unlock"
						onclick={() => ctrl.disableKioskMode()}
						disabled={ctrl.isLoading}
					>
						🔓 {KIOSK_TEXTS.UNLOCK_KIOSK}
					</button>
				</div>
			</section>

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
								>
									🗑️
								</button>
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

			<!-- פעולות מכשיר -->
			<section class="card">
				<h2>⚡ {KIOSK_TEXTS.ACTIONS_SECTION}</h2>
				<ActionsPanel />
			</section>
		</div>
	</div>
{/if}

<style>
	/* ===== ספינר טעינה ===== */
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
		to {
			transform: rotate(360deg);
		}
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
		padding: 0.875rem 1.5rem;
		background: white;
		border-bottom: 1px solid #e2e8f0;
	}

	.page-header h1 {
		font-size: 1.35rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ===== כותרות ===== */
	h2 {
		font-size: 1.05rem;
		font-weight: 700;
		color: #334155;
		margin: 0 0 1rem 0;
	}

	h3 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #475569;
		margin: 1rem 0 0.75rem 0;
	}

	/* ===== כרטיס ===== */
	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	/* ===== פידבק צף ===== */
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
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
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

	input[type='text'],
	input[type='url'] {
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

	/* ===== לחצני קיוסק ===== */
	.kiosk-buttons {
		display: flex;
		gap: 1rem;
	}

	.btn.kiosk-lock {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
		flex: 1;
		font-size: 1rem;
		padding: 0.85rem;
	}

	.btn.kiosk-lock:not(:disabled):hover {
		background: #fde68a;
	}

	.btn.kiosk-unlock {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
		flex: 1;
		font-size: 1rem;
		padding: 0.85rem;
	}

	.btn.kiosk-unlock:not(:disabled):hover {
		background: #bbf7d0;
	}

	/* ===== רשת אתרים — כרטיסים ===== */
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

	.add-row input {
		flex: 1;
		min-width: 150px;
	}
</style>
