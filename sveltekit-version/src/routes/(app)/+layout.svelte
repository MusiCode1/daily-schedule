<script lang="ts">
	import './layout.css';
	import './components.css';
	import favicon from '$lib/assets/logo.svg';

	import { onMount, onDestroy } from 'svelte';
	import { userStore } from '$lib/stores/userStore.svelte';
	import { TEXTS } from '$lib/services/language';
	import { googleAuthService } from '$lib/services/sync/providers/google-drive/googleAuthService';
	import type { ThemeType } from '$lib/types';

	let { children } = $props();

	// effect to handle theme switching
	$effect(() => {
		const currentUser = userStore.currentUser;
		const defaultTheme: ThemeType = 'theme-focus'; // ברירת מחדל: פוקוס
		const theme = currentUser?.theme;
		const resolvedTheme: ThemeType =
			theme === 'theme-playful' ||
			theme === 'theme-gradient' ||
			theme === 'theme-contrast' ||
			theme === 'theme-focus'
				? theme
				: defaultTheme;

		// השמה ישירה מונעת תלות בקריאות remove/add בתוך $effect
		document.body.className = resolvedTheme;
	});

	onMount(() => {
		// אתחול auth ב-bootstrap כדי לשחזר סשן קיים ולהפעיל סנכרון אוטומטי ברקע.
		void googleAuthService.initialize().catch((error) => {
			console.warn('[Layout] Google auth bootstrap failed', error);
		});

		// כלי דיבוג לקונסול - החלפת theme ידנית
		(window as any).setAppTheme = (themeName: ThemeType) => {
			document.body.classList.remove(
				'theme-focus',
				'theme-playful',
				'theme-gradient',
				'theme-contrast'
			);
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
	<title>{TEXTS.APP_TITLE}</title>
</svelte:head>

{@render children()}
