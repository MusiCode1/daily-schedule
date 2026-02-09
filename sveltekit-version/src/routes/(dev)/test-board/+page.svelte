<script lang="ts">
	import FloatingIframe from '$lib/components/FloatingIframe.svelte';
	import { TEXTS } from '$lib/services/language';

	// הגדרות לוחות תקשורת
	const boards = [
		{
			name: TEXTS.TEST_BOARD_BOARD_MOTI,
			url: 'https://app.cboard.io/board/68f62f8754db13001d95d45a',
			icon: '👤'
		},
		{
			name: TEXTS.TEST_BOARD_BOARD_MOISHI,
			url: 'https://app.cboard.io/board/68667c28ed972b001cd90cc2',
			icon: '👤'
		},
		{
			name: TEXTS.TEST_BOARD_BOARD_AVISHAI_FEELINGS,
			url: 'https://app.cboard.io/board/694d24e629a4a1001dc42b18',
			icon: '😊'
		}
	];

	// מצב החלון הצף
	let isVisible = $state(false);
	let currentUrl = $state('');
	let currentTitle = $state('');

	// פתיחת לוח
	function openBoard(board: (typeof boards)[0]) {
		currentUrl = board.url;
		currentTitle = board.name;
		isVisible = true;
	}
</script>

<div class="page-container">
	<div class="header">
		<h1>{TEXTS.TEST_BOARD_TITLE}</h1>
		<p class="info">{TEXTS.TEST_BOARD_INFO}</p>
	</div>

	<!-- כפתורי בחירת לוחות -->
	<div class="board-buttons">
		{#each boards as board (board.url)}
			<button class="board-btn" onclick={() => openBoard(board)}>
				<span class="icon">{board.icon}</span>
				<span class="name">{board.name}</span>
			</button>
		{/each}
	</div>

	<div class="instructions">
		<h3>{TEXTS.TEST_BOARD_INSTRUCTIONS_TITLE}</h3>
		<ul>
			<li>🖱️ <strong>{TEXTS.TEST_BOARD_INSTRUCTION_MOVE_LABEL}</strong> {TEXTS.TEST_BOARD_INSTRUCTION_MOVE_DESC}</li>
			<li>📏 <strong>{TEXTS.TEST_BOARD_INSTRUCTION_RESIZE_LABEL}</strong> {TEXTS.TEST_BOARD_INSTRUCTION_RESIZE_DESC}</li>
			<li>❌ <strong>{TEXTS.TEST_BOARD_INSTRUCTION_CLOSE_LABEL}</strong> {TEXTS.TEST_BOARD_INSTRUCTION_CLOSE_DESC}</li>
			<li>📱 <strong>{TEXTS.TEST_BOARD_INSTRUCTION_TOUCH_LABEL}</strong> {TEXTS.TEST_BOARD_INSTRUCTION_TOUCH_DESC}</li>
		</ul>
	</div>

	<!-- תוכן דוגמה -->
	<div class="demo-content">
		<h2>{TEXTS.TEST_BOARD_DEMO_TITLE}</h2>
		<p>{TEXTS.TEST_BOARD_DEMO_P1}</p>
		<p>{TEXTS.TEST_BOARD_DEMO_P2}</p>
		<div class="placeholder-box">
			<p>{TEXTS.TEST_BOARD_DEMO_PLACEHOLDER}</p>
		</div>
	</div>
</div>

<!-- קומפוננטת החלון הצף -->
<FloatingIframe bind:isVisible bind:url={currentUrl} title={currentTitle} />

<style>
	.page-container {
		min-height: 100vh;
		padding: 20px;
		background-color: #f5f5f5;
	}

	.header {
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-bottom: 20px;
	}

	h1 {
		color: #333;
		margin: 0 0 10px 0;
		font-size: 24px;
	}

	.info {
		background: #e3f2fd;
		padding: 15px;
		border-radius: 4px;
		margin-top: 15px;
		border-right: 4px solid #2196f3;
		font-size: 14px;
	}

	.board-buttons {
		display: flex;
		gap: 15px;
		margin: 20px 0;
		flex-wrap: wrap;
	}

	.board-btn {
		flex: 1;
		min-width: 200px;
		padding: 20px 25px;
		font-size: 18px;
		font-weight: bold;
		cursor: pointer;
		border: 3px solid #667eea;
		border-radius: 8px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		transition: all 0.3s;
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.board-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
	}

	.board-btn:active {
		transform: translateY(0);
	}

	.icon {
		font-size: 32px;
	}

	.name {
		font-size: 16px;
	}

	.instructions {
		background: #fff3e0;
		padding: 15px 20px;
		border-radius: 8px;
		margin: 20px 0;
		border-right: 4px solid #ff9800;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.instructions h3 {
		margin: 0 0 12px 0;
		color: #e65100;
	}

	.instructions ul {
		margin: 0;
		padding-right: 20px;
	}

	.instructions li {
		margin-bottom: 8px;
		line-height: 1.6;
	}

	.demo-content {
		background: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-top: 20px;
	}

	.demo-content h2 {
		color: #667eea;
		margin-bottom: 15px;
	}

	.demo-content p {
		line-height: 1.8;
		color: #555;
		margin-bottom: 10px;
	}

	.placeholder-box {
		background: #f0f4ff;
		border: 2px dashed #667eea;
		border-radius: 8px;
		padding: 40px;
		margin-top: 20px;
		text-align: center;
	}

	.placeholder-box p {
		color: #667eea;
		font-size: 16px;
		margin: 0;
	}
</style>
