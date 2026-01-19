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
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-content">
        <h3>{editingList ? TEXTS.EDIT_LIST : TEXTS.NEW_LIST}</h3>
        <form onsubmit={handleSubmit}>
          <div class="form-group">
            <label for="list-name-input">{TEXTS.LIST_NAME}:</label>
            <input id="list-name-input" type="text" bind:value={listForm.name} required />
          </div>
          
          <div class="form-group">
            <label for="list-greeting-input">{TEXTS.GREETING}:</label>
            <input id="list-greeting-input" type="text" bind:value={listForm.greeting} placeholder={TEXTS.GREETING_PLACEHOLDER} />
          </div>
          
          <div class="form-group">
            <label for="list-title-input">{TEXTS.LIST_TITLE}:</label>
            <input id="list-title-input" type="text" bind:value={listForm.title} placeholder={TEXTS.LIST_TITLE_PLACEHOLDER} />
          </div>
          
          <div class="form-group">
            <label for="list-description-input">{TEXTS.LIST_DESCRIPTION}:</label>
            <textarea id="list-description-input" bind:value={listForm.description} placeholder={TEXTS.LIST_DESCRIPTION_PLACEHOLDER} rows="3"></textarea>
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
            <button type="button" onclick={onclose}>{TEXTS.CANCEL}</button>
            <button type="submit" class="btn-primary">{TEXTS.SAVE}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
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

  .modal-card {
    background: white;
    border-radius: 24px;
    width: 100%;
    max-width: 450px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid #f1f5f9;
    position: relative;
    z-index: 1001;
  }

  .modal-content {
    padding: 2.5rem;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-card h3 {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #1e293b;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #475569;
    font-size: 0.95rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: #f8fafc;
    transition: all 0.2s;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    background: white;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .form-group textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: #f8fafc;
    transition: all 0.2s;
    font-family: inherit;
    resize: vertical;
  }

  .modal-actions {
    display: flex; 
    gap: 1rem; 
    justify-content: flex-end; 
    margin-top: 1.5rem;
  }
  
  .modal-actions button {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .modal-actions button[type="button"] { 
    background: #f1f5f9; 
    color: #64748b; 
  }
  
  .modal-actions button[type="button"]:hover { 
    background: #e2e8f0; 
    color: #475569; 
  }
  
  .modal-actions button[type="submit"] {
    background: #6366f1; 
    color: white;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }
  
  .modal-actions button[type="submit"]:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
  }
</style>
