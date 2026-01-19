<script lang="ts">
  import { peopleStore } from '$lib/stores/peopleStore.svelte';
  import ImageDisplay from './ImageDisplay.svelte';

  // Props
  let {
    peopleIds,
    isVisible = true,
    ontoggle
  }: {
    peopleIds: string[];
    isVisible?: boolean;
    ontoggle: () => void;
  } = $props();

  // קבלת האנשים מהמאגר
  let people = $derived(
    peopleIds.map(id => peopleStore.getPerson(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
  );
</script>

<div class="people-display">
  <div class="header-row">
    <h3 class="title">מי יהיה איתנו היום?</h3>
    <button class="toggle-btn" onclick={ontoggle} title={isVisible ? 'הסתר' : 'הצג'}>
      {#if isVisible}
        👁️
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>
      {/if}
    </button>
  </div>

  {#if isVisible}
    <div class="people-grid">
      {#each people as person (person.id)}
        <div class="person-item">
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
      {/each}
    </div>
  {/if}
</div>

<style>
  .people-display {
    width: 100%;
    max-width: 600px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.05));
    border-radius: 16px;
    border: 2px solid #e2e8f0;
    padding: 1.25rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: #1e293b;
    background: linear-gradient(to left, #8b5cf6, #6366f1);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .toggle-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #e2e8f0;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.2rem;
  }

  .toggle-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: scale(1.05);
  }

  .toggle-btn svg {
    color: #64748b;
  }

  .people-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 1rem;
    justify-items: center;
  }

  .person-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .person-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: white;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .person-avatar:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .person-avatar :global(.image-display) {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .initial {
    font-size: 2.5rem;
    color: #94a3b8;
    font-weight: 800;
  }

  .person-name {
    font-size: 1rem;
    font-weight: 600;
    color: #475569;
    text-align: center;
    line-height: 1.2;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .people-grid {
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 0.75rem;
    }

    .person-avatar {
      width: 70px;
      height: 70px;
    }

    .person-name {
      font-size: 0.9rem;
    }

    .title {
      font-size: 1.1rem;
    }
  }
</style>
