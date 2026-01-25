<script lang="ts">
  import type { List } from '$lib/types';
  import ImageUploader from './ImageUploader.svelte';
  import PeoplePicker from './PeoplePicker.svelte';
  import { TEXTS } from '$lib/services/language';

  // Props
  let { 
    isOpen = false, 
    editingList = null as List | null, 
    userId = '', 
    onclose = () => {}, 
    onsave = (data: any) => {} 
  }: {
    isOpen: boolean;
    editingList: List | null;
    userId: string;
    onclose: () => void;
    onsave: (data: { name: string; greeting: string; logo: string; title: string; description: string; peopleIds: string[] }) => void;
  } = $props();

  // State פנימי לטופס
  let listForm = $state<{ name: string; greeting: string; logo: string; title: string; description: string }>({ 
    name: '', 
    greeting: '', 
    logo: '', 
    title: '', 
    description: '' 
  });
  let listImageSrc: string | null = $state(null);
  let selectedPeopleIds = $state<string[]>([]);

  // אתחול הטופס כשנפתח המודאל או כשמשנים את editingList
  $effect(() => {
    if (isOpen) {
      if (editingList) {
        listForm = {
          name: editingList.name,
          greeting: editingList.greeting || '',
          logo: editingList.logo || '',
          title: editingList.title || '',
          description: editingList.description || ''
        };
        listImageSrc = editingList.logo || null;
        selectedPeopleIds = editingList.peopleIds ? [...editingList.peopleIds] : [];
      } else {
        listForm = { name: '', greeting: 'בהצלחה', logo: '', title: '', description: '' };
        listImageSrc = null;
        selectedPeopleIds = [];
      }
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    const logoSrc = listImageSrc || '';
    
    onsave({
      name: listForm.name,
      greeting: listForm.greeting,
      logo: logoSrc,
      title: listForm.title,
      description: listForm.description,
      peopleIds: selectedPeopleIds
    });
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && onclose()}>
    <div class="modal-content" role="dialog" aria-modal="true">
        <h3>{editingList ? TEXTS.EDIT_LIST : TEXTS.NEW_LIST}</h3>
        <form onsubmit={handleSubmit}>
          <div class="form-group">
            <label for="list-name-input">{TEXTS.LIST_NAME}:</label>
            <input id="list-name-input" type="text" class="input" bind:value={listForm.name} required />
          </div>
          
          <div class="form-group">
            <label for="list-greeting-input">{TEXTS.GREETING}:</label>
            <input id="list-greeting-input" type="text" class="input" bind:value={listForm.greeting} placeholder={TEXTS.GREETING_PLACEHOLDER} />
          </div>
          
          <div class="form-group">
            <label for="list-title-input">{TEXTS.LIST_TITLE}:</label>
            <input id="list-title-input" type="text" class="input" bind:value={listForm.title} placeholder={TEXTS.LIST_TITLE_PLACEHOLDER} />
          </div>
          
          <div class="form-group">
            <label for="list-description-input">{TEXTS.LIST_DESCRIPTION}:</label>
            <textarea id="list-description-input" class="input" bind:value={listForm.description} placeholder={TEXTS.LIST_DESCRIPTION_PLACEHOLDER} rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label for="list-logo-input">{TEXTS.LOGO}:</label>
            <ImageUploader
              imageSrc={listImageSrc}
              onchange={(src) => listImageSrc = src}
            />
          </div>
          
          <div class="form-group">
            <PeoplePicker
              selectedIds={selectedPeopleIds}
              onchange={(ids) => (selectedPeopleIds = ids)}
            />
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick={onclose}>{TEXTS.CANCEL}</button>
            <button type="submit" class="btn">{TEXTS.SAVE}</button>
          </div>
        </form>
    </div>
  </div>
{/if}

<style>
  /* Using global classes from components.css where possible */
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  /* Specific overrides for ListEditModal specific size needs */
  .modal-content {
      width: 100%;
      max-width: 450px;
      padding: 2.5rem;
      max-height: 90vh;
      overflow-y: auto;
      text-align: right; /* Override default centered text in modals */
  }

  h3 {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #1e293b;
    font-weight: 700;
  }
  
  /* Keeping only specific form logic */
  form {
    display: flex;
    flex-direction: column;
  }
</style>
