<script lang="ts">
  import { TEXTS } from '$lib/services/language';
</script>

<h2>{TEXTS.GENERAL_SETTINGS}</h2>

<div class="settings-group">
    <div class="placeholder-card">
        <h3>{TEXTS.GENERAL_SYNC_ACTIVE_TITLE}</h3>
        <p>{TEXTS.GENERAL_SYNC_ACTIVE_DESCRIPTION}</p>
        <p class="info">{TEXTS.GENERAL_SYNC_ACTIVE_INFO}</p>
    </div>
</div>

<style>
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
    margin: 0 0 2rem 0;
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
