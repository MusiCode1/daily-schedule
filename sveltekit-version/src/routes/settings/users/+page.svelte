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
    <h2 class="page-header">{TEXTS.USER_MANAGEMENT}</h2>
    <button class="btn btn-sm" onclick={() => openUserModal()}>{TEXTS.NEW_USER}</button>
</div>

<div class="users-grid">
    {#each userStore.users as user (user.id)}
        <div class="card user-card">
            <div class="avatar avatar-md">
                {#if user.avatar}
                    <ImageDisplay 
                        imageSrc={user.avatar}
                        alt={user.name}
                    />
                {:else}
                    <span class="avatar-initial">{user.name[0]}</span>
                {/if}
            </div>
            <div class="user-details">
                <h3>{user.name}</h3>
                <span class="badge">{user.gender === 'boy' ? TEXTS.BOY : TEXTS.GIRL}</span>
            </div>
            <div class="user-actions">
                <button class="btn-icon" title={TEXTS.EDIT} onclick={() => openUserModal(user)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="btn-icon btn-icon-danger" title={TEXTS.DELETE} onclick={() => deleteUser(user.id)}>
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
        <div class="modal-content" role="dialog" aria-modal="true">
            <h3>{editingUser ? TEXTS.EDIT_USER : TEXTS.NEW_USER}</h3>
            <form onsubmit={(e) => { e.preventDefault(); saveUser(); }}>
                <div class="form-group">
                    <label for="user-name-input">{TEXTS.NAME}:</label>
                    <input id="user-name-input" type="text" class="input" bind:value={userForm.name} required />
                </div>
                <div class="form-group">
                    <label for="user-gender-select">{TEXTS.GENDER}:</label>
                    <select id="user-gender-select" class="input" bind:value={userForm.gender}>
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
                    <button type="button" class="btn btn-secondary" onclick={() => isUserModalOpen = false}>{TEXTS.CANCEL}</button>
                    <button type="submit" class="btn">{TEXTS.SAVE}</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style type="text/postcss">
  @reference "tailwindcss";
  
  /* user-card - override מקומי */
  .user-card {
    @apply max-w-[280px];
  }
  
  /* user-details - ייחודי */
  .user-details {
    @apply text-center w-full;
  }
  
  .user-details h3 {
    @apply text-xl font-bold text-slate-800 mb-2 m-0;
  }
  
  /* user-actions - ייחודי */
  .user-actions {
    @apply flex gap-3 mt-2 w-full justify-center;
  }
  
  /* Avatar Override - תמונת פרופיל (override ל-ImageDisplay) */
  .avatar :global(.image-display) { 
    @apply w-full h-full rounded-none;
  }

  /* Modal Override - רוחב מקסימלי */
  .modal-content {
    @apply max-w-[450px];
  }
  
  .modal-content h3 {
    @apply text-center text-2xl mb-8 text-slate-800;
  }
</style>
