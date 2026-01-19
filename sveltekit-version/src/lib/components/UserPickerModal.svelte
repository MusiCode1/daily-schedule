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
	<div class="modal-overlay" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()} role="button" tabindex="-1">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="0">
			<h2>{TEXTS.COPY_LIST_TO_USER}</h2>

			<div class="users-grid">
				{#each otherUsers as user}
					<label
						class="user-option {selectedUserId === user.id ? 'selected' : ''}"
					>
						<input type="radio" name="targetUser" value={user.id} bind:group={selectedUserId} />
						<div class="user-avatar-wrapper">
							<ImageDisplay imageSrc={user.avatar} alt={user.name} />
						</div>
						<span>{user.name}</span>
					</label>
				{/each}
			</div>

			<label class="move-checkbox">
				<input type="checkbox" bind:checked={shouldMove} />
				<span>{TEXTS.MOVE_INSTEAD_OF_COPY}</span>
			</label>

			<div class="modal-actions">
				<button class="btn-cancel" onclick={onclose}>{TEXTS.CANCEL}</button>
				<button class="btn-save" onclick={handleSubmit} disabled={!selectedUserId}>
					{shouldMove ? TEXTS.MOVE : TEXTS.COPY}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal-card {
		background: white;
		border-radius: 24px;
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0 0 1.5rem 0;
		text-align: center;
	}

	.users-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.user-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
	}

	.user-option:hover {
		border-color: #cbd5e1;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.user-option input[type='radio'] {
		display: none;
	}

	.user-option.selected {
		border-color: #6366f1;
		background: #f5f7ff;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
	}

	.user-avatar-wrapper {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid #e2e8f0;
	}

	.user-option span {
		font-weight: 600;
		color: #334155;
		text-align: center;
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

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn-cancel,
	.btn-save {
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		font-size: 1rem;
	}

	.btn-cancel {
		background: #f1f5f9;
		color: #64748b;
	}

	.btn-cancel:hover {
		background: #e2e8f0;
	}

	.btn-save {
		background: #6366f1;
		color: white;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
	}

	.btn-save:hover:not(:disabled) {
		background: #4f46e5;
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
	}

	.btn-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
