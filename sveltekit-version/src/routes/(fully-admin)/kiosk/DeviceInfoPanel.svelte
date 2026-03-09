<script lang="ts">
	import type { DeviceInfoResponse } from './fullyKioskTypes';
	import { KIOSK_TEXTS } from './texts';

	let { deviceInfo, onRefresh, isRefreshing }: {
		deviceInfo: DeviceInfoResponse;
		onRefresh: () => void;
		isRefreshing: boolean;
	} = $props();
</script>

<div class="device-info">
	<div class="info-row">
		<span class="device-name">{deviceInfo.deviceName}</span>
		<div class="info-row-end">
			<span class="app-version">v{deviceInfo.version}</span>
			<button class="refresh-btn" onclick={onRefresh} disabled={isRefreshing} title={KIOSK_TEXTS.REFRESH}>
				{isRefreshing ? '⏳' : '🔄'}
			</button>
		</div>
	</div>

	<div class="badges">
		<span class="badge" class:locked={deviceInfo.kioskLocked} class:unlocked={!deviceInfo.kioskLocked}>
			{deviceInfo.kioskLocked ? '🔒 ' + KIOSK_TEXTS.KIOSK_STATUS_LOCKED : '🔓 ' + KIOSK_TEXTS.KIOSK_STATUS_UNLOCKED}
		</span>
		<span class="badge" class:screen-on={deviceInfo.screenOn} class:screen-off={!deviceInfo.screenOn}>
			{deviceInfo.screenOn ? '💡 ' + KIOSK_TEXTS.SCREEN_ON : '🌑 ' + KIOSK_TEXTS.SCREEN_OFF}
		</span>
		<span class="badge battery">
			🔋 {KIOSK_TEXTS.BATTERY(deviceInfo.batteryLevel)}
			{#if deviceInfo.plugged}
				⚡ {KIOSK_TEXTS.PLUGGED}
			{/if}
		</span>
		{#if deviceInfo.ip4}
			<span class="badge ip">📡 {deviceInfo.ip4}</span>
		{/if}
	</div>

	{#if deviceInfo.currentPageUrl}
		<div class="current-url">
			<span class="url-label">{KIOSK_TEXTS.CURRENT_URL}:</span>
			<span class="url-value" title={deviceInfo.currentPageUrl}>{deviceInfo.currentPageUrl}</span>
		</div>
	{/if}
</div>

<style>
	.device-info {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 12px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow: hidden;
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 0;
	}

	.info-row-end {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.refresh-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.2rem 0.4rem;
		border-radius: 6px;
		line-height: 1;
		transition: background 0.15s;
	}

	.refresh-btn:not(:disabled):hover {
		background: #bae6fd;
	}

	.refresh-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.device-name {
		font-weight: 700;
		font-size: 1rem;
		color: #0c4a6e;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.app-version {
		font-size: 0.8rem;
		color: #64748b;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.badge {
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.locked {
		background: #fef3c7;
		color: #92400e;
	}

	.unlocked {
		background: #dcfce7;
		color: #166534;
	}

	.screen-on {
		background: #dbeafe;
		color: #1e40af;
	}

	.screen-off {
		background: #f1f5f9;
		color: #64748b;
	}

	.battery {
		background: #f0fdf4;
		color: #166534;
	}

	.ip {
		background: #f0f4ff;
		color: #3730a3;
	}

	.current-url {
		display: flex;
		gap: 0.5rem;
		font-size: 0.85rem;
		align-items: flex-start;
		overflow: hidden;
		min-width: 0;
	}

	.url-label {
		color: #64748b;
		flex-shrink: 0;
	}

	.url-value {
		color: #0369a1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		direction: ltr;
	}
</style>
