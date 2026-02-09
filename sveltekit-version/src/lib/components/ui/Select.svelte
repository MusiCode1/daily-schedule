<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Props = Omit<HTMLSelectAttributes, 'class' | 'value'> & {
		// בפועל זה תמיד string (כמו ב-HTML), אבל אנחנו מרחיבים טיפוס כדי לאפשר `bind:value`
		// גם למשתנים שהם union של string-literals (למשל: 'boy' | 'girl') בלי חיכוך TypeScript.
		value?: any;
		class?: ClassValue;
		children?: Snippet;
	};

	let { value = $bindable(''), children, class: className = undefined, ...rest }: Props = $props();
</script>

<select bind:value={value} class={['input', className]} {...rest}>
	{@render children?.()}
</select>
