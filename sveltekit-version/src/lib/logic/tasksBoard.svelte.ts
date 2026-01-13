import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';
import { boostService } from '$lib/services/boosts';
import { audioSequencer } from '$lib/services/audioSequencer';
import type { Task } from '$lib/types';
import { DragDropManager } from './dragDrop.svelte';

export interface CelebrationData {
	type: 'task' | 'general';
	completedTask?: { name: string; image: string | null };
	nextTask?: { name: string; image: string | null };
	praise: string;
	gender: 'boy' | 'girl';
	userName: string;
	userImage: string | null;
}

export class TasksBoardController {
	// -- מצב ממשק משתמש --
	isEditMode = $state(false);
	isModalOpen = $state(false);
	taskToEdit: Task | null = $state(null);

	// מצב חגיגה
	showCelebration = $state(false);
	celebrationData: CelebrationData | null = $state(null);

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

	async toggleTask(taskId: string) {
		if (this.isEditMode || !this.currentUser || !this.activeList) return;

		const currentTaskIndex = this.tasks.findIndex((t) => t.id === taskId);
		const currentTask = this.tasks[currentTaskIndex];
		const nextTask = this.tasks[currentTaskIndex + 1];

		const newTasks = this.tasks.map((t) => {
			if (t.id === taskId) {
				const isDone = !t.isDone;
				if (isDone) {
					// אנחנו קוראים לזה אבל לא מחכים לו כאן, כדי לא לעכב את עדכון ה-UI של ה-V
					this.triggerCelebration(currentTask, nextTask);
				}
				return { ...t, isDone };
			}
			return t;
		});

		listStore.updateTasks(this.currentUser.id, this.activeList.id, newTasks);
	}

	async triggerCelebration(completedTask?: Task, nextTask?: Task) {
		if (!this.currentUser) return;

		// השתמש בחיזוק כללי אם אין הקשר משימה, או ברצף מלא אם יש הקשר
		if (completedTask) {
			const { sequence, praise } = boostService.getFeedbackSequence(
				this.currentUser.gender,
				completedTask.name,
				this.currentUser.name || '',
				nextTask?.name
			);

			this.celebrationData = {
				type: 'task',
				completedTask: { name: completedTask.name, image: completedTask.imageSrc },
				nextTask: nextTask ? { name: nextTask.name, image: nextTask.imageSrc } : undefined,
				praise,
				gender: this.currentUser.gender,
				userName: this.currentUser.name,
				userImage: this.currentUser.avatar || null
			};

			this.showCelebration = true;

			// המתנה לסיום האודיו לפני סגירת המודאל
			await audioSequencer.playSequence(sequence);
			this.closeCelebration();
		} else {
			// גיבוי (פשוט)
			const boostText = boostService.getRandomBoost(this.currentUser.gender);

			this.celebrationData = {
				type: 'general',
				praise: boostText,
				gender: this.currentUser.gender,
				userName: this.currentUser.name,
				userImage: this.currentUser.avatar || null
			};

			this.showCelebration = true;
			// audioService.playDing() מטופל בדרך כלל בתוך לוגיקת החיזוקים,
			// אך מופשט כאן עבור ה-Controller

			// במקרה הפשוט, נסגור אחרי זמן קצוב כי אין סיקוונסר
			setTimeout(() => {
				this.closeCelebration();
			}, 3000);
		}
	}

	closeCelebration() {
		this.showCelebration = false;
		this.celebrationData = null;
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
