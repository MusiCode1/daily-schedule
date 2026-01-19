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
    <div class="person-card">
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

  /* כרטיסי אנשים */
  .people-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
    width: 100%;
  }

  .person-card {
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
  
  .person-card:hover {
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
  
  .initial { 
    font-size: 2.5rem; 
    color: #94a3b8; 
    font-weight: 800; 
  }

  .person-details h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #1e293b;
    text-align: center;
  }

  .person-actions {
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

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
  }

  .empty-state p {
    font-size: 1.1rem;
    margin: 0.5rem 0;
  }

  .empty-state .subtitle {
    font-size: 0.95rem;
    color: #94a3b8;
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
</style>
