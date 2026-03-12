<script lang="ts">
  import { globalState } from '$lib/stores/globalState.svelte';
  import { TEXTS } from '$lib/services/language';
  import type { WebsiteShortcut } from '$lib/types';

  // מצב המודאל
  let isModalOpen = $state(false);
  let editingShortcut: WebsiteShortcut | null = $state(null);

  // שדות הטופס
  let formLabel = $state('');
  let formUrl = $state('');
  let formEmoji = $state('');
  let formError = $state('');

  // קיצורי הדרך מה-store
  let shortcuts = $derived(globalState.state.settings.websiteShortcuts ?? []);

  function openAddModal() {
    editingShortcut = null;
    formLabel = '';
    formUrl = '';
    formEmoji = '';
    formError = '';
    isModalOpen = true;
  }

  function openEditModal(shortcut: WebsiteShortcut) {
    editingShortcut = shortcut;
    formLabel = shortcut.label;
    formUrl = shortcut.url;
    formEmoji = shortcut.emoji ?? '';
    formError = '';
    isModalOpen = true;
  }

  function closeModal() {
    isModalOpen = false;
    editingShortcut = null;
    formError = '';
  }

  function validateUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  function saveShortcut() {
    formError = '';

    if (!formLabel.trim()) {
      formError = 'יש להזין שם לאתר';
      return;
    }

    const cleanUrl = formUrl.trim();
    if (!validateUrl(cleanUrl)) {
      formError = TEXTS.WEBSITES_INVALID_URL;
      return;
    }

    const currentShortcuts = [...(globalState.state.settings.websiteShortcuts ?? [])];

    if (editingShortcut) {
      // עדכון קיצור קיים
      const index = currentShortcuts.findIndex(s => s.id === editingShortcut!.id);
      if (index !== -1) {
        currentShortcuts[index] = {
          ...editingShortcut,
          label: formLabel.trim(),
          url: cleanUrl,
          emoji: formEmoji.trim() || undefined
        };
      }
    } else {
      // הוספת קיצור חדש
      currentShortcuts.push({
        id: crypto.randomUUID(),
        label: formLabel.trim(),
        url: cleanUrl,
        emoji: formEmoji.trim() || undefined
      });
    }

    globalState.state.settings.websiteShortcuts = currentShortcuts;
    globalState.save();
    closeModal();
  }

  function deleteShortcut(id: string) {
    if (!confirm(TEXTS.WEBSITES_DELETE_CONFIRM)) return;

    globalState.state.settings.websiteShortcuts =
      (globalState.state.settings.websiteShortcuts ?? []).filter(s => s.id !== id);
    globalState.save();
  }

  function navigateTo(url: string) {
    window.location.href = url;
  }
</script>

<h2>{TEXTS.WEBSITES_TITLE}</h2>

<div class="page-header">
  <button class="add-btn" onclick={openAddModal}>{TEXTS.WEBSITES_ADD}</button>
</div>

{#if shortcuts.length === 0}
  <p class="empty-state">{TEXTS.WEBSITES_NO_SHORTCUTS}</p>
{:else}
  <div class="shortcuts-grid">
    {#each shortcuts as shortcut (shortcut.id)}
      <div class="shortcut-card">
        <button class="navigate-btn" onclick={() => navigateTo(shortcut.url)}>
          <span class="emoji">{shortcut.emoji ?? '🌐'}</span>
          <span class="label">{shortcut.label}</span>
          <span class="url-preview">{shortcut.url}</span>
          <span class="open-label">{TEXTS.WEBSITES_OPEN} ↗</span>
        </button>
        <div class="card-actions">
          <button class="action-btn edit-btn" onclick={() => openEditModal(shortcut)} title={TEXTS.EDIT}>✏️</button>
          <button class="action-btn delete-btn" onclick={() => deleteShortcut(shortcut.id)} title={TEXTS.DELETE}>🗑️</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if isModalOpen}
  <!-- שכבת רקע -->
  <div class="modal-overlay" onclick={closeModal} role="presentation"></div>

  <!-- מודאל -->
  <div class="modal" role="dialog" aria-modal="true">
    <h3>{editingShortcut ? TEXTS.WEBSITES_EDIT : TEXTS.WEBSITES_ADD}</h3>

    <div class="form-group">
      <label for="shortcut-label">{TEXTS.WEBSITES_LABEL}</label>
      <input
        id="shortcut-label"
        type="text"
        bind:value={formLabel}
        placeholder="למשל: ג'ינג'ים"
      />
    </div>

    <div class="form-group">
      <label for="shortcut-url">{TEXTS.WEBSITES_URL}</label>
      <input
        id="shortcut-url"
        type="url"
        bind:value={formUrl}
        placeholder="https://..."
        dir="ltr"
      />
    </div>

    <div class="form-group">
      <label for="shortcut-emoji">{TEXTS.WEBSITES_EMOJI}</label>
      <input
        id="shortcut-emoji"
        type="text"
        bind:value={formEmoji}
        placeholder={TEXTS.WEBSITES_EMOJI_PLACEHOLDER}
        maxlength="2"
        class="emoji-input"
      />
    </div>

    {#if formError}
      <p class="error-msg">{formError}</p>
    {/if}

    <div class="modal-actions">
      <button class="save-btn" onclick={saveShortcut}>{TEXTS.SAVE}</button>
      <button class="cancel-btn" onclick={closeModal}>{TEXTS.CANCEL}</button>
    </div>
  </div>
{/if}

<style>
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
    margin: 0 0 1.5rem 0;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .add-btn {
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-family: 'Rubik', sans-serif;
  }

  .add-btn:hover {
    background: #4f46e5;
  }

  .empty-state {
    color: #94a3b8;
    font-size: 1rem;
    text-align: center;
    padding: 3rem 0;
  }

  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .shortcut-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    transition: box-shadow 0.2s;
    display: flex;
    flex-direction: column;
  }

  .shortcut-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .navigate-btn {
    background: none;
    border: none;
    padding: 1.5rem;
    cursor: pointer;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    transition: background 0.15s;
  }

  .navigate-btn:hover {
    background: #eef2ff;
  }

  .emoji {
    font-size: 2.5rem;
    line-height: 1;
  }

  .label {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
  }

  .url-preview {
    font-size: 0.8rem;
    color: #94a3b8;
    direction: ltr;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .open-label {
    font-size: 0.85rem;
    color: #6366f1;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid #e2e8f0;
    background: white;
  }

  .action-btn {
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.15s;
  }

  .action-btn:hover {
    background: #f1f5f9;
  }

  .delete-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }

  /* מודאל */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
    background: white;
    border-radius: 20px;
    padding: 2rem;
    width: min(480px, 90vw);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    direction: rtl;
  }

  .modal h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.4rem;
  }

  .form-group input {
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    font-size: 1rem;
    font-family: 'Rubik', sans-serif;
    color: #1e293b;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    border-color: #6366f1;
  }

  .emoji-input {
    max-width: 80px;
    text-align: center;
    font-size: 1.5rem !important;
  }

  .error-msg {
    color: #ef4444;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .save-btn {
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.65rem 1.5rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Rubik', sans-serif;
    transition: background 0.2s;
  }

  .save-btn:hover {
    background: #4f46e5;
  }

  .cancel-btn {
    background: #f1f5f9;
    color: #475569;
    border: none;
    padding: 0.65rem 1.5rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Rubik', sans-serif;
    transition: background 0.2s;
  }

  .cancel-btn:hover {
    background: #e2e8f0;
  }
</style>
