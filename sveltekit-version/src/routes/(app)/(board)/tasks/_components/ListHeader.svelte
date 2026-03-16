<script lang="ts">
  import { tick } from 'svelte';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import ImageUploader from '$lib/components/ImageUploader.svelte';
  import { TEXTS } from '$lib/services/language';

  let { name, logo = '', title = '', description = '', isEditMode = false, onRename, onUpdateTitle, onUpdateDescription, onUpdateLogo }: {
    name: string;
    logo?: string;
    title?: string;
    description?: string;
    isEditMode?: boolean;
    onRename?: (newName: string) => void;
    onUpdateTitle?: (title: string | undefined) => void;
    onUpdateDescription?: (description: string | undefined) => void;
    onUpdateLogo?: (logo: string) => void;
  } = $props();

  // -- עריכת שם --
  let isEditing = $state(false);
  let editingName = $state('');
  let nameInputEl = $state<HTMLInputElement | null>(null);

  // -- עריכת כותרת --
  let isEditingTitle = $state(false);
  let editingTitle = $state('');
  let titleInputEl = $state<HTMLInputElement | null>(null);

  // -- עריכת תיאור --
  let isEditingDesc = $state(false);
  let editingDesc = $state('');
  let descTextareaEl = $state<HTMLTextAreaElement | null>(null);

  // איפוס כל מצבי העריכה כשהרשימה משתנה
  $effect(() => {
    name; // תלות מפורשת — כשהרשימה משתנה, סגור את כל העריכות
    isEditing = false;
    isEditingTitle = false;
    isEditingDesc = false;
  });

  // -- שם --
  async function startEditing() {
    if (!isEditMode) return;
    editingName = name;
    isEditing = true;
    await tick();
    nameInputEl?.focus();
    nameInputEl?.select();
  }

  function commitEdit() {
    if (!isEditing) return;
    isEditing = false;
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed);
    }
  }

  function handleNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      isEditing = false;
    }
  }

  // -- כותרת --
  async function startEditingTitle() {
    if (!isEditMode) return;
    editingTitle = title ?? '';
    isEditingTitle = true;
    await tick();
    titleInputEl?.focus();
    titleInputEl?.select();
  }

  function commitTitle() {
    if (!isEditingTitle) return;
    isEditingTitle = false;
    const trimmed = editingTitle.trim();
    onUpdateTitle?.(trimmed || undefined);
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      isEditingTitle = false;
    }
  }

  // -- תיאור --
  async function startEditingDesc() {
    if (!isEditMode) return;
    editingDesc = description ?? '';
    isEditingDesc = true;
    await tick();
    descTextareaEl?.focus();
    descTextareaEl?.select();
  }

  function commitDesc() {
    if (!isEditingDesc) return;
    isEditingDesc = false;
    const trimmed = editingDesc.trim();
    onUpdateDescription?.(trimmed || undefined);
  }

  function handleDescKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isEditingDesc = false;
    }
  }
</script>

<div class="list-header">
  {#if isEditMode}
    <div class="logo-large logo-edit-mode">
      <ImageUploader
        imageSrc={logo || null}
        alt={name}
        onchange={(src) => onUpdateLogo?.(src ?? '')}
      />
    </div>
  {:else if logo}
    <div class="logo-large">
      <ImageDisplay imageSrc={logo} alt={name} />
    </div>
  {/if}

  <div class="header-content">
    {#if isEditing}
      <input
        bind:this={nameInputEl}
        class="name-edit-input"
        value={editingName}
        oninput={(e) => { editingName = e.currentTarget.value; }}
        onblur={commitEdit}
        onkeydown={handleNameKeydown}
      />
    {:else if isEditMode}
      <button class="list-name list-name-btn" onclick={startEditing}>{name}</button>
    {:else}
      <h2 class="list-name">{name}</h2>
    {/if}

    {#if isEditMode}
      {#if isEditingTitle}
        <input
          bind:this={titleInputEl}
          class="title-edit-input"
          value={editingTitle}
          oninput={(e) => { editingTitle = e.currentTarget.value; }}
          onblur={commitTitle}
          onkeydown={handleTitleKeydown}
          placeholder={TEXTS.LIST_TITLE_PLACEHOLDER}
        />
      {:else if title}
        <button class="header-title title-btn" onclick={startEditingTitle}>{title}</button>
      {:else}
        <button class="add-field-hint" onclick={startEditingTitle}>{TEXTS.LIST_TITLE_ADD_HINT}</button>
      {/if}

      {#if isEditingDesc}
        <textarea
          bind:this={descTextareaEl}
          class="desc-edit-textarea"
          value={editingDesc}
          oninput={(e) => { editingDesc = e.currentTarget.value; }}
          onblur={commitDesc}
          onkeydown={handleDescKeydown}
          placeholder={TEXTS.LIST_DESCRIPTION_PLACEHOLDER}
        ></textarea>
      {:else if description}
        <button class="header-description desc-btn" onclick={startEditingDesc}>{description}</button>
      {:else}
        <button class="add-field-hint" onclick={startEditingDesc}>{TEXTS.LIST_DESC_ADD_HINT}</button>
      {/if}
    {:else}
      {#if title}
        <p class="header-title">{title}</p>
      {/if}
      {#if description}
        <p class="header-description">{description}</p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .list-header {
    width: 100%;
    max-width: 600px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
    border-radius: 20px;
    border: 2px solid #e2e8f0;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .logo-large {
    width: 200px;
    height: 200px;
    flex-shrink: 0;
    border-radius: 16px;
    overflow: hidden;
    background: white;
    border: 3px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .logo-large :global(.image-display) {
    width: 100%;
    height: 100%;
  }

  .logo-edit-mode {
    height: auto;
    overflow: visible;
    background: none;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  .logo-edit-mode :global(.image-uploader) {
    width: 200px;
  }

  .logo-edit-mode :global(.preview-wrapper) {
    width: 200px;
    height: 200px;
    position: relative;
    border-radius: 16px;
    overflow: visible;
    background: white;
    border: 3px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .logo-edit-mode :global(.action-buttons) {
    flex-wrap: nowrap;
  }

  .logo-edit-mode :global(.preview-wrapper .image-display) {
    width: 100%;
    height: 100%;
    border-radius: 13px;
  }

  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  /* -- שם רשימה -- */
  .list-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
    line-height: 1.3;
  }

  .list-name-btn {
    background: none;
    border: none;
    padding: 0;
    text-align: right;
    cursor: pointer;
    transition: color 0.15s;
  }

  .list-name-btn:hover {
    color: var(--primary-accent, #6366f1);
    text-decoration: underline dotted;
  }

  .name-edit-input {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1e293b;
    border: none;
    border-bottom: 2px solid var(--primary-accent, #6366f1);
    background: transparent;
    outline: none;
    width: 100%;
    line-height: 1.3;
    padding: 0 0 2px 0;
    margin: 0;
    font-family: inherit;
    direction: rtl;
  }

  /* -- כותרת -- */
  .header-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: #1e293b;
    margin: 0;
    line-height: 1.3;
    background: linear-gradient(to left, var(--primary-accent, #6366f1), var(--secondary-accent, #8b5cf6));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .title-btn {
    border: none;
    padding: 0;
    text-align: right;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .title-btn:hover {
    opacity: 0.75;
    text-decoration: underline dotted;
    text-decoration-color: var(--primary-accent, #6366f1);
  }

  .title-edit-input {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--primary-accent, #6366f1);
    border: none;
    border-bottom: 2px solid var(--primary-accent, #6366f1);
    background: transparent;
    outline: none;
    width: 100%;
    line-height: 1.3;
    padding: 0 0 2px 0;
    margin: 0;
    font-family: inherit;
    direction: rtl;
  }

  /* -- תיאור -- */
  .header-description {
    font-size: 1.1rem;
    color: #475569;
    line-height: 1.5;
    margin: 0;
  }

  .desc-btn {
    background: none;
    border: none;
    padding: 0;
    text-align: right;
    cursor: pointer;
    transition: color 0.15s;
  }

  .desc-btn:hover {
    color: var(--primary-accent, #6366f1);
    text-decoration: underline dotted;
  }

  .desc-edit-textarea {
    font-size: 1.1rem;
    color: #475569;
    border: none;
    border-bottom: 2px solid var(--primary-accent, #6366f1);
    background: transparent;
    outline: none;
    width: 100%;
    line-height: 1.5;
    padding: 0 0 2px 0;
    margin: 0;
    font-family: inherit;
    direction: rtl;
    resize: none;
    min-height: 3em;
  }

  /* -- כפתורי "הוסף" (שדה ריק) -- */
  .add-field-hint {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 0.9rem;
    color: #94a3b8;
    text-align: right;
    font-family: inherit;
    transition: color 0.15s;
  }

  .add-field-hint:hover {
    color: var(--primary-accent, #6366f1);
  }

  /* Responsive */
  @media (max-width: 600px) {
    .list-header {
      flex-direction: column;
      text-align: center;
    }

    .logo-large {
      width: 150px;
      height: 150px;
    }

    .list-name {
      font-size: 1.25rem;
    }

    .name-edit-input,
    .list-name-btn {
      font-size: 1.25rem;
    }

    .header-title {
      font-size: 1.5rem;
    }

    .title-edit-input,
    .title-btn {
      font-size: 1.5rem;
    }

    .header-description {
      font-size: 1rem;
    }
  }
</style>
