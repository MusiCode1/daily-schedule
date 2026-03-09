import registry from '$lib/data/tts-registry.json';
import type { AudioSegment } from './audioSequencer';

// Types derived from the JSON structure
interface TtsFile {
	path: string;
	voice: string;
	version: string;
	take: string;
}

interface TtsAsset {
	id: string;
	text: string;
	files: TtsFile[];
}

export interface TtsPlaybackSession {
	voice: string | null;
}

// Cast registry to typed array
let assets = registry as TtsAsset[];



export const ttsService = {

	async init() {
		const ttsRegistry = fetch('/tts-registry.json')
			.then((res) => res.json())
			.then((data) => {
				console.log('TTS registry loaded:', data);
				assets = data as TtsAsset[];
				return data as TtsAsset[];
			})
			.catch((err) => {
				console.error('Failed to load TTS registry:', err);
				return [];
			});

			return ttsRegistry.then((loadedAssets) => {
				assets = loadedAssets;
				console.log('TTS service initialized with assets:', assets);
			});
	},

	createPlaybackSession(seedAssetId?: string): TtsPlaybackSession {
		const session: TtsPlaybackSession = { voice: null };

		// נועל קריין כבר בתחילת רצף, כדי למנוע ערבוב קולות.
		if (seedAssetId) {
			this.getTtsFile(seedAssetId, session);
		}

		return session;
	},

	/**
	 * Returns a random file path for the given asset ID, or null if none found.
	 * The path returned is relative to /sounds/ (without the prefix),
	 * ready for audioSequencer.
	 */
	getTtsFile(assetId: string, session?: TtsPlaybackSession): string | null {
		const asset = assets.find((a) => a.id === assetId);
		if (!asset || asset.files.length === 0) {
			return null;
		}

		let candidateFiles = asset.files;

		// אם יש סשן עם קריין נעול - בוחרים רק ממנו.
		if (session?.voice) {
			candidateFiles = asset.files.filter((file) => file.voice === session.voice);
			if (candidateFiles.length === 0) {
				return null;
			}
		}

		const randomIndex = Math.floor(Math.random() * candidateFiles.length);
		const selectedFile = candidateFiles[randomIndex];

		// קיבוע הקריין הראשון שנבחר לרצף כולו.
		if (session && !session.voice) {
			session.voice = selectedFile.voice;
		}

		// Remove '/sounds/' prefix as audioSequencer adds it
		return selectedFile.path.replace(/^\/sounds\//, '');
	},

	/**
	 * Returns the specific text associated with an asset ID (for fallback)
	 */
	getTtsText(assetId: string): string | null {
		const asset = assets.find((a) => a.id === assetId);
		return asset ? asset.text : null;
	},

	/**
	 * returning an AudioSegment for the sequencer.
	 * Prefers a recorded file (random take), falls back to Web Speech API.
	 */
	getAudioSegment(assetId: string, fallbackText: string, session?: TtsPlaybackSession): AudioSegment {
		const file = this.getTtsFile(assetId, session);
		if (file) {
			return { type: 'file', content: file };
		}

		// Try to find the official text from registry if available, otherwise use fallback
		const officialText = this.getTtsText(assetId);

		return {
			type: 'tts',
			content: officialText || fallbackText
		};
	}
};
