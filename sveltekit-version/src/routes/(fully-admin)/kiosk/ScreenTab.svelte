<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ctrl } from './kioskController.svelte';
	import { KIOSK_TEXTS } from './texts';

	let screenshotUrl = $state<string | null>(null);
	let liveViewActive = $state(false);
	let isCapturing = $state(false);
	let liveInterval: ReturnType<typeof setInterval> | null = null;

	async function capture() {
		isCapturing = true;
		const url = await ctrl.takeScreenshot();
		if (url) {
			if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
			screenshotUrl = url;
		}
		isCapturing = false;
	}

	function startLiveView() {
		liveViewActive = true;
		capture();
		liveInterval = setInterval(capture, 1500);
	}

	function stopLiveView() {
		liveViewActive = false;
		if (liveInterval) {
			clearInterval(liveInterval);
			liveInterval = null;
		}
	}

	function toggleLiveView() {
		if (liveViewActive) {
			stopLiveView();
		} else {
			startLiveView();
		}
	}

	onDestroy(() => {
		stopLiveView();
		if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
	});
</script>

<div class="screen-tab">
	<div class="controls">
		<button
			class="btn screenshot-btn"
			onclick={capture}
			disabled={isCapturing || liveViewActive}
		>
			📷 {KIOSK_TEXTS.SCREENSHOT_BTN}
		</button>
		<button
			class="btn live-btn"
			class:active={liveViewActive}
			onclick={toggleLiveView}
			disabled={isCapturing && !liveViewActive}
		>
			{liveViewActive ? '⏹ ' + KIOSK_TEXTS.LIVE_VIEW_STOP : '▶ ' + KIOSK_TEXTS.LIVE_VIEW_START}
		</button>
		{#if liveViewActive}
			<span class="live-badge">● LIVE</span>
		{/if}
	</div>

	<div class="preview">
		{#if screenshotUrl}
			<img src={screenshotUrl} alt="צילום מסך" class="screenshot-img" />
		{:else}
			<div class="empty-state">
				<span class="empty-icon">📷</span>
				<p>{KIOSK_TEXTS.SCREENSHOT_EMPTY}</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.screen-tab {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.6rem 1.1rem;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.screenshot-btn {
		background: #f1f5f9;
		color: #334155;
	}

	.screenshot-btn:not(:disabled):hover {
		background: #e2e8f0;
	}

	.live-btn {
		background: #f0fdf4;
		color: #166534;
		border-color: #bbf7d0;
	}

	.live-btn.active {
		background: #dcfce7;
		border-color: #86efac;
	}

	.live-btn:not(:disabled):hover {
		background: #dcfce7;
	}

	.live-badge {
		font-size: 0.8rem;
		font-weight: 700;
		color: #dc2626;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.preview {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		overflow: hidden;
		background: #f8fafc;
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.screenshot-img {
		width: 100%;
		height: auto;
		display: block;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #94a3b8;
	}

	.empty-icon {
		font-size: 2.5rem;
		opacity: 0.4;
	}

	.empty-state p {
		font-size: 0.9rem;
		margin: 0;
		text-align: center;
	}
</style>
