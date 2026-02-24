<script lang="ts">
	import { TEXTS } from '$lib/services/language';
	import { IconButton } from '$lib/components/ui';

	let {
		isFirst = false,
		isLast = false,
		onmoveup,
		onmovedown,
		onedit,
		onduplicate,
		ondelete
	} = $props<{
		isFirst?: boolean;
		isLast?: boolean;
		onmoveup?: () => void;
		onmovedown?: () => void;
		onedit?: () => void;
		onduplicate?: () => void;
		ondelete?: () => void;
	}>();

	function handle(e: Event, fn?: () => void) {
		e.stopPropagation();
		fn?.();
	}
</script>

<div class="action-bar">
	<!-- חץ למעלה -->
	<IconButton
		class="action-circle action-move"
		disabled={isFirst}
		onclick={(e: Event) => handle(e, onmoveup)}
		title={TEXTS.MOVE_UP_ACTION}
		aria-label={TEXTS.MOVE_UP_ACTION}
	>
		⬆
	</IconButton>

	<!-- עריכה -->
	<IconButton
		class="action-circle action-edit"
		onclick={(e: Event) => handle(e, onedit)}
		title={TEXTS.EDIT_ACTION}
		aria-label={TEXTS.EDIT_ACTION}
	>
		✏️
	</IconButton>

	<!-- שכפול -->
	<IconButton
		class="action-circle action-duplicate"
		onclick={(e: Event) => handle(e, onduplicate)}
		title={TEXTS.DUPLICATE_TASK_ACTION}
		aria-label={TEXTS.DUPLICATE_TASK_ACTION}
	>
		📋
	</IconButton>

	<!-- מחיקה -->
	<IconButton
		tone="danger"
		class="action-circle action-delete"
		onclick={(e: Event) => handle(e, ondelete)}
		title={TEXTS.DELETE_ACTION}
		aria-label={TEXTS.DELETE_ACTION}
	>
		🗑️
	</IconButton>

	<!-- חץ למטה -->
	<IconButton
		class="action-circle action-move"
		disabled={isLast}
		onclick={(e: Event) => handle(e, onmovedown)}
		title={TEXTS.MOVE_DOWN_ACTION}
		aria-label={TEXTS.MOVE_DOWN_ACTION}
	>
		⬇
	</IconButton>
</div>

<style>
	.action-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: var(--bg-card, #ffffff);
		border: 2px solid #e2e8f0;
		border-radius: var(--radius-md, 12px);
		box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
		width: fit-content;
		margin: 0.4rem auto 0;
	}

	/* כפתורים עגולים גדולים - דריסת btn-icon */
	:global(.action-circle.btn-icon) {
		width: 56px;
		height: 56px;
		border-radius: var(--radius-full, 9999px);
		border: 2px solid;
		font-size: 1.4rem;
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	:global(.action-circle.btn-icon:active) {
		transform: scale(0.92);
	}

	/* כפתורי חצים - ראשיים ובולטים */
	:global(.action-move.btn-icon) {
		border-color: var(--primary, #6366f1);
		color: var(--primary, #6366f1);
		background: var(--primary-bg, #e0e7ff);
	}

	:global(.action-move.btn-icon:hover:not(:disabled)) {
		background: var(--primary, #6366f1);
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
	}

	:global(.action-move.btn-icon:disabled) {
		opacity: 0.25;
		cursor: not-allowed;
		background: #f1f5f9;
		border-color: #cbd5e1;
		color: #cbd5e1;
	}

	/* כפתור עריכה */
	:global(.action-edit.btn-icon) {
		border-color: var(--edit, #8b5cf6);
		color: var(--edit, #8b5cf6);
		background: #faf5ff;
	}

	:global(.action-edit.btn-icon:hover) {
		background: var(--edit, #8b5cf6);
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
	}

	/* כפתור שכפול */
	:global(.action-duplicate.btn-icon) {
		border-color: var(--info, #3b82f6);
		color: var(--info, #3b82f6);
		background: #eff6ff;
	}

	:global(.action-duplicate.btn-icon:hover) {
		background: var(--info, #3b82f6);
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
	}

	/* כפתור מחיקה */
	:global(.action-delete.btn-icon) {
		border-color: var(--danger, #ef4444);
		color: var(--danger, #ef4444);
		background: var(--cancelled, #fef2f2);
	}

	:global(.action-delete.btn-icon:hover) {
		background: var(--danger, #ef4444);
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
	}
</style>
