<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type AsTag = 'div' | 'section' | 'article';

	type Props = {
		as?: AsTag;
		class?: ClassValue;
		children?: Snippet;
		// רכיב עטיפה: מאפשר להעביר הלאה attributes שרירותיים של האלמנט.
		[key: string]: any;
	};

	let { as = 'div', children, class: className = undefined, ...rest }: Props = $props();
</script>

<svelte:element this={as} class={['card', className]} {...rest}>
	{@render children?.()}
</svelte:element>
