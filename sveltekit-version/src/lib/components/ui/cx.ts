export type ClassPart = string | false | null | undefined;

export function cx(...parts: ClassPart[]): string {
	return parts
		.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

