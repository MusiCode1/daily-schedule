<script lang="ts">
  import type { List } from '$lib/types';
  import ImageUploader from './ImageUploader.svelte';
  import PeoplePicker from './PeoplePicker.svelte';
  import { TEXTS } from '$lib/services/language';
  import { Button, ModalShell, Textarea, TextInput } from '$lib/components/ui';

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
        listForm = { name: '', greeting: TEXTS.DEFAULT_GREETING, logo: '', title: '', description: '' };
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

<ModalShell open={isOpen} onClose={onclose} contentClass="list-edit-modal-content">
  <h3 class="list-edit-modal-title">{editingList ? TEXTS.EDIT_LIST : TEXTS.NEW_LIST}</h3>
  <form onsubmit={handleSubmit}>
    <div class="form-group">
      <label for="list-name-input">{TEXTS.LIST_NAME}:</label>
      <TextInput id="list-name-input" bind:value={listForm.name} required />
    </div>
    
    <div class="form-group">
      <label for="list-greeting-input">{TEXTS.GREETING}:</label>
      <TextInput id="list-greeting-input" bind:value={listForm.greeting} placeholder={TEXTS.GREETING_PLACEHOLDER} />
    </div>
    
    <div class="form-group">
      <label for="list-title-input">{TEXTS.LIST_TITLE}:</label>
      <TextInput id="list-title-input" bind:value={listForm.title} placeholder={TEXTS.LIST_TITLE_PLACEHOLDER} />
    </div>
    
    <div class="form-group">
      <label for="list-description-input">{TEXTS.LIST_DESCRIPTION}:</label>
      <Textarea id="list-description-input" bind:value={listForm.description} placeholder={TEXTS.LIST_DESCRIPTION_PLACEHOLDER} rows={3} />
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
      <Button type="button" variant="secondary" onclick={onclose}>{TEXTS.CANCEL}</Button>
      <Button type="submit">{TEXTS.SAVE}</Button>
    </div>
  </form>
</ModalShell>

<style>
  :global(.list-edit-modal-content) {
      max-width: 450px;
      max-height: 90vh;
      overflow-y: auto;
      text-align: right;
  }

  .list-edit-modal-title {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #1e293b;
    font-weight: 700;
  }
  
  form {
    display: flex;
    flex-direction: column;
  }
</style>
