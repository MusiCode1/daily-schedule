<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import ImageDisplay from '$lib/components/ImageDisplay.svelte';
	import ListEditModal from '$lib/components/ListEditModal.svelte';
	import { listStore } from '$lib/stores/listStore.svelte';
	import { globalState } from '$lib/stores/globalState.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { List } from '$lib/types';
	import { TasksBoardController } from '$lib/logic/tasksBoard.svelte';
	import { ListsNavigationController } from '$lib/logic/listsNavigation.svelte';
	import { SessionController } from '$lib/logic/session.svelte';
	import { onMount } from 'svelte';
	import FloatingIframe from '$lib/components/FloatingIframe.svelte';
	import { TEXTS } from '$lib/services/language';
	import AddModal from './_components/AddModal.svelte';
	import BoardActionCard from './_components/BoardActionCard.svelte';
	import BoardFabAddButton from './_components/BoardFabAddButton.svelte';
	import BoardIconButton from './_components/BoardIconButton.svelte';
	import CelebrationModal from './_components/CelebrationModal.svelte';
	import ListHeader from './_components/ListHeader.svelte';
	import ListSwitcher from './_components/ListSwitcher.svelte';
	import PeopleDisplay from './_components/PeopleDisplay.svelte';
	import SplashScreen from './_components/SplashScreen.svelte';
	import TaskRow from './_components/TaskRow.svelte';

	// -- אתחול Controllers --
	const session = new SessionController();
	const nav = new ListsNavigationController();
	const board = new TasksBoardController();

	// עזר לגרירה/שחרור הנגזר מה-controller
	// שימוש ב-dnd manager ישירות מה-controller של הלוח
	const { dnd } = board;

	let isLoaded = $state(false);

	// State למודאל עריכת רשימה
	let isListEditModalOpen = $state(false);
	let editingListForModal: List | null = $state(null);
	let isFullScreen = $state(false);

	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch((e) => {
				console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
			});
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}

	onMount(() => {
		isLoaded = true;
		if (!session.currentUser) {
			void goto(resolve('/login'), { replaceState: true }).catch((error) => {
				console.warn('[TasksPage] navigation to /login failed', error);
			});
		}

		function onFullScreenChange() {
			isFullScreen = !!document.fullscreenElement;
		}
		document.addEventListener('fullscreenchange', onFullScreenChange);
		onFullScreenChange();
		return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
	});

	// פונקציה לשמירת רשימה מעודכנת
	function handleSaveList(formData: {
		name: string;
		greeting: string;
		logo: string;
		title: string;
		description: string;
		peopleIds: string[];
	}) {
		if (!session.currentUser) return;

		if (editingListForModal) {
			listStore.updateList(session.currentUser.id, editingListForModal.id, {
				name: formData.name,
				greeting: formData.greeting,
				logo: formData.logo,
				title: formData.title,
				description: formData.description,
				peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
			});
		} else {
			const newListId = listStore.addList(session.currentUser.id, formData.name);
			if (newListId) {
				listStore.updateList(session.currentUser.id, newListId, {
					greeting: formData.greeting,
					logo: formData.logo,
					title: formData.title,
					description: formData.description,
					peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
				});
			}
		}
		isListEditModalOpen = false;
	}
</script>

{#if !isLoaded}
	<SplashScreen />
{:else if session.currentUser}
	<!-- מסך הלוח המלא -->
	<header>
		<div class="header-controls">
			{#if board.isEditMode}
				<BoardIconButton
					onclick={toggleFullScreen}
					title={isFullScreen ? TEXTS.FULLSCREEN_EXIT : TEXTS.FULLSCREEN_ENTER}
					withFade
				>
					{isFullScreen ? '↙️' : '⛶'}
				</BoardIconButton>
			{/if}

			<BoardIconButton
				onclick={() => board.toggleEditMode()}
				title={board.isEditMode ? TEXTS.EDIT_MODE_EXIT : TEXTS.EDIT_MODE_ENTER}
			>
				{board.isEditMode ? '🔓' : '🔒'}
			</BoardIconButton>

			{#if board.isEditMode}
				<BoardIconButton
					class="settings-btn"
					onclick={() => goto(resolve('/settings'))}
					title={TEXTS.ADVANCED_SETTINGS_TITLE}
					withFade
				>
					⚙️
				</BoardIconButton>
			{/if}
		</div>

		<div class="user-profile">
			<button
				class="avatar-circle"
				onclick={() => {
					session.logout();
					goto(resolve('/login'), { replaceState: true });
				}}
				aria-label={TEXTS.SWITCH_USER_ARIA}
			>
				{#if session.currentUser.avatar}
					<div class="avatar-image">
						<ImageDisplay imageSrc={session.currentUser.avatar} alt={session.currentUser.name} />
					</div>
				{:else}
					<span>{session.currentUser.name[0]}</span>
				{/if}
			</button>
		</div>

		<div class="header-content">
			<!-- פנייה מגדרית -->
			<h1>
				{board.greeting}
				<span class="highlight-name">{session.currentUser.name}</span>
			</h1>
			<div class="subtitle">
				{TEXTS.PRAISE_ALUF(session.currentUser.gender)}
			</div>
		</div>
	</header>

	<div class="task-list-container">
		<div class="tasks-center-wrapper">
			{#if nav.userLists.length > 0}
				<ListSwitcher
					activeListId={nav.activeList?.id || ''}
					listsData={nav.userLists}
					onchange={(e) => nav.switchList(e.listId)}
				/>

				{#if nav.activeList?.isLocked}
					<div class="locked-badge">
						🔒 {TEXTS.LOCKED_LIST}
					</div>
				{/if}
			{/if}

			{#if nav.activeList?.title || nav.activeList?.description}
				<ListHeader
					logo={nav.activeList.logo}
					title={nav.activeList.title}
					description={nav.activeList.description}
				/>
			{/if}

			{#if nav.activeList?.peopleIds && nav.activeList.peopleIds.length > 0}
				<PeopleDisplay
					peopleIds={nav.activeList.peopleIds}
					isVisible={nav.activeList.isPeopleSectionVisible ?? true}
					ontoggle={() => board.togglePeopleSection()}
				/>
			{/if}

			{#if board.isEditMode}
				<div class="list-actions-panel" transition:fade>
					<div class="panel-header">
						<span class="panel-icon">📋</span>
						<span class="panel-title">{TEXTS.LIST_ACTIONS_PANEL_TITLE}</span>
					</div>

					<div class="panel-actions">
						<BoardActionCard
							variant="primary"
							icon="➕"
							label={TEXTS.NEW_LIST_ACTION}
							onclick={() => {
								editingListForModal = null;
								isListEditModalOpen = true;
							}}
						/>

						{#if nav.activeList}
							<BoardActionCard
								variant="edit"
								icon="✏️"
								label={TEXTS.EDIT_LIST_ACTION}
								onclick={() => {
									editingListForModal = nav.activeList || null;
									isListEditModalOpen = true;
								}}
							/>

							{#if !nav.activeList.isDefault}
								<BoardActionCard
									variant="visibility"
									icon={nav.activeList.isHidden ? '👁️' : '🚫'}
									label={nav.activeList.isHidden ? TEXTS.SHOW_LIST : TEXTS.HIDE_LIST}
									onclick={() => {
										if (session.currentUser && nav.activeList) {
											listStore.toggleListVisibility(session.currentUser.id, nav.activeList.id);
										}
									}}
								/>

								<BoardActionCard
									variant="lock"
									icon={nav.activeList.isLocked ? '🔓' : '🔒'}
									label={nav.activeList.isLocked ? TEXTS.UNLOCK_LIST : TEXTS.LOCK_LIST}
									onclick={() => {
										if (session.currentUser && nav.activeList) {
											listStore.toggleListLock(session.currentUser.id, nav.activeList.id);
										}
									}}
								/>
							{/if}
						{/if}

						<BoardActionCard
							variant="danger"
							icon="🗑️"
							label={TEXTS.DELETE_LIST_ACTION}
							onclick={() => nav.deleteCurrentList()}
						/>

						<BoardActionCard
							variant="warning"
							icon="🔄"
							label={TEXTS.RESET_TASKS_ACTION}
							onclick={() => {
								if (confirm(TEXTS.RESET_TASKS_CONFIRM_BOARD)) {
									board.resetAllTasks();
								}
							}}
						/>
					</div>
				</div>
			{/if}

			{#each board.tasks as task, index (task.id)}
				<div
					class="drag-wrapper"
					animate:flip={{ duration: 300 }}
					in:fade={{ duration: 200 }}
					out:fade={{ duration: 200 }}
					ondragover={dnd.handleDragOver}
					ondragenter={(e: DragEvent) => dnd.handleDragEnter(e, index)}
					ondrop={(e: DragEvent) => dnd.handleDrop(e, index)}
					role="group"
				>
					<TaskRow
						{task}
						isDone={globalState.state.taskProgress[task.id] ?? false}
						taskNumber={index + 1}
						isActive={index === board.activeTaskIndex}
						isEditMode={board.isEditMode}
						isFirst={index === 0}
						isLast={index === board.tasks.length - 1}
						ontoggle={() => board.toggleTask(task.id)}
						ondelete={() => board.deleteTask(task.id)}
						onedit={() => board.openAddModal(task)}
						onduplicate={() => board.duplicateTask(task.id)}
						onmoveup={() => board.moveTaskUp(task.id)}
						onmovedown={() => board.moveTaskDown(task.id)}
						onopenboard={(url) => board.openCommunicationBoard(url)}
						ondragstart={(e: DragEvent) => dnd.handleDragStart(e, index)}
					/>
				</div>
			{/each}

			{#if board.tasks.length === 0}
				<div class="empty-state">
					<p>{TEXTS.NO_TASKS_IN_LIST}</p>
					{#if board.isEditMode}
						<p>{TEXTS.CLICK_PLUS_TO_ADD}</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if board.isEditMode}
		<BoardFabAddButton onclick={() => board.openAddModal(null)}>＋</BoardFabAddButton>
	{/if}

	{#if board.isModalOpen}
		<AddModal
			taskToEdit={board.taskToEdit}
			onclose={() => board.closeAddModal()}
			onsave={(data) => board.saveTask(data)}
		/>
	{/if}

	<CelebrationModal
		isOpen={board.showCelebration}
		data={board.celebrationData}
		onclose={() => board.closeCelebration()}
	/>

	<ListEditModal
		isOpen={isListEditModalOpen}
		editingList={editingListForModal}
		userId={session.currentUser?.id || ''}
		onclose={() => (isListEditModalOpen = false)}
		onsave={handleSaveList}
	/>

	<!-- לוח תקשורת -->
	<FloatingIframe
		bind:isVisible={board.iframeBoardVisible}
		bind:url={board.iframeBoardUrl}
		title={TEXTS.COMMUNICATION_BOARD}
	/>
{/if}

<style>
	header {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 100;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		position: sticky;
		top: 0;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
		font-weight: 900;
		color: #333;
	}

	.highlight-name {
		background: linear-gradient(to left, var(--primary-accent), var(--secondary-accent));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.subtitle {
		font-size: 1rem;
		color: #4b5563;
		font-weight: bold;
	}

	.task-list-container {
		flex: 1;
		padding: 1rem 4.5rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overflow-x: hidden;
		min-height: 0;
	}

	.tasks-center-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}

	.drag-wrapper {
		width: 100%;
		max-width: 600px;
		display: flex;
		justify-content: center;
	}

	:global(.floating-add-btn) {
		position: fixed;
		bottom: 1.5rem;
		left: 1.5rem;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
		color: white;
		border: none;
		box-shadow: 0 4px 15px rgba(99, 102, 241, 0.5);
		font-size: 2.5rem;
		cursor: pointer;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (min-width: 600px) {
		header {
			flex-direction: column;
			align-items: center;
		}
	}

	.header-controls {
		position: absolute;
		top: 1rem;
		left: 1rem;
	}

	:global(.icon-btn) {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	:global(.icon-btn:hover) {
		opacity: 1;
	}

	.list-actions-panel {
		width: 100%;
		max-width: 600px;
		background: rgba(255, 255, 255, 0.4);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 24px;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.5);
		margin-top: 1rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	.panel-icon {
		font-size: 1.5rem;
	}

	.panel-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.panel-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
		gap: 0.75rem;
	}

	:global(.action-card) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.6rem 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
		font-size: 0.75rem;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
	}

	:global(.action-icon) {
		font-size: 1.8rem;
		line-height: 1;
	}

	:global(.action-label) {
		text-align: center;
		line-height: 1.2;
		max-width: 100%;
	}

	:global(.action-card.primary) {
		color: #4f46e5;
		background: rgba(99, 102, 241, 0.08);
		border-color: rgba(99, 102, 241, 0.15);
	}

	:global(.action-card.primary:hover) {
		background: rgba(99, 102, 241, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2);
		border-color: rgba(99, 102, 241, 0.3);
	}

	:global(.action-card.edit) {
		color: #7c3aed;
		background: rgba(139, 92, 246, 0.08);
		border-color: rgba(139, 92, 246, 0.15);
	}

	:global(.action-card.edit:hover) {
		background: rgba(139, 92, 246, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
		border-color: rgba(139, 92, 246, 0.3);
	}

	:global(.action-card.visibility) {
		color: #d97706;
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.15);
	}

	:global(.action-card.visibility:hover) {
		background: rgba(245, 158, 11, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2);
		border-color: rgba(245, 158, 11, 0.3);
	}

	:global(.action-card.danger) {
		color: #dc2626;
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.15);
	}

	:global(.action-card.danger:hover) {
		background: rgba(239, 68, 68, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.3);
	}

	:global(.action-card.warning) {
		color: #b45309;
		background: rgba(234, 179, 8, 0.08);
		border-color: rgba(234, 179, 8, 0.15);
	}

	:global(.action-card.warning:hover) {
		background: rgba(234, 179, 8, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(234, 179, 8, 0.2);
		border-color: rgba(234, 179, 8, 0.3);
	}

	:global(.action-card.lock) {
		color: #475569;
		background: rgba(100, 116, 139, 0.08);
		border-color: rgba(100, 116, 139, 0.15);
	}

	:global(.action-card.lock:hover) {
		background: rgba(100, 116, 139, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(100, 116, 139, 0.2);
		border-color: rgba(100, 116, 139, 0.3);
	}

	@media (max-width: 600px) {
		.panel-actions {
			grid-template-columns: repeat(2, 1fr);
		}

		:global(.action-card) {
			padding: 0.75rem 0.5rem;
			font-size: 0.85rem;
		}

		:global(.action-icon) {
			font-size: 1.3rem;
		}
	}

	.user-profile {
		position: absolute;
		top: 0.8rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		z-index: 20; /* הבטחה שזה נשאר למעלה */
	}

	.avatar-circle {
		width: 56px; /* הוגדל מ-40px */
		height: 56px;
		background: #e2e8f0;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		border: 3px solid white;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		overflow: hidden;
		padding: 0;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* מעבר קופצני */
		transform-origin: top right;
		position: relative; /* חשוב לתצוגה נכונה */
	}

	.avatar-circle:hover,
	.avatar-circle:active {
		transform: scale(2.2); /* זום דרמטי */
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		z-index: 30;
	}

	.avatar-circle .avatar-image {
		position: absolute;
		width: 100%;
		height: 100%;
		inset: 0;
	}

	.avatar-circle :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.empty-state {
		text-align: center;
		color: #888;
		margin-top: 2rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 1rem;
	}

	.locked-badge {
		font-size: 0.9rem;
		color: #64748b;
		font-weight: 600;
		padding: 0.5rem 1rem;
		background: #f8fafc;
		border-radius: 12px;
		border: 2px solid #e2e8f0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
