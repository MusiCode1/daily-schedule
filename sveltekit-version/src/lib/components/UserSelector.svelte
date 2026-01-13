<script lang="ts">
	import { userStore } from '../stores/userStore.svelte';
	import type { UserProfile } from '../types';
	import { dbImage } from '$lib/actions/dbImage';
	import { TEXTS } from '$lib/services/language';

	let { users }: { users: UserProfile[] } = $props();

	function handleLogin(userId: string) {
		userStore.login(userId);
	}
</script>

<div class="user-selector-container">
	<h1 class="title">{TEXTS.USER_SELECTOR_TITLE}</h1>
	
	<div class="users-grid">
		{#each users as user}
			<button 
				class="user-card" 
				style="--theme-color: {user.themeColor}"
				onclick={() => handleLogin(user.id)}
				aria-label={TEXTS.LOGIN_AS(user.name)}
			>
				<div class="avatar-wrapper">
						<img 
							use:dbImage={user.avatar} 
							alt={user.name} 
							onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'} 
						/>
					<div class="initials" aria-hidden="true">{user.name[0]}</div>
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

	.title {
		font-size: 2.5rem;
		margin-bottom: 3rem;
		color: #333;
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

	.avatar-wrapper img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 2;
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
