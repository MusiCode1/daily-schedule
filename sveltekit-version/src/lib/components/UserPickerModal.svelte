<script lang="ts">
	import { userStore } from '$lib/stores/userStore.svelte';
	import { TEXTS } from '$lib/services/language';
	import ImageDisplay from './ImageDisplay.svelte';

	interface Props {
		isOpen: boolean;
		currentUserId: string;
		onclose: () => void;
		onselect: (userId: string, shouldMove: boolean) => void;
	}

	let { isOpen, currentUserId, onclose, onselect }: Props = $props();

	let selectedUserId = $state('');
	let shouldMove = $state(false);

	// סינון: הצג רק משתמשים אחרים (לא המשתמש הנוכחי)
	const otherUsers = $derived(userStore.users.filter((u) => u.id !== currentUserId));

	// איפוס בעת פתיחה
	$effect(() => {
		if (isOpen) {
			selectedUserId = '';
			shouldMove = false;
		}
	});

	function handleSubmit() {
		if (!selectedUserId) return;
		onselect(selectedUserId, shouldMove);
		onclose();
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={onclose}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="0">
			<h2>{TEXTS.COPY_LIST_TO_USER}</h2>

			<div class="users-grid">
				{#each otherUsers as user}
					<label
						class="selection-card {selectedUserId === user.id ? 'selected' : ''}"
					>
						<input type="radio" name="targetUser" value={user.id} bind:group={selectedUserId} class="hidden" />
						<!-- svelte-ignore a11y_img_redundant_alt -->
						<div class="selection-card-img avatar-wrapper">
							<ImageDisplay imageSrc={user.avatar} alt={user.name} />
						</div>
						<span class="selection-card-label">{user.name}</span>
					</label>
				{/each}
			</div>

			<label class="move-checkbox">
				<input type="checkbox" bind:checked={shouldMove} />
				<span>{TEXTS.MOVE_INSTEAD_OF_COPY}</span>
			</label>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>{TEXTS.CANCEL}</button>
				<button class="btn" onclick={handleSubmit} disabled={!selectedUserId}>
					{shouldMove ? TEXTS.MOVE : TEXTS.COPY}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Using global classes from components.css for most things */

	.users-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	/* Specific override for avatar in selection card */
	.avatar-wrapper {
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid #e2e8f0;
		padding: 0; /* Override default padding if any */
	}

	.hidden {
		display: none;
	}

	.move-checkbox {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fef3c7;
		border: 2px solid #fde047;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.move-checkbox:hover {
		background: #fde047;
	}

	.move-checkbox input[type='checkbox'] {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}

	.move-checkbox span {
		font-weight: 500;
		color: #92400e;
		font-size: 0.9rem;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 1.5rem 0;
	}
</style>
