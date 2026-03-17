<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ClassValue } from 'svelte/elements';

	export type BoardActionCardVariant = 'primary' | 'edit' | 'visibility' | 'lock' | 'danger' | 'warning' | 'neutral';

	type Props = Omit<HTMLButtonAttributes, 'class' | 'children'> & {
		variant: BoardActionCardVariant;
		icon: string;
		label: string;
		class?: ClassValue;
	};

	let { type = 'button', variant, icon, label, class: className = undefined, ...rest }: Props = $props();
</script>

<button type={type} class={['action-card', variant, className]} {...rest}>
	<span class="action-icon">{icon}</span>
	<span class="action-label">{label}</span>
</button>

