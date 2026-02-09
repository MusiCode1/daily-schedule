<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = Omit<HTMLTextareaAttributes, 'class' | 'value'> & {
		value?: string;
		class?: ClassValue;
	};

	let { value = $bindable(''), class: className = undefined, ...rest }: Props = $props();
</script>

<textarea bind:value={value} class={['input', className]} {...rest}>
</textarea>
