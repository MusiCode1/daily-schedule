<script lang="ts">
  import { peopleStore } from '$lib/stores/peopleStore.svelte';
  import PersonForm from './PersonForm.svelte';
  import ImageDisplay from './ImageDisplay.svelte';
  import { Button } from '$lib/components/ui';
  import { TEXTS } from '$lib/services/language';

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

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h4 class="m-0 text-base font-semibold text-slate-600">{TEXTS.SELECT_PEOPLE_FOR_LIST}</h4>
    <Button variant="edit" size="xs" onclick={() => (showAddForm = !showAddForm)}>
      {showAddForm ? `✕ ${TEXTS.CANCEL}` : `+ ${TEXTS.NEW_PERSON}`}
    </Button>
  </div>

  {#if showAddForm}
    <div class="mb-2">
      <PersonForm
        compact={true}
        onsubmit={handleAddPerson}
        oncancel={() => (showAddForm = false)}
      />
    </div>
  {/if}

  <div class="flex max-h-[300px] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
    {#if peopleStore.getAllPeople().length === 0}
      <div class="px-4 py-8 text-center text-sm text-slate-400">
        {TEXTS.NO_PEOPLE_IN_DB}. {TEXTS.CLICK_ADD_PERSON_TO_START}
      </div>
    {:else}
      {#each peopleStore.getAllPeople() as person (person.id)}
        <label class="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            checked={selectedIds.includes(person.id)}
            onchange={() => togglePerson(person.id)}
          />
          <div class="flex flex-1 items-center gap-3">
            <div class="avatar avatar-sm">
              {#if person.avatar}
                <ImageDisplay 
                  imageSrc={person.avatar}
                  alt={person.name}
                  className="w-full h-full"
                />
              {:else}
                <span class="text-base font-bold text-slate-400">{person.name[0]}</span>
              {/if}
            </div>
            <span class="text-base font-medium text-slate-900">{person.name}</span>
          </div>
        </label>
      {/each}
    {/if}
  </div>
</div>
