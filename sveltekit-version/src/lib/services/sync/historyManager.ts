// Re-exports from engine (backward compat)
export {
	createEmptyHistory,
	appendToHistory,
	shouldCreateSnapshot,
	findEntryByWriteId,
	findCommonAncestor,
	reconstructState,
	mergeHistories
} from './engine/historyManager';
