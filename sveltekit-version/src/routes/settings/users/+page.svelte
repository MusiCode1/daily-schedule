<script lang="ts">
  import { userStore } from '$lib/stores/userStore.svelte';
  import type { UserProfile } from '$lib/types';
  import ImageUploader from '$lib/components/ImageUploader.svelte';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import { TEXTS } from '$lib/services/language';

  // ניהול משתמשים
  let isUserModalOpen = $state(false);
  let editingUser: UserProfile | null = $state(null);
  let userForm = $state<{ name: string; gender: 'boy'|'girl'; avatar: string }>({ name: '', gender: 'boy', avatar: '' });
  let userImageSrc: string | null = $state(null);

  function openUserModal(user: UserProfile | null = null) {
      editingUser = user;
      if (user) {
          userForm = { ...user, avatar: user.avatar || '' };
          userImageSrc = user.avatar || null;
      } else {
          userForm = { name: '', gender: 'boy', avatar: '' };
          userImageSrc = null;
      }
      isUserModalOpen = true;
  }

  function saveUser() {
      const avatarSrc = userImageSrc || '';
      if (editingUser) {
          userStore.updateUser(editingUser.id, {
              name: userForm.name,
              gender: userForm.gender,
              avatar: avatarSrc
          });
      } else {
          userStore.addUser({
              name: userForm.name,
              gender: userForm.gender,
              avatar: avatarSrc
          });
      }
      isUserModalOpen = false;
  }

  function deleteUser(id: string) {
      if (confirm('למחוק את המשתמש? פעולה זו תמחק גם את כל הרשימות שלו!')) {
          userStore.deleteUser(id);
      }
  }
</script>

<div class="header-row">
    <h2>{TEXTS.USER_MANAGEMENT}</h2>
    <button class="btn-primary-small" onclick={() => openUserModal()}>{TEXTS.NEW_USER}</button>
</div>

<div class="users-grid">
    {#each userStore.users as user (user.id)}
        <div class="user-card">
            <div class="avatar-wrapper">
                {#if user.avatar}
                    <ImageDisplay 
                        imageSrc={user.avatar}
                        alt={user.name}
                    />
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
                   <ImageUploader 
                       imageSrc={userImageSrc} 
                       onchange={(src) => userImageSrc = src} 
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

  /* כרטיסי משתמש */
  .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
      width: 100%;
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
  
  .avatar-wrapper :global(.image-display) { 
    width: 100%; 
    height: 100%; 
    border-radius: 0;
  }
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
</style>
