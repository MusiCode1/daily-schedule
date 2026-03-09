<script lang="ts">
	import { onMount } from 'svelte';
	import { TEXTS } from '$lib/services/language';
	import { qrCtrl } from './kioskQrController.svelte';

	onMount(() => {
		qrCtrl.load();
	});
</script>

<div class="kiosk-settings">
	<h2>{TEXTS.KIOSK_QR_TITLE}</h2>
	<p class="subtitle">{TEXTS.KIOSK_QR_SUBTITLE}</p>

	{#if qrCtrl.loading}
		<div class="state-box">
			<div class="spinner"></div>
			<span>{TEXTS.KIOSK_QR_LOADING}</span>
		</div>
	{:else if !qrCtrl.isFullyKiosk}
		<div class="state-box unavailable">
			<span class="icon">📵</span>
			<p>{TEXTS.KIOSK_QR_NOT_AVAILABLE}</p>
		</div>
	{:else if qrCtrl.error}
		<div class="state-box error-box">
			<span class="icon">⚠️</span>
			<p>{qrCtrl.error}</p>
			<button class="btn refresh" onclick={() => qrCtrl.load()}>{TEXTS.KIOSK_QR_REFRESH}</button>
		</div>
	{:else if qrCtrl.qrDataUrl}
		<div class="qr-wrapper">
			<img class="qr-image" src={qrCtrl.qrDataUrl} alt="QR Code לחיבור ניהול קיוסק" />
			{#if qrCtrl.deviceIp}
				<p class="ip-label">כתובת IP: <span dir="ltr">{qrCtrl.deviceIp}</span></p>
			{/if}
			<button class="btn refresh" onclick={() => qrCtrl.load()}>{TEXTS.KIOSK_QR_REFRESH}</button>
		</div>
	{/if}
</div>

<style>
	.kiosk-settings {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
	}

	.subtitle {
		color: #64748b;
		font-size: 0.95rem;
		margin: 0;
	}

	.state-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		min-width: 320px;
		text-align: center;
	}

	.state-box .icon {
		font-size: 2.5rem;
	}

	.state-box p {
		color: #64748b;
		margin: 0;
		font-size: 0.95rem;
		max-width: 300px;
	}

	.unavailable {
		background: #fef9ec;
		border-color: #fde68a;
	}

	.error-box {
		background: #fff5f5;
		border-color: #fecaca;
	}

	.error-box p {
		color: #991b1b;
	}

	.spinner {
		width: 36px;
		height: 36px;
		border: 3px solid #e2e8f0;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.qr-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.qr-image {
		width: 300px;
		height: 300px;
		border-radius: 8px;
	}

	.ip-label {
		color: #64748b;
		font-size: 0.9rem;
		margin: 0;
	}

	.ip-label span {
		font-weight: 600;
		color: #334155;
		font-family: monospace;
	}

	.btn.refresh {
		padding: 0.55rem 1.2rem;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #475569;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.btn.refresh:hover {
		background: #e2e8f0;
		color: #1e293b;
	}
</style>
