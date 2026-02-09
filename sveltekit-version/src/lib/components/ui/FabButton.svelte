<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ClassValue } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'class'> & {
		class?: ClassValue;
		children?: Snippet;
	};

	let { type = 'button', children, class: className = undefined, ...rest }: Props = $props();
</script>

<button type={type} class={['btn-fab', className]} {...rest}>
	{@render children?.()}
</button>
