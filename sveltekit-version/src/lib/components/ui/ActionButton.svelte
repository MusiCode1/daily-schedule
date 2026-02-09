<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ClassValue } from 'svelte/elements';
	import type { IconTone } from './types';

	type Props = Omit<HTMLButtonAttributes, 'class'> & {
		tone?: IconTone;
		class?: ClassValue;
		children?: Snippet;
	};

	let { tone = 'default', type = 'button', children, class: className = undefined, ...rest }: Props = $props();
</script>

<button type={type} class={['action-btn', tone === 'danger' && 'action-btn-danger', className]} {...rest}>
	{@render children?.()}
</button>
