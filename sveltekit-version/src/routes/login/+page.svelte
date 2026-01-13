<script lang="ts">
  import UserSelector from '$lib/components/UserSelector.svelte';
  import { SessionController } from '$lib/logic/session.svelte';
  import { goto } from '$app/navigation';
  
  const session = new SessionController();

  // אם המשתמש נבחר (דרך הקומפוננטה), היא מעדכנת את הסטור.
  // אנו עוקבים אחרי השינוי ומנווטים.
  $effect(() => {
    if (session.currentUser) {
        goto('/');
    }
  });

</script>

<svelte:head>
	<title>כניסה - סדר יום ויזואלי</title>
</svelte:head>

<!-- אנו מעבירים את רשימת המשתמשים ל-UserSelector -->
<UserSelector users={session.users} />
