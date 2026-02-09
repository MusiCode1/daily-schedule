<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ClassValue } from 'svelte/elements';
	import type { ButtonSize, ButtonVariant } from './types';

	type Props = Omit<HTMLButtonAttributes, 'class'> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: ClassValue;
		children?: Snippet;
	};

	let {
		variant = 'default',
		size = 'md',
		type = 'button',
		children,
		class: className = undefined,
		...rest
	}: Props = $props();

	function getVariantClass(v: ButtonVariant): string | undefined {
		switch (v) {
			case 'default':
				return undefined;
			case 'primary':
				return 'btn-primary';
			case 'secondary':
				return 'btn-secondary';
			case 'danger':
				return 'btn-danger';
			case 'warning':
				return 'btn-warning';
			case 'edit':
				return 'btn-edit';
			case 'outline':
				return 'btn-outline';
			case 'text':
				return 'btn-text';
		}
	}

	function getSizeClass(s: ButtonSize): string | undefined {
		switch (s) {
			case 'md':
				return undefined;
			case 'sm':
				return 'btn-sm';
			case 'xs':
				return 'btn-xs';
		}
	}
</script>

<button type={type} class={['btn', getVariantClass(variant), getSizeClass(size), className]} {...rest}>
	{@render children?.()}
</button>
