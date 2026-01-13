// src/lib/logic/dragDrop.svelte.ts
import { listStore } from '$lib/stores/listStore.svelte';
import type { Task } from '$lib/types';

export class DragDropManager {
	draggedItemIndex: number | null = $state(null);
	isEditMode: boolean = $state(false);

	constructor(
		getIsEditMode: () => boolean,
		getCurrentUser: () => { id: string } | undefined,
		getActiveList: () => { id: string } | undefined,
		getTasks: () => Task[]
	) {
		// We use derived or getters to access the latest state from the component
		this.getIsEditMode = getIsEditMode;
		this.getCurrentUser = getCurrentUser;
		this.getActiveList = getActiveList;
		this.getTasks = getTasks;
	}

	// Callbacks to access latest state
	private getIsEditMode: () => boolean;
	private getCurrentUser: () => { id: string } | undefined;
	private getActiveList: () => { id: string } | undefined;
	private getTasks: () => Task[];

	handleDragStart = (e: DragEvent, index: number) => {
		if (!this.getIsEditMode()) return;
		this.draggedItemIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	};

	handleDragEnter = (e: DragEvent, index: number) => {
		const isEdit = this.getIsEditMode();
		if (!isEdit || this.draggedItemIndex === null) return;
		if (this.draggedItemIndex === index) return;

		const currentUser = this.getCurrentUser();
		const activeList = this.getActiveList();

		if (!currentUser || !activeList) return;

		// Optimistic / Store update
		const tasks = this.getTasks();
		const newTasks = [...tasks];
		const [item] = newTasks.splice(this.draggedItemIndex, 1);
		newTasks.splice(index, 0, item);

		listStore.updateTasks(currentUser.id, activeList.id, newTasks);
		this.draggedItemIndex = index;
	};

	handleDrop = (e: DragEvent, targetIndex: number) => {
		e.preventDefault();
		this.draggedItemIndex = null;
	};

	handleDragOver = (e: DragEvent) => {
		e.preventDefault();
	};
}
