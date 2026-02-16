import fs from 'fs';
import path from 'path';
import { TTS_DEFINITIONS } from '../src/lib/data/tts-definitions';

const SOUNDS_DIR = 'static/sounds';
const REGISTRY_OUTPUT = 'src/lib/data/tts-registry.json';

// Types matches src/lib/data/tts.ts
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

function appendNameFiles(
	definitionId: string,
	baseFilename: string,
	soundsPath: string,
	variationDirs: Array<{ name: string; voice: string; version: string; take: string }>,
	files: TtsFile[]
) {
	if (!definitionId.startsWith('NAME_')) return;

	const namesFilePath = path.join(soundsPath, 'names', baseFilename);
	if (!fs.existsSync(namesFilePath)) return;

	// קבצי שמות יושמעו לכל קריין כדי למנוע fallback ל-TTS.
	// בפועל זה אותו קובץ, אך הוא נרשם תחת כל voice קיים.
	const uniqueVoices = Array.from(new Set(variationDirs.map((dir) => dir.voice)));
	const voicesToUse = uniqueVoices.length > 0 ? uniqueVoices : ['default'];

	for (const voice of voicesToUse) {
		files.push({
			path: `/sounds/names/${baseFilename}`,
			voice,
			version: 'names',
			take: 't1'
		});
	}
}

function scanTtsFiles(): TtsAsset[] {
	const registry: TtsAsset[] = [];

	// Ensure we're running from project root
	const soundsPath = path.resolve(process.cwd(), SOUNDS_DIR);
	if (!fs.existsSync(soundsPath)) {
		console.warn(`[tts-scanner] Sounds directory not found: ${soundsPath}`);
		return [];
	}

	const subdirs = fs
		.readdirSync(soundsPath, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory());

	// Parse directories like "river-v0.2-t2"
	const variationDirs = subdirs
		.map((dirent) => {
			const match = dirent.name.match(/^(.+)-(v\d+\.\d+)-(t\d+)$/);
			if (match) {
				return {
					name: dirent.name,
					voice: match[1],
					version: match[2],
					take: match[3]
				};
			}
			return null;
		})
		.filter((dir): dir is { name: string; voice: string; version: string; take: string } => !!dir);

	for (const def of TTS_DEFINITIONS) {
		const files: TtsFile[] = [];

		// 1. Scan variations directories
		for (const dir of variationDirs) {
			if (!dir) continue;

			const filePath = path.join(soundsPath, dir.name, def.baseFilename);
			if (fs.existsSync(filePath)) {
				files.push({
					path: `/sounds/${dir.name}/${def.baseFilename}`,
					voice: dir.voice,
					version: dir.version,
					take: dir.take
				});
			}
		}

		appendNameFiles(def.id, def.baseFilename, soundsPath, variationDirs, files);

		// 2. (Optional) Check for legacy root files?
		// Current decision: Only scan structured folders based on plan.
		// If we want legacy, we'd check path.join(soundsPath, def.baseFilename)
		// But for now, we want to enforce the new system.
		// HOWEVER, to support existing V0.1 files that are in root, we might want one check:
		// Or we assume user will move them.
		// Let's stick to the generated folders for now as per plan.

		registry.push({
			id: def.id,
			text: def.text,
			files
		});
	}

	return registry;
}

export function ttsScannerPlugin() {
	return {
		name: 'tts-scanner',
		buildStart() {
			console.log('[tts-scanner] Scanning TTS files...');
			const registry = scanTtsFiles();
			const outputPath = path.resolve(process.cwd(), REGISTRY_OUTPUT);
			fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));
			console.log(
				`[tts-scanner] Generated registry with ${registry.length} assets at ${REGISTRY_OUTPUT}`
			);
		},
		handleHotUpdate({ file, server }: any) {
			if (file.includes(SOUNDS_DIR) || file.includes('tts-definitions.ts')) {
				console.log('[tts-scanner] Sounds or Definitions changed, rescanning...');
				const registry = scanTtsFiles();
				const outputPath = path.resolve(process.cwd(), REGISTRY_OUTPUT);
				fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));

				// Trigger client update if needed, though JSON import might need restart or invalidation
				// Usually Vite handles JSON reloading if the file changes on disk.
			}
		}
	};
}
