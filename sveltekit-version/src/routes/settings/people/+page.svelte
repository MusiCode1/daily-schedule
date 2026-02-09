<script lang="ts">
  import { peopleStore } from '$lib/stores/peopleStore.svelte';
  import PersonForm from '$lib/components/PersonForm.svelte';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import type { Person } from '$lib/types';
  import { TEXTS } from '$lib/services/language';

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
    if (confirm(TEXTS.DELETE_PERSON_CONFIRM)) {
      peopleStore.deletePerson(id);
    }
  }
</script>

<div class="header-row">
  <h2 class="page-header">{TEXTS.PEOPLE_MANAGEMENT}</h2>
  <button class="btn-primary btn-sm" onclick={() => openPersonModal()}>+ {TEXTS.NEW_PERSON}</button>
</div>

<div class="people-grid">
  {#each peopleStore.getAllPeople() as person (person.id)}
    <div class="card person-card">
      <div class="avatar avatar-md">
        {#if person.avatar}
          <ImageDisplay 
            imageSrc={person.avatar}
            alt={person.name}
            className="w-full h-full"
          />
        {:else}
          <span class="avatar-initial">{person.name[0]}</span>
        {/if}
      </div>
      <div class="w-full text-center">
        <h3 class="m-0 text-xl font-bold text-slate-900">{person.name}</h3>
      </div>
      <div class="mt-2 flex w-full justify-center gap-3">
        <button class="action-btn" title={TEXTS.EDIT} onclick={() => openPersonModal(person)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button class="action-btn action-btn-danger" title={TEXTS.DELETE} onclick={() => deletePerson(person.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    </div>
  {/each}
</div>

{#if peopleStore.getAllPeople().length === 0}
  <div class="empty-state">
    <p>{TEXTS.NO_PEOPLE_IN_DB}</p>
    <p class="subtitle">{TEXTS.CLICK_ADD_PERSON_TO_START}</p>
  </div>
{/if}

{#if isPersonModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (isPersonModalOpen = false)}>
    <div class="modal-card" role="dialog" aria-modal="true">
      <h3>{editingPerson ? TEXTS.EDIT_PERSON : TEXTS.NEW_PERSON}</h3>
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
  
  /* people-grid - רשת אנשים */
  .people-grid {
    @apply grid gap-6 w-full;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
