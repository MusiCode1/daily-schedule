<script lang="ts">
  
  let { 
    activeListId = $bindable("morning_routine"), 
    listsData = [],
    onchange
  } = $props<{ 
    activeListId?: string; 
    listsData?: any[];
    onchange?: (detail: { listId: string }) => void;
  }>();

  function selectList(listId: string) {
    if (activeListId !== listId) {
      activeListId = listId;
      onchange?.({ listId });
    }
  }
</script>

<div class="switcher-container">
  <div class="list-switcher">
    {#each listsData as list}
      <button 
        class="list-card" 
        class:active={activeListId === list.id}
        onclick={() => selectList(list.id)}
        aria-label="Switch to {list.name}"
      >
        <div class="image-container">
          <img src={list.logo} alt={list.name} />
        </div>
        <span class="list-name">{list.name}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .switcher-container {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    padding: 0.5rem;
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.05), 
      0 2px 4px -1px rgba(0, 0, 0, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    margin: 0 auto;
    width: fit-content;
    max-width: 100%;
  }

  .list-switcher {
    display: flex;
    gap: 0.8rem;
    padding: 0.2rem;
    overflow-x: auto;
    justify-content: center;
  }

  .list-card {
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid transparent;
    border-radius: 16px;
    padding: 0.4rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100px;
    position: relative;
  }

  .list-card:hover {
    transform: translateY(-2px);
    background: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .list-card.active {
    border-color: var(--primary-accent, #6366f1);
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
  }

  .image-container {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  /* ... existing img styles ... */

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .list-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: #4b5563;
    text-align: center;
    white-space: nowrap;
  }

  .list-card.active .list-name {
    color: var(--primary-accent, #6366f1);
  }
</style>
