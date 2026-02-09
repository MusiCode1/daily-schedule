<script lang="ts">
  import GoogleDriveBackup from '$lib/components/GoogleDriveBackup.svelte';
  import { TEXTS } from '$lib/services/language';
</script>

<h2>{TEXTS.GENERAL_SETTINGS}</h2>

<div class="settings-group">
    <GoogleDriveBackup />
</div>

<style>
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
    margin: 0 0 2rem 0;
  }
</style>
