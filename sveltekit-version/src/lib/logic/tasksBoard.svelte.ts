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

	get tasks() {
		return this.activeList ? this.activeList.tasks : [];
	}

	get greeting() {
		return this.activeList?.greeting ? this.activeList.greeting + ',' : 'בהצלחה,';
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

		const currentTaskIndex = this.tasks.findIndex((t) => t.id === taskId);
		const currentTask = this.tasks[currentTaskIndex];
		
		// אם המשימה מסומנת כ"בוטלה" - רק להשמיע הודעה, לא לסמן כהושלמה
		if (currentTask.changeType === 'cancelled') {
			await this.playChangeAnnouncement(currentTask.name);
			return; // לא מעדכנים את המשימה
		}
		
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

	async playChangeAnnouncement(taskName: string) {
		if (!this.currentUser) return;
		
		// השמעת הודעת שינוי: "שינוי! היום אין [משימה]!"
		// כרגע משתמשים ב-TTS כי אין קבצי אודיו ייעודיים
		const sequence: Array<{ type: 'file' | 'tts'; content: string }> = [
			{ type: 'tts', content: 'שינוי!' },
			{ type: 'tts', content: 'היום אין' },
			{ type: 'tts', content: taskName }
		];
		
		await audioSequencer.playSequence(sequence);
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

		let newTasks;
		if (this.taskToEdit) {
			// עריכה
			newTasks = this.tasks.map((t) => {
				if (t.id === this.taskToEdit!.id) {
					return { 
						...t, 
						name, 
						imageSrc,
						communicationBoardUrl,
						changeType
					};
				}
				return t;
			});
		} else {
			// הוספה
			const newTask: Task = {
				id: crypto.randomUUID(),
				name,
				imageSrc,
				isDone: false,
				communicationBoardUrl,
				changeType
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
