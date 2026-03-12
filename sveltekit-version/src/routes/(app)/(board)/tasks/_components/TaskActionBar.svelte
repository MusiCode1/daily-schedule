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

	// מחלקות Tailwind משותפות לכפתורים - משתמש במשתני ה-Theme (כמו var--primary) כדי לתמוך בערכות הנושא
	const baseBtn = `!w-11 !h-11 !rounded-full !flex items-center justify-center shrink-0 
		transition-all duration-300 bg-transparent hover:!text-white hover:scale-110 
		hover:-translate-y-0.5 active:scale-90 active:translate-y-0.5 
		disabled:opacity-40 disabled:!text-[var(--text-muted)] disabled:!bg-transparent 
		disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0`;
</script>

<div
	class="relative z-10 mx-auto mt-2 inline-flex max-w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--text-muted)]/20 px-3 py-1.5 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
	style="background: var(--bg-card); backdrop-filter: blur(12px);"
	dir="rtl"
>
	<!-- חץ למעלה -->
	<IconButton
		class="{baseBtn} text-[var(--primary)] hover:!bg-[var(--primary)] hover:shadow-[var(--primary)]/30 hover:shadow-md"
		disabled={isFirst}
		onclick={(e: Event) => handle(e, onmoveup)}
		title={TEXTS.MOVE_UP_ACTION}
		aria-label={TEXTS.MOVE_UP_ACTION}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
		>
	</IconButton>

	<div class="mx-0.5 h-7 w-[1.5px] rounded-sm bg-[var(--text-muted)] opacity-20"></div>

	<!-- עריכה -->
	<IconButton
		class="{baseBtn} text-[var(--edit)] hover:!bg-[var(--edit)] hover:shadow-[var(--edit)]/30 hover:shadow-md"
		onclick={(e: Event) => handle(e, onedit)}
		title={TEXTS.EDIT_ACTION}
		aria-label={TEXTS.EDIT_ACTION}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /><path
				d="m15 5 4 4"
			/></svg
		>
	</IconButton>

	<!-- שכפול -->
	<IconButton
		class="{baseBtn} text-[var(--info)] hover:!bg-[var(--info)] hover:shadow-[var(--info)]/30 hover:shadow-md"
		onclick={(e: Event) => handle(e, onduplicate)}
		title={TEXTS.DUPLICATE_TASK_ACTION}
		aria-label={TEXTS.DUPLICATE_TASK_ACTION}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
				d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
			/></svg
		>
	</IconButton>

	<!-- מחיקה -->
	<IconButton
		class="{baseBtn} text-[var(--danger)] hover:!bg-[var(--danger)] hover:shadow-[var(--danger)]/30 hover:shadow-md"
		onclick={(e: Event) => handle(e, ondelete)}
		title={TEXTS.DELETE_ACTION}
		aria-label={TEXTS.DELETE_ACTION}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
				d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
			/><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg
		>
	</IconButton>

	<div class="mx-0.5 h-7 w-[1.5px] rounded-sm bg-[var(--text-muted)] opacity-20"></div>

	<!-- חץ למטה -->
	<IconButton
		class="{baseBtn} text-[var(--primary)] hover:!bg-[var(--primary)] hover:shadow-(--primary)/30 hover:shadow-md"
		disabled={isLast}
		onclick={(e: Event) => handle(e, onmovedown)}
		title={TEXTS.MOVE_DOWN_ACTION}
		aria-label={TEXTS.MOVE_DOWN_ACTION}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
		>
	</IconButton>
</div>
