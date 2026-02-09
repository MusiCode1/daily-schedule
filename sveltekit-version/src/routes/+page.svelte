<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SessionController } from '$lib/logic/session.svelte';

	const session = new SessionController();

	onMount(() => {
		const href = session.currentUser ? '/tasks' : '/login';
		goto(resolve(href), { replaceState: true });
	});
</script>
