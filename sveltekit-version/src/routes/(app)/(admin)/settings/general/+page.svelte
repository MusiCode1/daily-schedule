<script lang="ts">
  import { TEXTS } from '$lib/services/language';
  import { globalState } from '$lib/stores/globalState.svelte';
</script>

<h2>{TEXTS.GENERAL_SETTINGS}</h2>

<div class="settings-group">
  <div class="setting-row">
    <div class="setting-info">
      <label class="setting-label" for="task-click-cooldown">
        {TEXTS.TASK_CLICK_COOLDOWN_LABEL}
      </label>
      <p class="setting-desc">{TEXTS.TASK_CLICK_COOLDOWN_DESC}</p>
    </div>
    <label class="toggle-switch">
      <input
        id="task-click-cooldown"
        type="checkbox"
        bind:checked={globalState.state.settings.taskClickCooldownEnabled}
        onchange={() => globalState.save()}
      />
      <span class="slider"></span>
    </label>
  </div>
</div>

<div class="settings-group">
    <div class="placeholder-card">
        <h3>🔄 סנכרון אוטומטי פעיל</h3>
        <p>המערכת החדשה מסתנכרנת אוטומטית עם Google Drive ברקע.</p>
        <p class="info">הגדרות סנכרון מתקדמות יתווספו בעתיד.</p>
    </div>
</div>

<style>
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
    margin: 0 0 2rem 0;
  }

  .settings-group {
    margin-bottom: 2rem;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    max-width: 560px;
    direction: rtl;
  }

  .setting-info {
    flex: 1;
  }

  .setting-label {
    font-size: 1rem;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
  }

  .setting-desc {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  /* Toggle switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    inset: 0;
    background-color: #cbd5e1;
    border-radius: 26px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .slider::before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    right: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch input:checked + .slider {
    background-color: #6366f1;
  }

  .toggle-switch input:checked + .slider::before {
    transform: translateX(-22px);
  }

  .placeholder-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    max-width: 500px;
  }

  .placeholder-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #334155;
  }

  .placeholder-card p {
    margin: 0.5rem 0;
    color: #64748b;
    font-size: 0.95rem;
  }

  .info {
    font-size: 0.85rem;
    color: #94a3b8;
  }
</style>
