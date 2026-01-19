import { globalState } from './globalState.svelte';
import { listStore } from './listStore.svelte';
import type { Person } from '../types';

export class PeopleStore {
	get people() {
		return globalState.state.people;
	}

	getAllPeople() {
		return this.people;
	}

	getPerson(id: string): Person | undefined {
		return this.people.find((p) => p.id === id);
	}

	addPerson(name: string, avatar: string): string {
		const id = crypto.randomUUID();
		const newPerson: Person = {
			id,
			name,
			avatar
		};

		globalState.state.people.push(newPerson);
		globalState.save();
		return id;
	}

	updatePerson(id: string, updates: Partial<Omit<Person, 'id'>>) {
		const personIndex = this.people.findIndex((p) => p.id === id);
		if (personIndex !== -1) {
			globalState.state.people[personIndex] = { 
				...this.people[personIndex], 
				...updates 
			};
			globalState.save();
		}
	}

	deletePerson(id: string) {
		// מחיקת האיש מהמאגר
		globalState.state.people = this.people.filter((p) => p.id !== id);

		// ניקוי הפניות מכל הרשימות
		const users = Object.keys(globalState.state.lists);
		users.forEach((userId) => {
			const userLists = globalState.state.lists[userId];
			userLists.forEach((list) => {
				if (list.peopleIds) {
					list.peopleIds = list.peopleIds.filter((personId) => personId !== id);
				}
			});
		});

		globalState.save();
	}
}

export const peopleStore = new PeopleStore();
