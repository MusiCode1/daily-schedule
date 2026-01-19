<script lang="ts">
  import { userStore } from '$lib/stores/userStore.svelte';
  import { listStore } from '$lib/stores/listStore.svelte';
  import type { List } from '$lib/types';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import ListEditModal from '$lib/components/ListEditModal.svelte';
  import { TEXTS } from '$lib/services/language';
  import { DEFAULT_LIST_IMAGE } from '$lib/config';

  // ניהול רשימות
  let managedUserId = $state('');
  let isListModalOpen = $state(false);
  let editingList: List | null = $state(null);
  
  // אתחול managedUserId כשהמשתמשים נטענים או שהקומפוננטה עולה
  $effect(() => {
      if (!managedUserId && userStore.users.length > 0) {
          managedUserId = userStore.users[0].id;
      }
  });

  function openAddList() {
      editingList = null;
      isListModalOpen = true;
  }
  
  function openListModal(list: List) {
      editingList = list;
      isListModalOpen = true;
  }
  
  function saveList(formData: { name: string; greeting: string; logo: string; title: string; description: string; peopleIds: string[] }) {
      if (!managedUserId) return;
      
      if (editingList) {
           listStore.updateList(managedUserId, editingList.id, {
               name: formData.name,
               greeting: formData.greeting,
               logo: formData.logo,
               title: formData.title,
               description: formData.description,
               peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
           });
      } else {
           const newListId = listStore.addList(managedUserId, formData.name);
           if (newListId) {
               listStore.updateList(managedUserId, newListId, {
                   greeting: formData.greeting,
                   logo: formData.logo,
                   title: formData.title,
                   description: formData.description,
                   peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
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
  
  function duplicateList(listId: string) {
      const newId = listStore.duplicateList(managedUserId, listId);
      if (newId) {
          // עבור לרשימה החדשה שנוצרה
          listStore.setActiveList(managedUserId, newId);
      }
  }
  
  function resetAllTasks(listId: string) {
      if (confirm(TEXTS.RESET_TASKS_CONFIRM)) {
          listStore.resetAllTasks(managedUserId, listId);
      }
  }
  
  function toggleListVisibility(listId: string) {
      listStore.toggleListVisibility(managedUserId, listId);
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
    {#each listStore.getAllLists(managedUserId) as list (list.id)}
        <div class="list-card {list.id === listStore.getActiveList(managedUserId)?.id ? 'active-list-card' : ''} {list.isHidden ? 'hidden-list' : ''}">
            <div class="list-icon-wrapper">
                <ImageDisplay 
                    imageSrc={list.logo || DEFAULT_LIST_IMAGE}
                    alt={list.name}
                />
            </div>
            <div class="list-info">
                <h3>
                    {list.name}
                    {#if list.isHidden}
                        <span class="hidden-badge">{TEXTS.HIDDEN_LIST}</span>
                    {/if}
                </h3>
                <div class="list-meta">
                    <span class="greeting-badge">"{list.greeting || ''}"</span>
                    <span class="tasks-count">{list.tasks.length} משימות</span>
                </div>
            </div>
            <div class="list-actions">
                <button class="action-btn visibility" title={list.isHidden ? TEXTS.SHOW_LIST : TEXTS.HIDE_LIST} onclick={() => toggleListVisibility(list.id)}>
                    {#if list.isHidden}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    {/if}
                </button>
                <button class="action-btn duplicate" title={TEXTS.DUPLICATE} onclick={() => duplicateList(list.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
                <button class="action-btn edit" title={TEXTS.EDIT} onclick={() => openListModal(list)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="action-btn delete" title={TEXTS.DELETE} onclick={() => deleteList(list.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        </div>
    {/each}
</div>

<ListEditModal
  isOpen={isListModalOpen}
  editingList={editingList}
  userId={managedUserId}
  onclose={() => isListModalOpen = false}
  onsave={saveList}
/>

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
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.25rem;
      width: 100%;
  }

  .list-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  .list-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.15);
  }
  
  .active-list-card {
      border-color: #818cf8;
      background: #f5f7ff;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.15);
  }
  
  .list-icon-wrapper {
      width: 64px;
      height: 64px;
      background: #f8fafc;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      border: 2px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
      overflow: hidden;
      flex-shrink: 0;
  }
  
  .list-icon-wrapper :global(.image-display) {
      width: 100%;
      height: 100%;
      border-radius: 0;
  }
  
  .list-info {
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
  }
  
  .list-info h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #1e293b;
      line-height: 1.3;
  }
  
  .list-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
  }
  
  .greeting-badge {
      color: #64748b;
      font-style: italic;
  }
  
  .tasks-count {
      color: #94a3b8;
      font-weight: 500;
  }
  
  .list-actions {
      width: 100%;
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
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
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
  }
  
  .action-btn:hover {
      background: white;
      color: #6366f1;
      border-color: #6366f1;
      transform: translateY(-1px);
  }
  
  .action-btn.delete:hover {
      color: #ef4444;
      border-color: #ef4444;
      background: #fef2f2;
  }
  
  .action-btn.duplicate:hover {
      color: #8b5cf6;
      border-color: #8b5cf6;
      background: #f5f3ff;
  }
  
  .action-btn.visibility:hover {
      color: #f59e0b;
      border-color: #f59e0b;
      background: #fffbeb;
  }
  
  .hidden-list {
      opacity: 0.6;
      border-style: dashed;
  }
  
  .hidden-badge {
      font-size: 0.75rem;
      color: #f59e0b;
      font-weight: 500;
      margin-right: 0.25rem;
  }

</style>
