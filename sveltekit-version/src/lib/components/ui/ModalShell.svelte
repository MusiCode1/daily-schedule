<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		open: boolean;
		onClose?: () => void;
		closeOnOverlayClick?: boolean;
		overlayClass?: ClassValue;
		contentClass?: ClassValue;
		children?: Snippet;
	};

	let {
		open,
		onClose,
		closeOnOverlayClick = true,
		children,
		overlayClass = undefined,
		contentClass = undefined
	}: Props = $props();

	function handleOverlayClick(e: MouseEvent) {
		if (!closeOnOverlayClick) return;
		if (e.target === e.currentTarget) onClose?.();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class={['modal-overlay', overlayClass]} onclick={handleOverlayClick}>
		<div class={['modal-content', contentClass]} role="dialog" aria-modal="true">
			{@render children?.()}
		</div>
	</div>
{/if}
