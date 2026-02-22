<script lang="ts">
  import { untrack } from 'svelte';
  import ImageUploader from './ImageUploader.svelte';
  import type { Person } from '$lib/types';
  import { Button, TextInput } from '$lib/components/ui';
  import { TEXTS } from '$lib/data/texts';

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

  // State - טופס מקומי; אנחנו מצלמים ערכי התחלה מ-"person" בעת יצירת הקומפוננטה.
  // הרכיב בדרך כלל נוצר/נהרס יחד עם המודאל, ולכן זה מספיק (בלי סנכרון דו-כיווני מול ה-prop).
  let name = $state(untrack(() => person?.name ?? ''));
  let avatar = $state(untrack(() => person?.avatar ?? ''));

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
    <TextInput id="person-name" bind:value={name} placeholder={TEXTS.PERSON_NAME} required />
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
      <Button type="button" variant="secondary" onclick={handleCancel}>{TEXTS.CANCEL}</Button>
    {/if}
    <Button type="submit">{person ? TEXTS.UPDATE_ACTION : TEXTS.ADD_ACTION}</Button>
  </div>
</form>
