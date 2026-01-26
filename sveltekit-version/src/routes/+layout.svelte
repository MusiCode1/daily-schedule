<script lang="ts">
	import './layout.css';
	import './components.css';
	import favicon from '$lib/assets/logo.svg';

	import { onMount, onDestroy } from 'svelte';
	import { backupController } from '$lib/logic/backupController.svelte';
	import { userStore } from '$lib/stores/userStore.svelte';
	import type { ThemeType } from '$lib/types';

	let { children } = $props();

	// effect to handle theme switching
	$effect(() => {
		const currentUser = userStore.currentUser;
		const defaultTheme: ThemeType = 'theme-focus'; // ברירת מחדל: פוקוס
		const theme = currentUser?.theme || defaultTheme;

		// ניקוי קלאסים של theme
		document.body.classList.remove('theme-focus', 'theme-playful', 'theme-gradient', 'theme-contrast');
		
		// הוספת ה-theme החדש
		document.body.classList.add(theme);
	});

	onMount(() => {
		// אתחול שירות הגיבוי (בדיקת חיבור קיים)
		backupController.initialize();

		// כלי דיבוג לקונסול - החלפת theme ידנית
		(window as any).setAppTheme = (themeName: ThemeType) => {
			document.body.classList.remove('theme-focus', 'theme-playful', 'theme-gradient', 'theme-contrast');
			document.body.classList.add(themeName);
			console.log(`Theme switched to: ${themeName}`);
		};
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			delete (window as any).setAppTheme;
		}
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
