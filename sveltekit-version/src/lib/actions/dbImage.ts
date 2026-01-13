import { db } from '$lib/services/db';

export function dbImage(node: HTMLImageElement, src: string | null) {
	let currentObjectUrl: string | null = null;
	let mounted = true;

	async function update(newSrc: string | null) {
		if (!newSrc) {
			node.src = ''; // Or handling placeholder logic elsewhere
			return;
		}

		if (newSrc.startsWith('idb:')) {
			// Show loading state if needed?
			// For now, we rely on the parent component to show a placeholder
			// until the image loads.

			try {
				const blob = await db.getImage(newSrc);
				if (mounted && blob) {
					if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
					currentObjectUrl = URL.createObjectURL(blob);
					node.src = currentObjectUrl;
				} else if (mounted) {
					// Fallback if not found in DB
					node.alt = 'Image not found';
				}
			} catch (e) {
				console.error('Failed to load image from DB', e);
			}
		} else {
			// Normal URL
			if (currentObjectUrl) {
				URL.revokeObjectURL(currentObjectUrl);
				currentObjectUrl = null;
			}
			node.src = newSrc;
		}
	}

	update(src);

	return {
		update(newSrc: string | null) {
			update(newSrc);
		},
		destroy() {
			mounted = false;
			if (currentObjectUrl) {
				URL.revokeObjectURL(currentObjectUrl);
			}
		}
	};
}
