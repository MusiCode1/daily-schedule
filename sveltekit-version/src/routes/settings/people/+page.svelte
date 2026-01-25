<script lang="ts">
  import { peopleStore } from '$lib/stores/peopleStore.svelte';
  import PersonForm from '$lib/components/PersonForm.svelte';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import type { Person } from '$lib/types';

  // ניהול אנשים
  let isPersonModalOpen = $state(false);
  let editingPerson: Person | null = $state(null);

  function openPersonModal(person: Person | null = null) {
    editingPerson = person;
    isPersonModalOpen = true;
  }

  function handlePersonSubmit(data: { name: string; avatar: string }) {
    if (editingPerson) {
      peopleStore.updatePerson(editingPerson.id, data);
    } else {
      peopleStore.addPerson(data.name, data.avatar);
    }
    isPersonModalOpen = false;
  }

  function deletePerson(id: string) {
    if (confirm('למחוק את האדם? הוא יוסר מכל הרשימות שבהן הוא מופיע.')) {
      peopleStore.deletePerson(id);
    }
  }
</script>

<div class="header-row">
  <h2>ניהול אנשים</h2>
  <button class="btn-primary-small" onclick={() => openPersonModal()}>+ הוסף אדם חדש</button>
</div>

<div class="people-grid">
  {#each peopleStore.getAllPeople() as person (person.id)}
    <div class="card person-card">
      <div class="avatar-wrapper">
        {#if person.avatar}
          <ImageDisplay 
            imageSrc={person.avatar}
            alt={person.name}
          />
        {:else}
          <span class="initial">{person.name[0]}</span>
        {/if}
      </div>
      <div class="person-details">
        <h3>{person.name}</h3>
      </div>
      <div class="person-actions">
        <button class="action-btn edit" title="עריכה" onclick={() => openPersonModal(person)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button class="action-btn delete" title="מחיקה" onclick={() => deletePerson(person.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    </div>
  {/each}
</div>

{#if peopleStore.getAllPeople().length === 0}
  <div class="empty-state">
    <p>אין אנשים במאגר</p>
    <p class="subtitle">לחץ על "הוסף אדם חדש" כדי להתחיל</p>
  </div>
{/if}

{#if isPersonModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (isPersonModalOpen = false)}>
    <div class="modal-card" role="dialog" aria-modal="true">
      <h3>{editingPerson ? 'עריכת אדם' : 'הוסף אדם חדש'}</h3>
      <PersonForm
        person={editingPerson}
        onsubmit={handlePersonSubmit}
        oncancel={() => (isPersonModalOpen = false)}
      />
    </div>
  </div>
{/if}

<style type="text/postcss">
  @reference "tailwindcss";
  
  /* person-card - override מקומי */
  .person-card {
    @apply max-w-[280px];
  }
  
  /* avatar-wrapper - תמונת פרופיל */
  .avatar-wrapper {
    @apply w-20 h-20 rounded-full bg-slate-100 overflow-hidden
           flex items-center justify-center
           border-3 border-white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .avatar-wrapper :global(.image-display) { 
    @apply w-full h-full rounded-none;
  }
  
  .initial { 
    @apply text-4xl text-slate-400 font-extrabold;
  }

  /* person-details - פרטי האדם */
  .person-details {
    @apply text-center w-full;
  }
  
  .person-details h3 {
    @apply text-xl font-bold text-slate-900 m-0;
  }

  /* person-actions - כפתורי פעולה */
  .person-actions {
    @apply flex gap-3 mt-2 w-full justify-center;
  }
  
  /* people-grid - רשת אנשים */
  .people-grid {
    @apply grid gap-6 w-full;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  
  /* שאר הסגנונות */
  h2 {
    @apply text-2xl font-bold text-slate-700 m-0;
  }

  .header-row {
    @apply flex justify-between items-center mb-8 
           border-b border-slate-100 pb-6 flex-wrap gap-4;
  }

  .btn-primary-small {
    @apply font-semibold;
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }
  
  .btn-primary-small:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
  }

  .empty-state {
    @apply text-center py-12 px-4 text-slate-500;
  }

  .empty-state p {
    @apply text-lg my-2;
  }

  .empty-state .subtitle {
    @apply text-base text-slate-400;
  }

  /* מודאל */
  .modal-card {
    @apply bg-white p-10 rounded-3xl w-full max-w-[450px] relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid #f1f5f9;
    z-index: 1001;
  }
  
  .modal-overlay {
    @apply fixed inset-0 bg-black/50 flex justify-center items-center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .modal-card h3 {
    @apply text-center text-2xl mb-8 text-slate-800;
  }
</style>
