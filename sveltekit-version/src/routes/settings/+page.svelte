<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore.svelte';
  import { listStore } from '$lib/stores/listStore.svelte';
  
  // Tabs
  const TABS = [
    { id: 'users', label: TEXTS.USERS_TAB, icon: '👥' },
    { id: 'lists', label: TEXTS.LISTS_TAB, icon: '📋' },
    { id: 'general', label: TEXTS.GENERAL_TAB, icon: '⚙️' }
  ];

  import type { UserProfile, List } from '$lib/types'; // added List
  import ImageUploader from '$lib/components/ImageUploader.svelte';
  import { dbImage } from '$lib/actions/dbImage';
  import { TEXTS } from '$lib/services/language';

  let activeTab = $state('users');
  
  // User Management
  let isUserModalOpen = $state(false);
  let editingUser: UserProfile | null = $state(null);
  let userForm = $state({ name: '', gender: 'boy' as 'boy'|'girl', avatar: '' });

  // List Management
  let managedUserId = $state('');
  let isListModalOpen = $state(false);
  let editingList: List | null = $state(null);
  let listForm = $state({ name: '', greeting: '', logo: '' });
  
  // Initialize managedUserId when users load or component mounts
  $effect(() => {
      if (!managedUserId && userStore.users.length > 0) {
          managedUserId = userStore.users[0].id;
      }
  });

  function handleBack() {
    goto('/');
  }

  // --- Users ---
  function openUserModal(user: UserProfile | null = null) {
      editingUser = user;
      if (user) {
          userForm = { ...user, avatar: user.avatar || '' };
      } else {
          userForm = { name: '', gender: 'boy', avatar: '' };
      }
      isUserModalOpen = true;
  }
  // ... (saveUser, deleteUser stay samish, just context) ...
  function saveUser() {
      // ... same as before ...
      if (editingUser) {
          userStore.updateUser(editingUser.id, {
              name: userForm.name,
              gender: userForm.gender,
              avatar: userForm.avatar
          });
      } else {
          userStore.addUser({
              name: userForm.name,
              gender: userForm.gender,
              avatar: userForm.avatar
          });
      }
      isUserModalOpen = false;
  }

  function deleteUser(id: string) {
      if (confirm('למחוק את המשתמש? פעולה זו תמחק גם את כל הרשימות שלו!')) {
          userStore.deleteUser(id);
          // If we deleted the managed user, reset selection
          if (managedUserId === id && userStore.users.length > 0) {
              managedUserId = userStore.users[0].id; // will be updated by effect potentially but safe to do here
          }
      }
  }

  // --- Lists ---
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

<div class="settings-page">
  <header>
    <button class="back-btn" onclick={handleBack}>{TEXTS.BACK_TO_BOARD}</button>
    <h1>{TEXTS.SETTINGS_TITLE}</h1>
  </header>

  <div class="tabs-container">
    {#each TABS as tab}
      <button 
        class="tab-btn" 
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        {tab.label}
      </button>
    {/each}
  </div>

  <main class="content-area">
    {#if activeTab === 'users'}
      <div in:fade class="tab-content">
        <div class="header-row">
            <h2>{TEXTS.USER_MANAGEMENT}</h2>
            <button class="btn-primary-small" onclick={() => openUserModal()}>{TEXTS.NEW_USER}</button>
        </div>

        <div class="users-grid">
            {#each userStore.users as user (user.id)}
                <div class="user-card">
                    <div class="avatar-wrapper">
                        {#if user.avatar}
                            <img use:dbImage={user.avatar} alt={user.name} onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
                        {:else}
                            <span class="initial">{user.name[0]}</span>
                        {/if}
                    </div>
                    <div class="user-details">
                        <h3>{user.name}</h3>
                        <span class="gender-tag">{user.gender === 'boy' ? TEXTS.BOY : TEXTS.GIRL}</span>
                    </div>
                    <div class="user-actions">
                        <button class="action-btn edit" title={TEXTS.EDIT} onclick={() => openUserModal(user)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button class="action-btn delete" title={TEXTS.DELETE} onclick={() => deleteUser(user.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
        
      </div>
    {:else if activeTab === 'lists'}
      <div in:fade class="tab-content">
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
        
      </div>
    {:else if activeTab === 'general'}
      <div in:fade class="tab-content">
        <h2>{TEXTS.GENERAL_SETTINGS}</h2>
        <p>בקרוב יתווספו כאן הגדרות נוספות למערכת (כגון שליטה על סאונד, גיבוי נתונים, ועוד).</p>
      </div>
    {/if}

    {#if isUserModalOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (isUserModalOpen = false)}>
            <div class="modal-card" role="dialog" aria-modal="true">
                <h3>{editingUser ? TEXTS.EDIT_USER : TEXTS.NEW_USER}</h3>
                <form onsubmit={(e) => { e.preventDefault(); saveUser(); }}>
                    <div class="form-group">
                        <label for="user-name-input">{TEXTS.NAME}:</label>
                        <input id="user-name-input" type="text" bind:value={userForm.name} required />
                    </div>
                    <div class="form-group">
                        <label for="user-gender-select">{TEXTS.GENDER}:</label>
                        <select id="user-gender-select" bind:value={userForm.gender}>
                            <option value="boy">{TEXTS.BOY}</option>
                            <option value="girl">{TEXTS.GIRL}</option>
                        </select>
                    </div>
                    <div class="form-group">
                       <label for="user-avatar-input">{TEXTS.AVATAR}:</label>
                       <!-- Clear input if manual avatar is set? For now just binding -->
                       <ImageUploader 
                           imageSrc={userForm.avatar} 
                           onchange={(id) => userForm.avatar = id || ''} 
                       />
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick={() => isUserModalOpen = false}>{TEXTS.CANCEL}</button>
                        <button type="submit" class="btn-primary">{TEXTS.SAVE}</button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

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
  </main>
</div>


<style>
  /* CSS reused from original file */
  .settings-page {
    width: 98%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: auto;
    background: #f8fafc;
    direction: rtl;
    font-family: 'Rubik', sans-serif;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    color: #1e293b;
    margin: 0;
    font-weight: 800;
  }

  .back-btn {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .back-btn:hover {
    background: #f8fafc;
    color: #334155;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .tabs-container {
    display: flex;
    gap: 1.5rem;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 2.5rem;
    padding-bottom: 2px;
  }

  .tab-btn {
    padding: 1rem 0.5rem;
    background: none;
    border: none;
    font-size: 1.1rem;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tab-btn::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 100%;
      height: 3px;
      background: #6366f1;
      transform: scaleX(0);
      transition: transform 0.3s ease;
      border-radius: 2px;
  }

  .tab-btn:hover { color: #6366f1; }
  
  .tab-btn.active {
    color: #6366f1;
    font-weight: 700;
  }
  
  .tab-btn.active::after {
      transform: scaleX(1);
  }

  .content-area {
    background: white;
    padding: 2.5rem;
    border-radius: 24px;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
    min-height: 500px;
    border: 1px solid #f1f5f9;
    width: 100%;
  }

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
      flex-wrap: wrap; /* Added to prevent overlap */
      gap: 1rem;       /* Added to give spacing when wrapped */
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

  /* User Cards */
  .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
      width: 100%; /* Added to ensure full width usage */
  }

  .user-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }
  
  .user-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-color: #cbd5e1;
  }

  .avatar-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #f1f5f9;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; }
  .initial { font-size: 2.5rem; color: #94a3b8; font-weight: 800; }

  .user-details h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #1e293b;
  }
  
  .gender-tag {
      font-size: 0.85rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 500;
  }

  .user-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
      width: 100%;
      justify-content: center;
  }
  
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

  /* Modal */
  .modal-card {
      background: white;
      padding: 2.5rem;
      border-radius: 24px;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #f1f5f9;
      position: relative; /* Ensure z-index works if needed */
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

  .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #475569;
      font-size: 0.95rem;
  }
  
  .form-group input, .form-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      background: #f8fafc;
      transition: all 0.2s;
  }
  
  .form-group input:focus, .form-group select:focus {
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

  /* Lists Grid */
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
</style>
