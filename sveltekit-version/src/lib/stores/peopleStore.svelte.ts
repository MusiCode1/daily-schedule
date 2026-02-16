import { globalState } from './globalState.svelte';
import { listStore } from './listStore.svelte';
import type { Person } from '../types';

export class PeopleStore {
	get people() {
		return globalState.state.people;
	}

	getAllPeople() {
		return Object.values(this.people); // object → array
	}

	getPerson(id: string): Person | undefined {
		return this.people[id]; // גישה ישירה
	}

	addPerson(name: string, avatar: string): string {
		const id = crypto.randomUUID();
		const newPerson: Person = {
			id,
			name,
			avatar
		};

		globalState.state.people[id] = newPerson; // object במקום push
		globalState.save();
		return id;
	}

	updatePerson(id: string, updates: Partial<Omit<Person, 'id'>>) {
		const person = this.people[id];
		if (person) {
			globalState.state.people[id] = {
				...person,
				...updates
			};
			globalState.save();
		}
	}

	deletePerson(id: string) {
		// מחיקת האיש מהמאגר
		delete globalState.state.people[id]; // delete במקום filter

		// ניקוי הפניות מכל הרשימות
		const users = Object.keys(globalState.state.lists);
		users.forEach((userId) => {
			const userLists = globalState.state.lists[userId];
			Object.values(userLists).forEach((list) => {
				// עכשיו userLists זה object, צריך Object.values()
				if (list.peopleIds) {
					list.peopleIds = list.peopleIds.filter((personId) => personId !== id);
				}
			});
		});

		globalState.save();
	}
}

export const peopleStore = new PeopleStore();
