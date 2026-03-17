<script lang="ts">
	import ImageDisplay from '$lib/components/ImageDisplay.svelte';
	import { DEFAULT_LIST_IMAGE } from '$lib/config';
	import { TEXTS } from '$lib/services/language';
	import type { List } from '$lib/types';

	let {
		activeListId = $bindable('morning_routine'),
		listsData = [],
		isEditMode = false,
		onchange,
		onAddList
	} = $props<{
		activeListId?: string;
		listsData?: List[];
		isEditMode?: boolean;
		onchange?: (detail: { listId: string }) => void;
		onAddList?: () => void;
	}>();

	function selectList(listId: string) {
		if (activeListId !== listId) {
			activeListId = listId;
			onchange?.({ listId });
		}
	}
</script>

<div class="switcher-container">
	<div class="list-switcher">
		{#each listsData as List[] as list (list.id)}
			<button
				class="list-card"
				class:active={activeListId === list.id}
				onclick={() => selectList(list.id)}
			>
				<div class="image-container">
					<ImageDisplay imageSrc={list.logo || DEFAULT_LIST_IMAGE} alt={list.name} />
				</div>
				<span class="list-name">{list.name}</span>
			</button>
		{/each}

		{#if isEditMode}
			<button class="list-card add-list-card" onclick={onAddList}>
				<div class="add-icon">＋</div>
				<span class="list-name">{TEXTS.NEW_LIST_ACTION}</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.switcher-container {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.8);
		border-radius: 20px;
		padding: 0.5rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.05),
			0 2px 4px -1px rgba(0, 0, 0, 0.03),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
		margin: 0 auto;
		width: fit-content;
		max-width: 100%;
	}

	.list-switcher {
		display: flex;
		gap: 0.8rem;
		padding: 0.2rem;
		overflow-x: auto;
		justify-content: center;
	}

	.list-card {
		background: rgba(255, 255, 255, 0.8);
		border: 2px solid transparent;
		border-radius: 16px;
		padding: 0.4rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100px;
		position: relative;
	}

	.list-card:hover {
		transform: translateY(-2px);
		background: white;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.list-card.active {
		border-color: var(--primary-accent, #6366f1);
		background: #ffffff;
		box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
	}

	.image-container {
		width: 100%;
		aspect-ratio: 16/9;
		border-radius: 10px;
		overflow: hidden;
		position: relative;
		isolation: isolate;
	}

	.image-container :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.list-name {
		font-size: 0.8rem;
		font-weight: 600;
		color: #4b5563;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.list-card.active .list-name {
		color: var(--primary-accent, #6366f1);
	}

	/* כפתור "רשימה חדשה" */
	.add-list-card {
		border: 2px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.8);
	}

	.add-list-card:hover {
		border-color: var(--primary-accent, #6366f1);
		background: white;
	}

	.add-icon {
		width: 100%;
		aspect-ratio: 16/9;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.75rem;
		color: #94a3b8;
		background: #f1f5f9;
	}

	.add-list-card:hover .add-icon {
		color: var(--primary-accent, #6366f1);
		background: #eef2ff;
	}

	.add-list-card .list-name {
		color: #94a3b8;
	}

	.add-list-card:hover .list-name {
		color: var(--primary-accent, #6366f1);
	}
</style>
