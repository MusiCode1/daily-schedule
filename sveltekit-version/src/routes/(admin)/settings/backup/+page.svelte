<script lang="ts">
	import GoogleDriveBackup from './_components/GoogleDriveBackup.svelte';
	import MockSyncPanel from './_components/MockSyncPanel.svelte';
	import { TEXTS } from '$lib/services/language';

	const useMock = import.meta.env.VITE_USE_MOCK_SYNC === 'true';
</script>

<h2>{useMock ? 'סנכרון (מצב בדיקה)' : TEXTS.GOOGLE_DRIVE_TITLE}</h2>

<div class="settings-group">
	{#if useMock}
		<MockSyncPanel />
	{:else}
		<GoogleDriveBackup />
	{/if}
</div>

<style>
	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #334155;
		margin: 0 0 2rem 0;
	}
</style>
