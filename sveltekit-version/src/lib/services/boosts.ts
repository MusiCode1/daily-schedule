import { BOOST_WORDS, type BoostWord } from '$lib/data/boosts';
import type { Gender, Task } from '$lib/types';
import { type AudioSegment } from './audioSequencer';
import { audioSequencer } from './audioSequencer';
import { ACTIVITIES } from '$lib/data/defaults';
import { TEXTS } from '$lib/data/texts';
import { ttsService } from './tts';

function findActivityIdByName(name: string): string | undefined {
	const activity = ACTIVITIES.find((a) => a.name === name);
	return activity?.id;
}

function buildFeedbackSequence(
	gender: Gender,
	task: Task,
	userName: string,
	nextTask?: Task
): { text: string; sequence: AudioSegment[]; praise: string } {
	const sequence: AudioSegment[] = [];
	const fullTextParts: string[] = [];
	const prefixId = gender === 'boy' ? 'FINISHED_OPT_BOY' : 'FINISHED_OPT_GIRL';
	const narrationSession = ttsService.createPlaybackSession(prefixId);

	// שם המשתמש
	const nameMap: Record<string, string> = {
		תמר: 'NAME_TAMAR',
		יונתן: 'NAME_YONATAN',
		אריאל: 'NAME_ARIEL',
		אבישי: 'NAME_AVISHAI'
	};

	const nameId = nameMap[userName];
	if (nameId) {
		sequence.push(ttsService.getAudioSegment(nameId, userName, narrationSession));
	} else {
		sequence.push({ type: 'tts', content: userName });
	}
	fullTextParts.push(`${userName}! `);

	// "סיימת את [משימה]"
	sequence.push(ttsService.getAudioSegment(prefixId, 'סיימת', narrationSession));

	const taskName = task.name;
	fullTextParts.push(TEXTS.FINISHED_TASK(gender, taskName));

	const taskAudioId = findActivityIdByName(taskName);
	if (taskAudioId) {
		sequence.push(ttsService.getAudioSegment(taskAudioId, taskName, narrationSession));
	} else {
		sequence.push({ type: 'tts', content: taskName });
	}

	// חיזוק (מחמאה)
	const randomIndex = Math.floor(Math.random() * BOOST_WORDS.length);
	const boost = BOOST_WORDS[randomIndex];

	const boostText = boost.gendered ? boost.gendered[gender] : boost.text || TEXTS.WELL_DONE;
	fullTextParts.push(`! ${boostText}`);

	const boostRequestFile =
		typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;

	if (boostRequestFile) {
		sequence.push(ttsService.getAudioSegment(boostRequestFile, boostText, narrationSession));
	}

	// המשימה הבאה או סיום הכל
	if (nextTask) {
		const nextTaskName = nextTask.name;
		sequence.push(ttsService.getAudioSegment('NOW_PREFIX', 'עכשיו', narrationSession));
		fullTextParts.push(TEXTS.NOW_NEXT(nextTaskName));

		const nextId = findActivityIdByName(nextTaskName);
		if (nextId) {
			sequence.push(ttsService.getAudioSegment(nextId, nextTaskName, narrationSession));
		} else {
			sequence.push({ type: 'tts', content: nextTaskName });
		}
	} else {
		sequence.push(
			ttsService.getAudioSegment('ALL_DONE_MESSAGE', TEXTS.ALL_DONE_MESSAGE, narrationSession)
		);
		fullTextParts.push(`. ${TEXTS.ALL_DONE_MESSAGE}`);
	}

	return {
		text: fullTextParts.join(''),
		sequence,
		praise: boostText
	};
}

export const boostService = {
	getRandomBoost(gender: Gender): string {
		const randomIndex = Math.floor(Math.random() * BOOST_WORDS.length);
		const boost = BOOST_WORDS[randomIndex];

		let text = '';
		if (boost.text) {
			text = boost.text;
		} else if (boost.gendered) {
			text = boost.gendered[gender];
		} else {
			text = TEXTS.WELL_DONE;
		}

		const audioId = typeof boost.audioFile === 'object' ? boost.audioFile[gender] : boost.audioFile;
		if (audioId) {
			const filename = ttsService.getTtsFile(audioId);
			if (filename) {
				audioSequencer.playFile(filename);
			}
		}

		return text;
	},

	getFeedbackSequence(gender: Gender, task: Task, userName: string, nextTask?: Task) {
		return buildFeedbackSequence(gender, task, userName, nextTask);
	}
};
