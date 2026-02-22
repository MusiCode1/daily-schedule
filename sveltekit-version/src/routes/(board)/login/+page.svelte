<script lang="ts">
  import UserSelector from '$lib/components/UserSelector.svelte';
  import { userStore } from '$lib/stores/userStore.svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { TEXTS } from '$lib/data/texts';
  import { onMount } from 'svelte';

  onMount(() => {
    if (userStore.currentUser) {
      goto(resolve('/tasks'), { replaceState: true });
    }
  });

</script>

<svelte:head>
	<title>{TEXTS.LOGIN_PAGE_TITLE}</title>
</svelte:head>

<UserSelector users={Object.values(userStore.users)} />
