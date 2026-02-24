import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';
import { boostService } from '$lib/services/boosts';
import { audioSequencer } from '$lib/services/audioSequencer';
import { ttsService } from '$lib/services/tts';
import type { Task } from '$lib/types';
import { TEXTS } from '$lib/data/texts';
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

	// מצב לוח תקשורת
	iframeBoardUrl = $state('');
	iframeBoardVisible = $state(false);

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

	/**
	 * קבלת המשימות כמערך ממוין לפי order
	 */
	get tasks(): Task[] {
		if (!this.activeList) return [];
		return Object.values(this.activeList.tasks).sort((a, b) => a.order - b.order);
	}

	get greeting() {
		return this.activeList?.greeting
			? `${this.activeList.greeting},`
			: TEXTS.DEFAULT_GREETING_WITH_COMMA;
	}

	// אינדקס המשימה הפעילה (דילוג על משימות מבוטלות)
	get activeTaskIndex() {
		return this.tasks.findIndex((t) => !t.isDone && t.changeType !== 'cancelled');
	}

	// -- פעולות --

	toggleEditMode() {
		this.isEditMode = !this.isEditMode;
	}

	async toggleTask(taskId: string) {
		if (this.isEditMode || !this.currentUser || !this.activeList) return;

		// אם הרשימה נעולה - רק השמעת שם המשימה (מצב תרגול/הכנה)
		if (this.activeList.isLocked) {
			const task = this.tasks.find((t) => t.id === taskId);
			if (task) {
				await this.playTaskName(task);
			}
			return; // לא מעדכנים את המשימה
		}

		const currentTaskIndex = this.tasks.findIndex((t) => t.id === taskId);
		const currentTask = this.tasks[currentTaskIndex];

		// אם המשימה מסומנת כ"בוטלה" - רק להשמיע הודעה, לא לסמן כהושלמה
		if (currentTask.changeType === 'cancelled') {
			await this.playChangeAnnouncement(currentTask);
			return; // לא מעדכנים את המשימה
		}

		const nextTask = this.tasks[currentTaskIndex + 1];

		// עדכון המשימה ב-object
		const updatedTask = { ...currentTask, isDone: !currentTask.isDone };
		const newTasksObj = { ...this.activeList.tasks, [taskId]: updatedTask };

		if (updatedTask.isDone) {
			// טריגר חגיגה (לא מחכים)
			this.triggerCelebration(currentTask, nextTask);
		}

		listStore.updateTasks(this.currentUser.id, this.activeList.id, newTasksObj);
	}

	async playTaskName(task: Task) {
		// השמעת שם המשימה בלבד (למצב רשימה נעולה)
		// שימוש ב-TTS Service כדי למצוא הקלטה אם קיימת
		const segment = ttsService.getAudioSegment(task.id, task.name);
		await audioSequencer.playSequence([segment]);
	}

	async playChangeAnnouncement(task: Task) {
		if (!this.currentUser) return;
		const narrationSession = ttsService.createPlaybackSession('CHANGE_LABEL');

		// השמעת הודעת שינוי: "שינוי! היום אין [משימה]!"
		const sequence = [
			ttsService.getAudioSegment('CHANGE_LABEL', TEXTS.CHANGE_LABEL, narrationSession),
			ttsService.getAudioSegment('TODAY_NO', TEXTS.TODAY_NO, narrationSession),
			ttsService.getAudioSegment(task.id, task.name, narrationSession)
		];

		await audioSequencer.playSequence(sequence);
	}

	async triggerCelebration(completedTask?: Task, nextTask?: Task) {
		if (!this.currentUser) return;

		// השתמש בחיזוק כללי אם אין הקשר משימה, או ברצף מלא אם יש הקשר
		if (completedTask) {
			const { sequence, praise } = boostService.getFeedbackSequence(
				this.currentUser.gender,
				completedTask, // Passing full task object to allow ID lookup
				this.currentUser.name || '',
				nextTask
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

	// -- לוח תקשורת --

	openCommunicationBoard(url: string) {
		this.iframeBoardUrl = url;
		this.iframeBoardVisible = true;
	}

	closeCommunicationBoard() {
		this.iframeBoardVisible = false;
		this.iframeBoardUrl = '';
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

	saveTask({
		name,
		imageSrc,
		communicationBoardUrl,
		changeType
	}: {
		name: string;
		imageSrc: string | null;
		communicationBoardUrl?: string;
		changeType?: 'cancelled' | 'added';
	}) {
		if (!this.currentUser || !this.activeList) return;

		const tasksObj = { ...this.activeList.tasks };

		if (this.taskToEdit) {
			// עריכה - עדכון משימה קיימת
			const existingTask = tasksObj[this.taskToEdit.id];
			if (existingTask) {
				tasksObj[this.taskToEdit.id] = {
					...existingTask,
					name,
					imageSrc,
					communicationBoardUrl,
					changeType
				};
			}
		} else {
			// הוספה - משימה חדשה עם order מתאים
			const maxOrder = Math.max(...Object.values(tasksObj).map((t) => t.order), -1);
			const newTask: Task = {
				id: crypto.randomUUID(),
				name,
				imageSrc,
				isDone: false,
				order: maxOrder + 1, // שדה order חדש!
				communicationBoardUrl,
				changeType
			};
			tasksObj[newTask.id] = newTask;
		}

		listStore.updateTasks(this.currentUser.id, this.activeList.id, tasksObj);
		this.closeAddModal();
	}

	deleteTask(taskId: string) {
		if (!this.isEditMode || !this.currentUser || !this.activeList) return;

		const tasksObj = { ...this.activeList.tasks };
		delete tasksObj[taskId];

		// נורמליזציה של order (אופציונלי)
		this.normalizeTaskOrder(tasksObj);

		listStore.updateTasks(this.currentUser.id, this.activeList.id, tasksObj);
	}

	/**
	 * הזזת משימה למעלה (החלפת order עם המשימה שמעליה)
	 */
	moveTaskUp(taskId: string) {
		if (!this.isEditMode || !this.currentUser || !this.activeList) return;

		const sorted = this.tasks;
		const index = sorted.findIndex((t) => t.id === taskId);
		if (index <= 0) return;

		const tasksObj = { ...this.activeList.tasks };
		const currentOrder = tasksObj[taskId].order;
		const aboveTask = sorted[index - 1];

		tasksObj[taskId] = { ...tasksObj[taskId], order: aboveTask.order };
		tasksObj[aboveTask.id] = { ...tasksObj[aboveTask.id], order: currentOrder };

		listStore.updateTasks(this.currentUser.id, this.activeList.id, tasksObj);
	}

	/**
	 * הזזת משימה למטה (החלפת order עם המשימה שמתחתיה)
	 */
	moveTaskDown(taskId: string) {
		if (!this.isEditMode || !this.currentUser || !this.activeList) return;

		const sorted = this.tasks;
		const index = sorted.findIndex((t) => t.id === taskId);
		if (index < 0 || index >= sorted.length - 1) return;

		const tasksObj = { ...this.activeList.tasks };
		const currentOrder = tasksObj[taskId].order;
		const belowTask = sorted[index + 1];

		tasksObj[taskId] = { ...tasksObj[taskId], order: belowTask.order };
		tasksObj[belowTask.id] = { ...tasksObj[belowTask.id], order: currentOrder };

		listStore.updateTasks(this.currentUser.id, this.activeList.id, tasksObj);
	}

	/**
	 * שכפול משימה - יוצר עותק מתחת למשימה המקורית
	 */
	duplicateTask(taskId: string) {
		if (!this.isEditMode || !this.currentUser || !this.activeList) return;

		const originalTask = this.activeList.tasks[taskId];
		if (!originalTask) return;

		const tasksObj = { ...this.activeList.tasks };

		// הזז את כל המשימות שאחרי המשימה המקורית ב-1
		for (const t of Object.values(tasksObj)) {
			if (t.order > originalTask.order) {
				tasksObj[t.id] = { ...tasksObj[t.id], order: t.order + 1 };
			}
		}

		// צור עותק עם order מיד אחרי המקורית
		const newTask: Task = {
			id: crypto.randomUUID(),
			name: originalTask.name,
			imageSrc: originalTask.imageSrc,
			isDone: false,
			order: originalTask.order + 1,
			communicationBoardUrl: originalTask.communicationBoardUrl,
			changeType: originalTask.changeType
		};
		tasksObj[newTask.id] = newTask;

		listStore.updateTasks(this.currentUser.id, this.activeList.id, tasksObj);
	}

	/**
	 * נורמליזציה של order - מאפס את הסדר למספרים רציפים
	 */
	private normalizeTaskOrder(tasksObj: { [taskId: string]: Task }) {
		const sortedTasks = Object.values(tasksObj).sort((a, b) => a.order - b.order);
		sortedTasks.forEach((task, index) => {
			task.order = index;
		});
	}

	resetAllTasks() {
		if (!this.currentUser || !this.activeList) return;
		listStore.resetAllTasks(this.currentUser.id, this.activeList.id);
	}

	togglePeopleSection() {
		if (!this.currentUser || !this.activeList) return;
		const currentValue = this.activeList.isPeopleSectionVisible ?? true;
		listStore.updateList(this.currentUser.id, this.activeList.id, {
			isPeopleSectionVisible: !currentValue
		});
	}
}
