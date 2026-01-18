<script lang="ts">
	import { floatingBoardState } from '$lib/services/floatingBoardState';

	// Props
	let {
		isVisible = $bindable(false),
		url = $bindable(''),
		title = 'חלון צף'
	} = $props();

	// משתני מצב
	let floatingWindow = $state<HTMLDivElement | null>(null);
	let windowHeader = $state<HTMLDivElement | null>(null);
	let iframe = $state<HTMLIFrameElement | null>(null);
	let overlay = $state<HTMLDivElement | null>(null);

	// טעינת המצב השמור או ברירת מחדל
	let position = $state({ top: 100, left: 100 });
	let windowSize = $state({ width: 800, height: 600 });

	let isDragging = $state(false);
	let isResizing = $state(false);
	let offsetX = 0;
	let offsetY = 0;
	let startX = 0;
	let startY = 0;
	let startWidth = 0;
	let startHeight = 0;

	// טעינת המצב מ-localStorage בכל פעם שהחלון נפתח
	$effect(() => {
		if (isVisible) {
			const savedState = floatingBoardState.load();
			position = { top: savedState.top, left: savedState.left };
			windowSize = { width: savedState.width, height: savedState.height };
		}
	});

	// סגירת החלון
	function close() {
		isVisible = false;
		isDragging = false;
		isResizing = false;
	}

	// עדכון תצוגת גודל
	function updateSize() {
		if (floatingWindow) {
			windowSize = {
				width: Math.round(floatingWindow.offsetWidth),
				height: Math.round(floatingWindow.offsetHeight)
			};
		}
	}

	// עדכון iframe כש-URL משתנה
	$effect(() => {
		if (iframe && url) {
			iframe.src = url;
		}
	});

	// עדכון גודל כשהחלון נפתח
	$effect(() => {
		if (isVisible) {
			updateSize();
		}
	});

	// גרירה - עכבר
	function startDrag(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;

		const rect = floatingWindow?.getBoundingClientRect();
		if (rect) {
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
		}
	}

	// גרירה - מגע
	function startDragTouch(e: TouchEvent) {
		e.preventDefault();
		const touch = e.touches[0];

		isDragging = true;

		const rect = floatingWindow?.getBoundingClientRect();
		if (rect) {
			offsetX = touch.clientX - rect.left;
			offsetY = touch.clientY - rect.top;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !floatingWindow) return;

		floatingWindow.style.left = e.clientX - offsetX + 'px';
		floatingWindow.style.top = e.clientY - offsetY + 'px';
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		e.preventDefault();
		const touch = e.touches[0];

		if (floatingWindow) {
			floatingWindow.style.left = touch.clientX - offsetX + 'px';
			floatingWindow.style.top = touch.clientY - offsetY + 'px';
		}
	}

	function stopDrag() {
		isDragging = false;

		// שמירת המיקום החדש
		if (floatingWindow) {
			const rect = floatingWindow.getBoundingClientRect();
			position = { top: rect.top, left: rect.left };
			floatingBoardState.save({
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height
			});
		}
	}

	// שינוי גודל - עכבר
	function startResize(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		isResizing = true;

		startX = e.clientX;
		startY = e.clientY;
		startWidth = floatingWindow?.offsetWidth || 800;
		startHeight = floatingWindow?.offsetHeight || 600;
	}

	// שינוי גודל - מגע
	function startResizeTouch(e: TouchEvent) {
		e.stopPropagation();
		e.preventDefault();
		const touch = e.touches[0];

		isResizing = true;

		startX = touch.clientX;
		startY = touch.clientY;
		startWidth = floatingWindow?.offsetWidth || 800;
		startHeight = floatingWindow?.offsetHeight || 600;
	}

	function handleMouseMoveResize(e: MouseEvent) {
		if (!isResizing || !floatingWindow) return;

		const deltaX = startX - e.clientX;
		const deltaY = e.clientY - startY;

		const newWidth = Math.max(400, startWidth + deltaX);
		const newHeight = Math.max(300, startHeight + deltaY);

		floatingWindow.style.width = newWidth + 'px';
		floatingWindow.style.height = newHeight + 'px';

		updateSize();
	}

	function handleTouchMoveResize(e: TouchEvent) {
		if (!isResizing || !floatingWindow) return;
		e.preventDefault();
		const touch = e.touches[0];

		const deltaX = startX - touch.clientX;
		const deltaY = touch.clientY - startY;

		const newWidth = Math.max(400, startWidth + deltaX);
		const newHeight = Math.max(300, startHeight + deltaY);

		floatingWindow.style.width = newWidth + 'px';
		floatingWindow.style.height = newHeight + 'px';

		updateSize();
	}

	function stopResize() {
		isResizing = false;

		// שמירת הגודל והמיקום החדשים
		if (floatingWindow) {
			const rect = floatingWindow.getBoundingClientRect();
			position = { top: rect.top, left: rect.left };
			windowSize = { width: rect.width, height: rect.height };
			floatingBoardState.save({
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height
			});
		}
	}

	// מניעת גרירה מכפתור סגירה
	function preventDrag(e: MouseEvent | TouchEvent) {
		e.stopPropagation();
	}
</script>

<!-- Event listeners גלובליים - הדרך הנכונה של Svelte -->
<svelte:document
	onmousemove={isDragging ? handleMouseMove : isResizing ? handleMouseMoveResize : undefined}
	onmouseup={isDragging || isResizing ? (isDragging ? stopDrag : stopResize) : undefined}
	ontouchmove={isDragging ? handleTouchMove : isResizing ? handleTouchMoveResize : undefined}
	ontouchend={isDragging || isResizing ? (isDragging ? stopDrag : stopResize) : undefined}
/>

<!-- החלון הצף -->
{#if isVisible}
	<div
		class="floating-window"
		bind:this={floatingWindow}
		style="top: {position.top}px; left: {position.left}px; width: {windowSize.width}px; height: {windowSize.height}px;"
	>
		<div
			class="window-header"
			bind:this={windowHeader}
			onmousedown={startDrag}
			ontouchstart={startDragTouch}
			role="button"
			tabindex="0"
		>
			<button
				class="close-btn"
				onclick={close}
				onmousedown={preventDrag}
				ontouchstart={preventDrag}
				title="סגור"
			>
				✕
			</button>
			<div class="window-title">{title}</div>
			<div class="drag-handle">
				<span class="drag-icon">⋮⋮</span>
			</div>
		</div>
		<div class="window-content">
			<iframe
				bind:this={iframe}
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
				loading="lazy"
				{title}
			></iframe>
			<div class="iframe-overlay" class:active={isDragging || isResizing} bind:this={overlay}></div>
			<div
				class="resize-handle"
				onmousedown={startResize}
				ontouchstart={startResizeTouch}
				role="button"
				tabindex="0"
			></div>
		</div>
	</div>
{/if}

<style>
	/* החלון הצף */
	.floating-window {
		position: fixed;
		background: white;
		border-radius: 6px;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			0 0 0 2px #667eea;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		resize: both;
		min-width: 400px;
		min-height: 300px;
		max-width: 95vw;
		max-height: 80vh;
		z-index: 9999;
	}

	/* כותרת */
	.window-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 6px 10px;
		user-select: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: bold;
		gap: 8px;
		cursor: grab;
	}

	.window-header:active {
		cursor: grabbing;
	}

	.drag-handle {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}

	.drag-icon {
		font-size: 14px;
	}

	.window-title {
		flex: 1;
		text-align: center;
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		pointer-events: none;
	}

	.close-btn {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		width: 24px;
		height: 24px;
		border-radius: 3px;
		cursor: pointer;
		font-size: 16px;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.3s;
		padding: 0;
		line-height: 1;
		flex-shrink: 0;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.close-btn:active {
		background: rgba(255, 255, 255, 0.4);
	}

	.window-content {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
		pointer-events: auto;
	}

	/* overlay שמופעל בזמן גרירה */
	.iframe-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: transparent;
		z-index: 1000;
		display: none;
		pointer-events: all;
	}

	.iframe-overlay.active {
		display: block;
	}

	.resize-handle {
		position: absolute;
		width: 16px;
		height: 16px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 3px 0 0 0;
		left: 0;
		bottom: 0;
		cursor: nwse-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 10px;
	}

	.resize-handle::after {
		content: '⇱';
		transform: scaleX(-1);
	}
</style>
