<script lang="ts">
  import UserSelector from '$lib/components/UserSelector.svelte';
  import { SessionController } from '$lib/logic/session.svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { TEXTS } from '$lib/services/language';
  import { onMount } from 'svelte';
  
  const session = new SessionController();

  // אם כבר קיים משתמש מחובר, אין סיבה להישאר במסך ההתחברות.
  onMount(() => {
    if (session.currentUser) {
      goto(resolve('/tasks'), { replaceState: true });
    }
  });

</script>

<svelte:head>
	<title>{TEXTS.LOGIN_PAGE_TITLE}</title>
</svelte:head>

<!-- אנו מעבירים את רשימת המשתמשים ל-UserSelector -->
<UserSelector users={session.users} />
