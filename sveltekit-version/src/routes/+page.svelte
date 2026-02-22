<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userStore } from '$lib/stores/userStore.svelte';

	onMount(() => {
		const href = userStore.currentUser ? '/tasks' : '/login';
		goto(resolve(href), { replaceState: true });
	});
</script>
