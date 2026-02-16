import { afterEach, describe, expect, it, vi } from 'vitest';
import { ttsService } from '$lib/services/tts';

describe('ttsService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers names and resolves them as recorded files', () => {
		const session = ttsService.createPlaybackSession('APP_TITLE_PART1');
		const segment = ttsService.getAudioSegment('NAME_TAMAR', 'תמר', session);

		expect(segment.type).toBe('file');
		expect(segment.content).toBe('names/tamar.mp3');
	});

	it('keeps one narrator per playback session', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);

		const session = ttsService.createPlaybackSession('APP_TITLE_PART1');
		expect(session.voice).toBe('hope');

		const first = ttsService.getAudioSegment('LOADING_APP', 'fallback', session);
		const second = ttsService.getAudioSegment('NOW_PREFIX', 'fallback', session);

		expect(first.type).toBe('file');
		expect(second.type).toBe('file');

		if (first.type === 'file') {
			expect(first.content).toContain('hope-');
		}
		if (second.type === 'file') {
			expect(second.content).toContain('hope-');
		}
	});

	it('falls back to runtime TTS when locked narrator has no recorded file for asset', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);

		const session = ttsService.createPlaybackSession('APP_TITLE_PART1');
		expect(session.voice).toBe('hope');

		const segment = ttsService.getAudioSegment('SETTINGS_TITLE', 'הגדרות מערכת', session);

		expect(segment).toEqual({ type: 'tts', content: 'הגדרות מערכת' });
	});
});
