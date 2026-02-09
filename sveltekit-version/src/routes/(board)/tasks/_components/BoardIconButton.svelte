<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ClassValue } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'class'> & {
		class?: ClassValue;
		withFade?: boolean;
		children?: Snippet;
	};

	let {
		type = 'button',
		withFade = false,
		children,
		class: className = undefined,
		...rest
	}: Props = $props();
</script>

{#if withFade}
	<button type={type} class={['icon-btn', className]} transition:fade {...rest}>
		{@render children?.()}
	</button>
{:else}
	<button type={type} class={['icon-btn', className]} {...rest}>
		{@render children?.()}
	</button>
{/if}

