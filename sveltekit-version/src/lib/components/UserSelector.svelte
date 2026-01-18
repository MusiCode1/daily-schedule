<script lang="ts">
	import { userStore } from '../stores/userStore.svelte';
	import type { UserProfile } from '../types';
	import ImageDisplay from './ImageDisplay.svelte';
	import { TEXTS } from '$lib/services/language';

	import favicon from '$lib/assets/logo.svg';

	let { users }: { users: UserProfile[] } = $props();

	function handleLogin(userId: string) {
		userStore.login(userId);
	}
</script>

<div class="user-selector-container">
	<header class="app-header">
		<div class="brand-bubble">
			<div class="title-stack">
				<span>סדר יום</span>
				<span class="highlight">ויזואלי</span>
			</div>
			<img src={favicon} alt="צוהר הלב" class="app-logo" />
		</div>
	</header>
	
	<h2 class="prompt">{TEXTS.USER_SELECTOR_TITLE}</h2>
	
	<div class="users-grid">
		{#each users as user}
			<button 
				class="user-card" 
				style="--theme-color: {user.themeColor}"
				onclick={() => handleLogin(user.id)}
				aria-label={TEXTS.LOGIN_AS(user.name)}
			>
				<div class="avatar-wrapper">
					<div class="initials" aria-hidden="true">{user.name[0]}</div>
					{#if user.avatar}
						<div class="avatar-image">
							<ImageDisplay 
								imageSrc={user.avatar}
								alt={user.name}
							/>
						</div>
					{/if}
				</div>
				<span class="user-name">{user.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.user-selector-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 100vh;
		padding: 3rem 1rem;
		text-align: center;
		width: 100%;
		max-width: 1600px;
		margin: 0 auto;
	}

	.app-header {
		margin-bottom: 4rem;
	}

	.brand-bubble {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 2.5rem 1rem 1.5rem;
		border-radius: 25px;
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.5);
	}

	.app-logo {
		width: 72px;
		height: 72px;
		filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
	}

	.title-stack {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1;
	}

	.title-stack span {
		font-size: 2rem;
		font-weight: 800;
		color: #1e293b;
		letter-spacing: -0.02em;
	}
	
	.title-stack span.highlight {
		color: #334155;
		font-weight: 900;
		font-size: 2.2rem;
	}


	.prompt {
		font-size: 2rem;
		margin-bottom: 2rem;
		color: #64748b;
		font-weight: normal;
	}

	.users-grid {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		justify-content: center;
		width: 100%;
	}

	.user-card {
		background: white;
		border: none;
		border-radius: 1.5rem;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		min-width: 150px;
	}

	.user-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 10px 20px rgba(0,0,0,0.15);
	}

	.user-card:active {
		transform: scale(0.98);
	}

	.avatar-wrapper {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background-color: var(--theme-color);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 4px solid white;
		box-shadow: 0 0 0 4px var(--theme-color);
		position: relative;
	}

	.avatar-image {
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.avatar-image :global(.image-display) {
		width: 100%;
		height: 100%;
		border-radius: 0; /* הסרת border-radius מהתמונה עצמה */
	}

	.initials {
		font-size: 3.5rem;
		color: white;
		font-weight: bold;
		position: absolute;
		z-index: 1;
	}

	.user-name {
		font-size: 1.5rem;
		font-weight: bold;
		color: #333;
	}
</style>
