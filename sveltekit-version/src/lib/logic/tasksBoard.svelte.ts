import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';
import { boostService } from '$lib/services/boosts';
import { audioSequencer } from '$lib/services/audioSequencer';
import type { Task } from '$lib/types';
import { DragDropManager } from './dragDrop.svelte';

export class TasksBoardController {
	// -- מצב ממשק משתמש --
	isEditMode = $state(false);
	isModalOpen = $state(false);
	taskToEdit: Task | null = $state(null);

	// מצב חגיגה
	showCelebration = $state(false);
	celebrationMessage = $state('');

	// -- תלויות --
	dnd: DragDropManager;

	constructor() {
		// אתחול DragDropManager עם גישה לנתונים
		this.dnd = new DragDropManager(
			() => this.isEditMode,
			() => this.currentUser,
			() => this.activeList,
			() => this.tasks
		);
	}

	// -- נתונים נגזרים --
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

	// -- פעולות --

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

		// השתמש בחיזוק כללי אם אין הקשר משימה, או ברצף מלא אם יש הקשר
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
			// גיבוי (פשוט)
			const boostText = boostService.getRandomBoost(this.currentUser.gender);
			this.celebrationMessage = boostText;
			this.showCelebration = true;
			// audioService.playDing() מטופל בדרך כלל בתוך לוגיקת החיזוקים,
			// אך מופשט כאן עבור ה-Controller
		}
	}

	closeCelebration() {
		this.showCelebration = false;
		// אופציונלי: עצירת אודיו בסגירת המודאל?
	}

	// -- תהליך הוספה/עריכה של משימה --

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
			// עריכה
			newTasks = this.tasks.map((t) => {
				if (t.id === this.taskToEdit!.id) {
					return { ...t, name, imageSrc };
				}
				return t;
			});
		} else {
			// הוספה
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
