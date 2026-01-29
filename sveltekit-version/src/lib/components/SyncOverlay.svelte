<script lang="ts">
	import { syncState } from '../stores/syncStore';
    import { fade } from 'svelte/transition';

    // נגזרת פשוטה כדי לא לגשת ל-$syncState בקוד
    const { status, progress, message } = $derived($syncState);
</script>

{#if status !== 'idle'}
	<div class="overlay" transition:fade={{ duration: 200 }}>
		<div class="card">
            <!-- אנימציית ספינר -->
            <div class="spinner"></div>

			<h3 class="title">{message}</h3>
            
            {#if status === 'uploading' || status === 'downloading'}
                <div class="progress-track">
                    <div class="progress-bar" style="width: {progress}%"></div>
                </div>
                <div class="percentage">{progress}%</div>
            {/if}
            
            <!-- מניעת לחיצות רקע -->
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7); /* רקע כהה חוסם */
		backdrop-filter: blur(4px);
		z-index: 9999; /* מעל הכל */
		display: flex;
		align-items: center;
		justify-content: center;
        pointer-events: all; /* חוסם לחיצות */
	}

	.card {
		background: white;
		padding: 2rem;
		border-radius: 16px;
		width: 90%;
		max-width: 400px;
		text-align: center;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
	}

    .title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
        margin: 0;
    }

    .progress-track {
        width: 100%;
        height: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        background: #3b82f6; /* Blue 500 */
        transition: width 0.3s ease-out;
    }

    .percentage {
        font-size: 0.875rem;
        color: #666;
        font-variant-numeric: tabular-nums;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>
