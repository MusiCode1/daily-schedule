<script lang="ts">
	import { scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import type { CelebrationData } from '$lib/logic/tasksBoard.svelte';
	import ImageDisplay from '$lib/components/ImageDisplay.svelte';
	import { TEXTS } from '$lib/services/language';
	import { Card, ModalShell } from '$lib/components/ui';

	let {
		isOpen = false,
		data,
		onclose
	} = $props<{
		isOpen?: boolean;
		data: CelebrationData | null;
		onclose?: () => void;
	}>();

	function handleClose() {
		onclose?.();
	}
</script>

{#if isOpen && data}
	<ModalShell
		open={true}
		onClose={handleClose}
		closeOnOverlayClick={true}
		overlayClass="celebration-overlay"
		contentClass="celebration-modal"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="celebration-inner" onclick={handleClose} transition:scale={{ duration: 800, easing: elasticOut, start: 0.5 }}>
			{#if data.type === 'task' && data.completedTask}
				<!-- חלק 0: שם המשתמש ותמונה -->
				<div class="user-header">
					<h2 class="user-name">{data.userName}!</h2>
					{#if data.userImage}
						<div class="user-avatar">
							<ImageDisplay imageSrc={data.userImage} alt={data.userName} />
						</div>
					{:else}
						<div class="user-avatar-placeholder">👤</div>
					{/if}
				</div>

				<!-- חלק 1: סיימת את... + כרטיסייה -->
				<h2 class="top-text">{TEXTS.FINISHED_PREFIX(data.gender)}</h2>

				<Card class="celebration-task-card celebration-task-card--main">
					{#if data.completedTask.image}
						<div class="card-image">
							<ImageDisplay imageSrc={data.completedTask.image} alt={data.completedTask.name} />
						</div>
					{:else}
						<div class="no-image-placeholder">✅</div>
					{/if}
					<span class="card-title">{data.completedTask.name}</span>
				</Card>

				<!-- חלק 2: מחמאה גדולה -->
				<h1 class="praise-title">{data.praise}</h1>

				<!-- חלק 3: המשימה הבאה -->
				{#if data.nextTask}
					<div class="next-task-container">
						<p class="now-text">{TEXTS.NOW_PREFIX}</p>
						<Card class="celebration-task-card celebration-task-card--next">
							{#if data.nextTask.image}
								<div class="card-image card-image--sm">
									<ImageDisplay imageSrc={data.nextTask.image} alt={data.nextTask.name} />
								</div>
							{/if}
							<span class="card-title">{data.nextTask.name}</span>
						</Card>
					</div>
				{:else}
					<div class="all-done">
						<p>{TEXTS.ALL_DONE_MESSAGE}</p>
					</div>
				{/if}
			{:else}
				<!-- מודאל כללי (כשאין משימה ספציפית) -->
				<div class="confetti">🎉</div>
				<h1 class="praise-title">{data.praise}</h1>
			{/if}
		</div>
	</ModalShell>
{/if}

<style>
	@keyframes celebrationOverlayIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	:global(.modal-overlay.celebration-overlay) {
		z-index: 1000;
		cursor: pointer;
		animation: celebrationOverlayIn 200ms ease-out;
	}

	:global(.modal-content.celebration-modal) {
		/* צבעי הבסיס מגיעים מ-components.css (modal-content + משתני --modal-*) */
		--modal-text: var(--text-main);
		--modal-shadow: var(--shadow-xl);

		max-width: 420px;
		border: 3px solid rgba(255, 255, 255, 0.85);
		border-radius: 2rem;
		overflow: hidden;
		cursor: pointer;
		background: var(--bg-card);
	}

	:global(.modal-content.celebration-modal)::before {
		content: '';
		position: absolute;
		inset: -40px;
		pointer-events: none;
		opacity: 0.55;
		background:
			radial-gradient(circle at 10% 15%, color-mix(in srgb, var(--primary) 35%, transparent) 0%, transparent 50%),
			radial-gradient(circle at 90% 5%, color-mix(in srgb, var(--secondary) 30%, transparent) 0%, transparent 55%),
			radial-gradient(circle at 80% 85%, color-mix(in srgb, var(--warning) 28%, transparent) 0%, transparent 55%),
			radial-gradient(circle at 15% 85%, color-mix(in srgb, var(--success) 22%, transparent) 0%, transparent 60%);
		filter: saturate(1.05);
		transform: rotate(-3deg);
	}

	.celebration-inner {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	/* User Header */
	.user-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
		flex-direction: row-reverse; /* RTL support */
	}

	.user-name {
		font-size: 2.5rem;
		font-weight: 900;
		margin: 0;
		background: linear-gradient(to left, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.55);
	}

	.user-avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 4px solid white;
		overflow: hidden;
		box-shadow: 0 4px 10px rgba(0,0,0,0.1);
	}

	.user-avatar :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.user-avatar-placeholder {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		border: 4px solid #fce7f3;
	}

	/* Text Elements */
	.top-text {
		color: var(--text-main);
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
		font-weight: 500;
	}

	.praise-title {
		color: var(--text-main);
		font-size: 2.2rem;
		font-weight: 900;
		margin: 1.5rem 0;
		line-height: 1.1;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.now-text {
		color: var(--text-muted);
		font-size: 1.2rem;
		margin: 0 0 0.5rem 0;
		opacity: 0.9;
	}

	:global(.card.celebration-task-card) {
		width: 100%;
		max-width: 220px;
		padding: 1rem;
		gap: 0.5rem;
	}

	:global(.card.celebration-task-card:hover) {
		transform: none;
	}

	.card-image {
		width: auto;
		height: 120px;
		aspect-ratio: 1; /* תמונה מרובעת */
		border-radius: 1rem;
		overflow: hidden;
	}

	.card-image--sm {
		height: 96px;
	}

	.card-image :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.card-title {
		color: var(--primary);
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.2;
	}

	/* Next Task Section (Darker Yellow Box) */
	.next-task-container {
		background: rgba(255, 255, 255, 0.55);
		border-radius: 1.5rem;
		padding: 1rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
	}

	.all-done {
		color: var(--text-main);
		font-size: 1.5rem;
		font-weight: bold;
		margin-top: 1rem;
	}

	.no-image-placeholder {
		font-size: 3rem;
	}

	.confetti {
		font-size: 4rem;
	}
</style>
