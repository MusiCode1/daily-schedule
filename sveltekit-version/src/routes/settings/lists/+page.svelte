<script lang="ts">
  import { userStore } from '$lib/stores/userStore.svelte';
  import { listStore } from '$lib/stores/listStore.svelte';
  import type { List } from '$lib/types';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import ListEditModal from '$lib/components/ListEditModal.svelte';
  import UserPickerModal from '$lib/components/UserPickerModal.svelte';
  import { TEXTS } from '$lib/services/language';
  import { DEFAULT_LIST_IMAGE } from '$lib/config';

  // ניהול רשימות
  let managedUserId = $state('');
  let isListModalOpen = $state(false);
  let editingList: List | null = $state(null);
  
  // העברה/שכפול בין משתמשים
  let isUserPickerOpen = $state(false);
  let listToTransfer: string | null = $state(null);
  
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
  
  function openUserPicker(listId: string) {
      listToTransfer = listId;
      isUserPickerOpen = true;
  }
  
  function handleUserSelected(targetUserId: string, shouldMove: boolean) {
      if (!listToTransfer) return;
      
      const newListId = listStore.copyListToUser(
          managedUserId,
          targetUserId,
          listToTransfer,
          shouldMove
      );
      
      if (newListId) {
          console.log(`List ${shouldMove ? 'moved' : 'copied'} successfully to user ${targetUserId}`);
      }
      
      listToTransfer = null;
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
    <button class="btn-primary" onclick={openAddList}>{TEXTS.NEW_LIST}</button>
</div>

<div class="lists-grid">
    {#each listStore.getAllLists(managedUserId) as list (list.id)}
        <div class="card list-card {list.id === listStore.getActiveList(managedUserId)?.id ? 'list-card-active' : ''} {list.isHidden ? 'list-card-hidden' : ''}">
            <div class="list-icon">
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
                <button class="action-btn transfer" title={TEXTS.COPY_TO_USER} onclick={() => openUserPicker(list.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="m21 3-7 7"/><path d="m3 3 7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="m21 21-7-7"/><path d="m3 21 7-7"/></svg>
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

<UserPickerModal
  isOpen={isUserPickerOpen}
  currentUserId={managedUserId}
  onclose={() => isUserPickerOpen = false}
  onselect={handleUserSelected}
/>

<style type="text/postcss">
  @reference "tailwindcss";
  
  /* list-card - override מקומי */
  .list-card {
    @apply border-2 p-5 gap-3 max-w-[250px] relative;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  .list-card:hover {
    border-color: #cbd5e1;
    transform: translateY(-2px);
    box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.15);
  }
  
  /* list-card פעיל */
  .list-card-active {
    @apply bg-indigo-50;
    border-color: #818cf8;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.15);
  }
  
  /* list-card מוסתר */
  .list-card-hidden {
    @apply opacity-60;
    border-style: dashed;
  }
  
  /* list-info - מידע על הרשימה */
  .list-info {
    @apply w-full text-center flex flex-col gap-2;
  }
  
  .list-info h3 {
    @apply text-lg font-bold m-0 text-slate-800 leading-tight;
  }
  
  /* list-meta - מטא-דאטה */
  .list-meta {
    @apply flex flex-col gap-1 text-xs;
  }
  
  .greeting-badge {
    @apply text-slate-600 italic text-xs;
  }
  
  .tasks-count {
    @apply text-slate-400 font-medium text-xs;
  }
  
  .hidden-badge {
    @apply text-xs text-amber-500 font-medium mr-1;
  }
  
  /* list-actions - כפתורי פעולה */
  .list-actions {
    @apply w-full flex gap-2 justify-center pt-2 border-t border-slate-100;
  }
  
  /* lists-grid - רשת רשימות */
  .lists-grid {
    @apply grid gap-5 w-full;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  
  /* שאר הסגנונות */
  h2 {
    @apply text-2xl font-bold text-slate-700 m-0;
  }

  .header-row {
    @apply flex justify-between items-center mb-8 border-b border-slate-100 pb-6 flex-wrap gap-4;
  }

  .user-select-control {
    @apply bg-slate-50 px-4 py-2 rounded-xl border border-slate-200;
  }
  
  .user-select-control select {
    @apply bg-transparent border-none font-semibold text-slate-700 text-base pr-2 cursor-pointer;
  }
  
  .user-select-control select:focus { 
    @apply outline-none;
  }
</style>
