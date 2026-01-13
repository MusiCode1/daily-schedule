import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';
import { boostService } from '$lib/services/boosts';
import { audioSequencer } from '$lib/services/audioSequencer';
import type { Task } from '$lib/types';
import { DragDropManager } from './dragDrop.svelte';

export class TasksBoardController {
	// -- UI State --
	isEditMode = $state(false);
	isModalOpen = $state(false);
	taskToEdit: Task | null = $state(null);

	// Celebration State
	showCelebration = $state(false);
	celebrationMessage = $state('');

	// -- Dependencies --
	dnd: DragDropManager;

	constructor() {
		// Init DragDropManager with accessors
		this.dnd = new DragDropManager(
			() => this.isEditMode,
			() => this.currentUser,
			() => this.activeList,
			() => this.tasks
		);
	}

	// -- Derived Data --
	get currentUser() {
		return userStore.currentUser;
	}

	get activeList() {
		return this.currentUser ? listStore.getActiveList(this.currentUser.id) : undefined;
	}

	get tasks() {
		return this.activeList ? this.activeList.tasks : [];
	}

	get greeting() {
		return this.activeList?.greeting ? this.activeList.greeting + ',' : 'בהצלחה,';
	}

	// -- Actions --

	toggleEditMode() {
		this.isEditMode = !this.isEditMode;
	}

	toggleTask(taskId: string) {
		if (this.isEditMode || !this.currentUser || !this.activeList) return;

		const currentTaskIndex = this.tasks.findIndex((t) => t.id === taskId);
		const nextTask = this.tasks[currentTaskIndex + 1];

		const newTasks = this.tasks.map((t) => {
			if (t.id === taskId) {
				const isDone = !t.isDone;
				if (isDone) {
					this.triggerCelebration(t.name, nextTask?.name);
				}
				return { ...t, isDone };
			}
			return t;
		});

		listStore.updateTasks(this.currentUser.id, this.activeList.id, newTasks);
	}

	triggerCelebration(taskName?: string, nextTaskName?: string) {
		if (!this.currentUser) return;

		// Use generic boost if no task context, or full sequence if context exists
		if (taskName) {
			const { text, sequence } = boostService.getFeedbackSequence(
				this.currentUser.gender,
				taskName,
				nextTaskName
			);
			this.celebrationMessage = text;
			this.showCelebration = true;
			audioSequencer.playSequence(sequence);
		} else {
			// Fallback (simple)
			const boostText = boostService.getRandomBoost(this.currentUser.gender);
			this.celebrationMessage = boostText;
			this.showCelebration = true;
			// audioService.playDing() is handled inside boosts logic usually,
			// but simplified here for the controller
		}
	}

	closeCelebration() {
		this.showCelebration = false;
		// Optional: stop audio if modal closes?
	}

	// -- Add/Edit Task Flow --

	openAddModal(task: Task | null = null) {
		this.taskToEdit = task;
		this.isModalOpen = true;
	}

	closeAddModal() {
		this.isModalOpen = false;
		this.taskToEdit = null;
	}

	saveTask({ name, imageSrc }: { name: string; imageSrc: string | null }) {
		if (!this.currentUser || !this.activeList) return;

		let newTasks;
		if (this.taskToEdit) {
			// Edit
			newTasks = this.tasks.map((t) => {
				if (t.id === this.taskToEdit!.id) {
					return { ...t, name, imageSrc };
				}
				return t;
			});
		} else {
			// Add
			const newTask: Task = {
				id: crypto.randomUUID(),
				name,
				imageSrc,
				isDone: false
			};
			newTasks = [...this.tasks, newTask];
		}

		listStore.updateTasks(this.currentUser.id, this.activeList.id, newTasks);
		this.closeAddModal();
	}

	deleteTask(taskId: string) {
		if (!this.isEditMode || !this.currentUser || !this.activeList) return;
		const newTasks = this.tasks.filter((t) => t.id !== taskId);
		listStore.updateTasks(this.currentUser.id, this.activeList.id, newTasks);
	}
}
