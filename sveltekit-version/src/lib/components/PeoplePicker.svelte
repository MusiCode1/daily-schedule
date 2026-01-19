<script lang="ts">
  import { peopleStore } from '$lib/stores/peopleStore.svelte';
  import PersonForm from './PersonForm.svelte';
  import ImageDisplay from './ImageDisplay.svelte';

  // Props
  let {
    selectedIds = [],
    onchange
  }: {
    selectedIds: string[];
    onchange: (ids: string[]) => void;
  } = $props();

  // State
  let showAddForm = $state(false);

  function togglePerson(personId: string) {
    const currentIds = [...selectedIds];
    const index = currentIds.indexOf(personId);
    
    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(personId);
    }
    
    onchange(currentIds);
  }

  function handleAddPerson(data: { name: string; avatar: string }) {
    const newId = peopleStore.addPerson(data.name, data.avatar);
    // הוסף אוטומטית את האדם החדש לבחירה
    onchange([...selectedIds, newId]);
    showAddForm = false;
  }
</script>

<div class="people-picker">
  <div class="picker-header">
    <h4>בחר אנשים</h4>
    <button 
      type="button" 
      class="btn-add-inline" 
      onclick={() => (showAddForm = !showAddForm)}
    >
      {showAddForm ? '✕ ביטול' : '+ הוסף אדם חדש'}
    </button>
  </div>

  {#if showAddForm}
    <div class="inline-form-wrapper">
      <PersonForm
        compact={true}
        onsubmit={handleAddPerson}
        oncancel={() => (showAddForm = false)}
      />
    </div>
  {/if}

  <div class="people-list">
    {#if peopleStore.getAllPeople().length === 0}
      <div class="empty-message">
        אין אנשים במאגר. לחץ על "הוסף אדם חדש" כדי להתחיל.
      </div>
    {:else}
      {#each peopleStore.getAllPeople() as person (person.id)}
        <label class="person-checkbox-item">
          <input
            type="checkbox"
            checked={selectedIds.includes(person.id)}
            onchange={() => togglePerson(person.id)}
          />
          <div class="person-info">
            <div class="person-avatar">
              {#if person.avatar}
                <ImageDisplay 
                  imageSrc={person.avatar}
                  alt={person.name}
                />
              {:else}
                <span class="initial">{person.name[0]}</span>
              {/if}
            </div>
            <span class="person-name">{person.name}</span>
          </div>
        </label>
      {/each}
    {/if}
  </div>
</div>

<style>
  .people-picker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .picker-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #475569;
  }

  .btn-add-inline {
    padding: 0.5rem 1rem;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-inline:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  .inline-form-wrapper {
    margin-bottom: 0.5rem;
  }

  .people-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
    padding: 0.5rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .empty-message {
    text-align: center;
    color: #94a3b8;
    padding: 2rem 1rem;
    font-size: 0.95rem;
  }

  .person-checkbox-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .person-checkbox-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .person-checkbox-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #6366f1;
  }

  .person-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .person-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f1f5f9;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .person-avatar :global(.image-display) {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .initial {
    font-size: 1.2rem;
    color: #94a3b8;
    font-weight: 700;
  }

  .person-name {
    font-size: 1rem;
    color: #1e293b;
    font-weight: 500;
  }
</style>
