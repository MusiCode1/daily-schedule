<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import type { CelebrationData } from '$lib/logic/tasksBoard.svelte';
	import ImageDisplay from './ImageDisplay.svelte';

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
			{#if data.type === 'task' && data.completedTask}
				<!-- חלק 0: שם המשתמש ותמונה -->
				<div class="user-header">
					<h2 class="user-name">{data.userName}!</h2>
					{#if data.userImage}
						<div class="user-avatar">
							<ImageDisplay 
								imageSrc={data.userImage}
								alt={data.userName}
							/>
						</div>
					{:else}
						<div class="user-avatar-placeholder">👤</div>
					{/if}
				</div>

				<!-- חלק 1: סיימת את... + כרטיסייה -->
				<h2 class="top-text">
					{data.gender === 'boy' ? 'סיימת את' : 'סיימת את'}
				</h2>

				<div class="task-card main-card">
					{#if data.completedTask.image}
						<div class="card-image">
							<ImageDisplay 
								imageSrc={data.completedTask.image}
								alt={data.completedTask.name}
							/>
						</div>
					{:else}
						<div class="no-image-placeholder">✅</div>
					{/if}
					<span class="card-title">{data.completedTask.name}</span>
				</div>

				<!-- חלק 2: מחמאה גדולה -->
				<h1 class="praise-title">{data.praise}</h1>

				<!-- חלק 3: המשימה הבאה -->
				{#if data.nextTask}
					<div class="next-task-container" transition:fade={{ delay: 500 }}>
						<p class="now-text">עכשיו,</p>
						<div class="task-card next-card">
							{#if data.nextTask.image}
								<div class="card-image">
									<ImageDisplay 
										imageSrc={data.nextTask.image}
										alt={data.nextTask.name}
									/>
								</div>
							{/if}
							<span class="card-title">{data.nextTask.name}</span>
						</div>
					</div>
				{:else}
					<div class="all-done">
						<p>סיימת את כל המשימות!</p>
					</div>
				{/if}
			{:else}
				<!-- מודאל כללי (כשאין משימה ספציפית) -->
				<div class="confetti">🎉</div>
				<h1 class="praise-title">{data.praise}</h1>
			{/if}
		</div>
	</div>
{/if}

<style>
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
		color: #a855f7; /* Purple/Orange mix compliant */
		text-shadow: 2px 2px 0px #fbbf24;
		margin: 0;
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

	/* Overlay */
	.celebration-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7); /* Darker overlay */
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		pointer-events: auto;
		cursor: pointer;
	}

	/* Main Yellow Container */
	.celebration-content {
		background: #fbbf24; /* Solid Yellow */
		border: 5px solid white;
		border-radius: 2rem;
		padding: 2rem;
		width: 90%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		position: relative;
	}

	/* Text Elements */
	.top-text {
		color: white;
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
		font-weight: 500;
	}

	.praise-title {
		color: white;
		font-size: 2.2rem;
		font-weight: 900;
		margin: 1.5rem 0;
		line-height: 1.1;
		text-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.now-text {
		color: white;
		font-size: 1.2rem;
		margin: 0 0 0.5rem 0;
		opacity: 0.9;
	}

	/* Task Cards (White Box) */
	.task-card {
		background: white;
		border-radius: 1.5rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		width: 100%;
		max-width: 200px; /* Limit card width */
	}

	/* Removed empty .main-card and .next-card rules */

	.card-image {
		width: auto;
		height: 120px;
		aspect-ratio: 1; /* תמונה מרובעת */
		border-radius: 1rem;
		overflow: hidden;
	}

	.card-image :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.card-title {
		color: #4f46e5; /* Blue info text */
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.2;
	}

	/* Next Task Section (Darker Yellow Box) */
	.next-task-container {
		background: rgba(0, 0, 0, 0.1); /* Slightly darker generic overlay */
		border-radius: 1.5rem;
		padding: 1rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.all-done {
		color: white;
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
