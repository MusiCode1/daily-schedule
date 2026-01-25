<script lang="ts">
	import './layout.css';
	import './components.css';
	import favicon from '$lib/assets/logo.svg';

	import { onMount } from 'svelte';
	import { backupController } from '$lib/logic/backupController.svelte';

	let { children } = $props();

	onMount(() => {
		// אתחול שירות הגיבוי (בדיקת חיבור קיים)
		backupController.initialize();
	});
</script>

<svelte:head>
	<title>סדר יום ויזואלי</title>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>
{@render children()}
