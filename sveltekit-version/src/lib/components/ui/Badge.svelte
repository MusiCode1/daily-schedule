<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import type { BadgeTone } from './types';

	type AsTag = 'span' | 'div';

	type Props = {
		tone?: BadgeTone;
		as?: AsTag;
		class?: ClassValue;
		children?: Snippet;
		[key: string]: any;
	};

	let { tone = 'neutral', as = 'span', children, class: className = undefined, ...rest }: Props = $props();

	function getToneClass(t: BadgeTone): string | undefined {
		switch (t) {
			case 'neutral':
				return undefined;
			case 'success':
				return 'badge-success';
			case 'warning':
				return 'badge-warning';
			case 'danger':
				return 'badge-danger';
		}
	}
</script>

<svelte:element this={as} class={['badge', getToneClass(tone), className]} {...rest}>
	{@render children?.()}
</svelte:element>
