<script lang="ts">
  import { userStore } from '$lib/stores/userStore.svelte';
  import { listStore } from '$lib/stores/listStore.svelte';
  import type { List } from '$lib/types';
  import ImageUploader from '$lib/components/ImageUploader.svelte';
  import { dbImage } from '$lib/actions/dbImage';
  import { TEXTS } from '$lib/services/language';

  // ניהול רשימות
  let managedUserId = $state('');
  let isListModalOpen = $state(false);
  let editingList: List | null = $state(null);
  let listForm = $state({ name: '', greeting: '', logo: '' });
  
  // אתחול managedUserId כשהמשתמשים נטענים או שהקומפוננטה עולה
  $effect(() => {
      if (!managedUserId && userStore.users.length > 0) {
          managedUserId = userStore.users[0].id;
      }
  });

  function openAddList() {
      editingList = null;
      listForm = { name: '', greeting: 'בהצלחה', logo: '' };
      isListModalOpen = true;
  }
  
  function openListModal(list: List) {
      editingList = list;
      listForm = { name: list.name, greeting: list.greeting || '', logo: list.logo || '' };
      isListModalOpen = true;
  }
  
  function saveList() {
      if (!managedUserId) return;
      
      if (editingList) {
           listStore.updateList(managedUserId, editingList.id, {
               name: listForm.name,
               greeting: listForm.greeting,
               logo: listForm.logo
           });
      } else {
           const newListId = listStore.addList(managedUserId, listForm.name);
           if (newListId) {
               listStore.updateList(managedUserId, newListId, {
                   greeting: listForm.greeting,
                   logo: listForm.logo
               });
           }
      }
      isListModalOpen = false;
  }
  
  function deleteList(listId: string) {
      if (confirm('למחוק את הרשימה?')) {
           listStore.deleteList(managedUserId, listId);
      }
  }
</script>

<div class="header-row">
    <h2>{TEXTS.LIST_MANAGEMENT}</h2>
    <div class="user-select-control">
        <span>עבור:</span>
        <select bind:value={managedUserId}>
            {#each userStore.users as user}
                <option value={user.id}>{user.name}</option>
            {/each}
        </select>
    </div>
    <button class="btn-primary-small" onclick={openAddList}>{TEXTS.NEW_LIST}</button>
</div>

<div class="lists-grid">
    {#each listStore.getUserLists(managedUserId) as list (list.id)}
        <div class="list-card {list.id === listStore.getActiveList(managedUserId)?.id ? 'active-list-card' : ''}">
            <div class="list-icon-wrapper">
                 {#if list.logo}
                     <img use:dbImage={list.logo} alt={list.name} onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'}/>
                 {:else}
                     <span>📋</span>
                 {/if}
            </div>
            <div class="list-details">
                <h3>{list.name}</h3>
                <span class="greeting-text">"{list.greeting || ''}"</span>
            </div>
            <div class="list-actions">
                <button class="action-btn edit" title={TEXTS.EDIT} onclick={() => openListModal(list)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="action-btn delete" title={TEXTS.DELETE} onclick={() => deleteList(list.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        </div>
    {/each}
</div>

{#if isListModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (isListModalOpen = false)}>
         <div class="modal-card" role="dialog" aria-modal="true">
            <h3>{editingList ? TEXTS.EDIT_LIST : TEXTS.NEW_LIST}</h3>
            <form onsubmit={(e) => { e.preventDefault(); saveList(); }}>
                <div class="form-group">
                    <label for="list-name-input">{TEXTS.LIST_NAME}:</label>
                    <input id="list-name-input" type="text" bind:value={listForm.name} required />
                </div>
                <div class="form-group">
                    <label for="list-greeting-input">{TEXTS.GREETING}:</label>
                    <input id="list-greeting-input" type="text" bind:value={listForm.greeting} placeholder={TEXTS.GREETING_PLACEHOLDER} />
                </div>
                
                <div class="form-group">
                    <label for="list-logo-input">{TEXTS.LOGO}:</label>
                    <ImageUploader
                        imageSrc={listForm.logo}
                        onchange={(id) => listForm.logo = id || ''}
                    />
                </div>
                
                <div class="modal-actions">
                     <button type="button" onclick={() => isListModalOpen = false}>{TEXTS.CANCEL}</button>
                     <button type="submit" class="btn-primary">{TEXTS.SAVE}</button>
                </div>
            </form>
         </div>
    </div>
{/if}

<style>
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
    margin: 0;
  }

  .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 1.5rem;
      flex-wrap: wrap; 
      gap: 1rem;       
  }

  .btn-primary-small {
      background: #6366f1;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }
  
  .btn-primary-small:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
  }

  /* רשת רשימות */
  .lists-grid {
      display: grid; 
      /* שימוש באותה רשת כמו משתמשים */
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
      width: 100%;
  }

  .list-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }
  
  .list-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .active-list-card {
      border-color: #818cf8;
      background: #eef2ff;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1);
  }
  
  .list-icon-wrapper {
      width: 56px; height: 56px;
      background: white;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  .list-details h3 {
      font-size: 1.15rem; font-weight: 600; margin-bottom: 0.25rem;
  }
  
  .list-actions {
      margin-right: auto;
      display: flex; gap: 0.5rem;
  }
  
  .user-select-control {
      background: #f8fafc;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
  }
  
  .user-select-control select {
      background: transparent;
      border: none;
      font-weight: 600;
      color: #334155;
      font-size: 1rem;
      padding-right: 0.5rem;
      cursor: pointer;
  }
  .user-select-control select:focus { outline: none; }
  
  .action-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
  }
  
  .action-btn:hover {
      background: #f8fafc;
      color: #6366f1;
      border-color: #6366f1;
  }
  
  .action-btn.delete:hover {
      color: #ef4444;
      border-color: #ef4444;
      background: #fef2f2;
  }

  /* מודאל */
  .modal-card {
      background: white;
      padding: 2.5rem;
      border-radius: 24px;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #f1f5f9;
      position: relative;
      z-index: 1001;
  }
  
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
  
  .form-group input:focus {
      outline: none;
      background: white;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .modal-actions {
      display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;
  }
  
  .modal-actions button {
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 1rem;
  }
  .modal-actions button[type="button"] { background: #f1f5f9; color: #64748b; }
  .modal-actions button[type="button"]:hover { background: #e2e8f0; color: #475569; }
  .modal-actions button[type="submit"] {
      background: #6366f1; color: white;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }
  .modal-actions button[type="submit"]:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
  }
</style>
