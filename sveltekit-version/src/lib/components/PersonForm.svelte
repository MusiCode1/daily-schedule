<script lang="ts">
  import ImageUploader from './ImageUploader.svelte';
  import type { Person } from '$lib/types';
  import { TEXTS } from '$lib/services/language';

  // Props
  let {
    person = undefined,
    onsubmit,
    oncancel = undefined,
    compact = false
  }: {
    person?: Person | null;
    onsubmit: (data: { name: string; avatar: string }) => void;
    oncancel?: () => void;
    compact?: boolean;
  } = $props();

  // State - שימוש ב-derived כדי לעקוב אחרי שינויים ב-person
  let name = $state('');
  let avatar = $state('');

  // אתחול ועדכון ערכים כאשר person משתנה
  $effect(() => {
    if (person) {
      name = person.name;
      avatar = person.avatar;
    } else {
      name = '';
      avatar = '';
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (name.trim()) {
      onsubmit({ name: name.trim(), avatar });
    }
  }

  function handleCancel() {
    if (oncancel) {
      oncancel();
    }
  }
</script>

<form
  class={compact
    ? 'flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4'
    : 'flex flex-col gap-5'}
  onsubmit={handleSubmit}
>
  <div class="form-group">
    <label for="person-name">{TEXTS.NAME}:</label>
    <input id="person-name" type="text" class="input" bind:value={name} placeholder={TEXTS.PERSON_NAME} required />
  </div>

  <div class="form-group">
    <label for="person-avatar">{TEXTS.AVATAR}:</label>
    <ImageUploader
      imageSrc={avatar || null}
      onchange={(src) => (avatar = src || '')}
      alt={name || TEXTS.PERSON_AVATAR_ALT}
    />
  </div>

  <div class="modal-actions">
    {#if oncancel}
      <button type="button" class="btn btn-secondary" onclick={handleCancel}>{TEXTS.CANCEL}</button>
    {/if}
    <button type="submit" class="btn">{person ? TEXTS.UPDATE_ACTION : TEXTS.ADD_ACTION}</button>
  </div>
</form>
