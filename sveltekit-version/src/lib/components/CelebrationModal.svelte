<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import type { CelebrationData } from '$lib/logic/tasksBoard.svelte';

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
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="celebration-overlay" onclick={handleClose} transition:fade={{ duration: 200 }}>
		<div
			class="celebration-content"
			transition:scale={{ duration: 800, easing: elasticOut, start: 0.5 }}
		>
			<div
				class="modal-content"
				in:scale={{ duration: 400, start: 0.5 }}
				out:scale={{ duration: 300 }}
			>
				{#if data.type === 'task' && data.completedTask}
					<!-- חלק 1: סיימת את... -->
					<h2 class="title">
						{data.gender === 'boy' ? 'סיימת את' : 'סיימת את'}
						<span class="task-name">{data.completedTask.name}</span>
					</h2>

					<!-- תמונה ראשית -->
					{#if data.completedTask.image}
						<img src={data.completedTask.image} alt="" class="celebration-image main-image" />
					{:else}
						<div class="confetti">🎉</div>
					{/if}

					<!-- חלק 2: מחמאה -->
					<div class="praise-section">
						<p class="praise-text">{data.praise}</p>
					</div>

					<!-- חלק 3: המשימה הבאה -->
					{#if data.nextTask}
						<div class="next-task-section" transition:fade={{ delay: 1000 }}>
							<p class="now-text">עכשיו, <span class="task-name">{data.nextTask.name}</span></p>
							{#if data.nextTask.image}
								<img src={data.nextTask.image} alt="" class="celebration-image small-image" />
							{/if}
						</div>
					{:else}
						<div class="all-done">
							<p>סיימת את כל המשימות להיום!</p>
						</div>
					{/if}
				{:else}
					<!-- מודאל פשוט (ללא הקשר משימה) -->
					<div class="confetti">🎉</div>
					<h2 class="praise-text">{data.praise}</h2>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.celebration-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		pointer-events: auto;
		cursor: pointer;
	}

	.celebration-content {
		background: linear-gradient(135deg, #fbbf24, #f59e0b);
		color: white;
		padding: 2rem 3rem;
		border-radius: 2rem;
		text-align: center;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		border: 4px solid white;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}

	.title {
		font-size: 2rem;
		margin: 0;
		color: #fff;
		text-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.task-name {
		font-weight: 900;
		color: #4f46e5;
		background: rgba(255, 255, 255, 0.9);
		padding: 0.2rem 0.6rem;
		border-radius: 0.5rem;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.praise-text {
		font-size: 2.5rem;
		font-weight: bold;
		color: #fff;
		margin: 0.5rem 0;
		text-shadow: 0 2px 4px rgba(0,0,0,0.2);
	}

	.now-text {
		font-size: 1.5rem;
		margin: 0.5rem 0;
	}

	.confetti {
		font-size: 4rem;
		margin-bottom: 0.5rem;
	}

	.celebration-image {
		object-fit: cover;
		border-radius: 1rem;
		border: 4px solid white;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
		background: white;
		display: block;
		margin: 0.5rem auto;
	}

	.main-image {
		width: 200px;
		height: 200px;
	}

	.small-image {
		width: 100px;
		height: 100px;
	}

	.next-task-section {
		background: rgba(255, 255, 255, 0.2);
		padding: 1rem;
		border-radius: 1rem;
		margin-top: 0.5rem;
		width: 100%;
	}

	.all-done {
		font-size: 1.5rem;
		font-weight: bold;
		margin-top: 1rem;
	}
</style>
