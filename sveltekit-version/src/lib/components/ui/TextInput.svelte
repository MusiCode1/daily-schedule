<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'class' | 'value'> & {
		value?: string;
		class?: ClassValue;
	};

	let { value = $bindable(''), type = 'text', class: className = undefined, ...rest }: Props = $props();
</script>

<input bind:value={value} type={type} class={['input', className]} {...rest} />
