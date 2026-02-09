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

// Cast registry to typed array
const assets = registry as TtsAsset[];

export const ttsService = {
	/**
	 * Returns a random file path for the given asset ID, or null if none found.
	 * The path returned is relative to /sounds/ (without the prefix),
	 * ready for audioSequencer.
	 */
	getTtsFile(assetId: string): string | null {
		const asset = assets.find((a) => a.id === assetId);
		if (!asset || asset.files.length === 0) {
			return null;
		}

		// Random selection of take/voice
		const randomIndex = Math.floor(Math.random() * asset.files.length);
		const selectedFile = asset.files[randomIndex];

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
	getAudioSegment(assetId: string, fallbackText: string): AudioSegment {
		const file = this.getTtsFile(assetId);
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
