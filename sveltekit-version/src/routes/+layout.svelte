<script lang="ts">
	import './layout.css';
	// import favicon from '$lib/assets/logo.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
