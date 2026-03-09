<script lang="ts">
	import { KIOSK_TEXTS } from './texts';
	import { ctrl } from './kioskController.svelte';

	let { onConnect }: { onConnect: () => void } = $props();
</script>

<div class="login-screen">
	<div class="login-card">
		<h1>🖥️ {KIOSK_TEXTS.PAGE_TITLE}</h1>
		<p class="subtitle">{KIOSK_TEXTS.LOGIN_SUBTITLE}</p>

		<div class="connection-form">
			<div class="field">
				<label for="address">{KIOSK_TEXTS.ADDRESS_LABEL}</label>
				<input
					id="address"
					type="text"
					bind:value={ctrl.baseUrl}
					placeholder={KIOSK_TEXTS.ADDRESS_PLACEHOLDER}
					dir="ltr"
				/>
			</div>
			<div class="field">
				<label for="password">{KIOSK_TEXTS.PASSWORD_LABEL}</label>
				<input
					id="password"
					type="password"
					bind:value={ctrl.password}
				/>
			</div>
			<button
				class="btn primary full-width"
				onclick={onConnect}
				disabled={ctrl.isConnecting || !ctrl.baseUrl}
			>
				{ctrl.isConnecting ? KIOSK_TEXTS.CONNECTING : KIOSK_TEXTS.CONNECT_BTN}
			</button>
		</div>

		{#if ctrl.feedback}
			<div class="feedback" class:success={ctrl.feedback.type === 'success'} class:error={ctrl.feedback.type === 'error'}>
				{ctrl.feedback.message}
			</div>
		{/if}
	</div>
</div>

<style>
	.login-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
		direction: rtl;
		padding: 1.5rem;
	}

	.login-card {
		width: 100%;
		max-width: 420px;
		background: white;
		border-radius: 20px;
		padding: 2.5rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		font-size: 1.6rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
		text-align: center;
	}

	.subtitle {
		text-align: center;
		color: #64748b;
		font-size: 0.95rem;
		margin: 0;
	}

	.connection-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #475569;
	}

	input[type='text'],
	input[type='password'] {
		padding: 0.6rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
		background: #f8fafc;
	}

	input:focus {
		border-color: #6366f1;
		background: white;
	}

	.btn {
		padding: 0.6rem 1.1rem;
		border-radius: 10px;
		border: none;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.primary {
		background: #6366f1;
		color: white;
	}

	.btn.primary:not(:disabled):hover {
		background: #4f46e5;
		transform: translateY(-1px);
	}

	.btn.full-width {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
	}

	.feedback {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		font-weight: 600;
		font-size: 0.9rem;
		text-align: center;
	}

	.feedback.success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.feedback.error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
</style>
