<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { TEXTS } from '$lib/services/language';
  import { fade } from 'svelte/transition';

  let { children } = $props();

  const TABS = [
    { id: 'users', label: TEXTS.USERS_TAB, icon: '👥', path: '/settings/users' },
    { id: 'lists', label: TEXTS.LISTS_TAB, icon: '📋', path: '/settings/lists' },
    { id: 'general', label: TEXTS.GENERAL_TAB, icon: '⚙️', path: '/settings/general' }
  ];

  function handleBack() {
    goto('/');
  }

  // Derive active tab from URL
  let activeTab = $derived(TABS.find(t => $page.url.pathname.includes(t.path))?.id || 'users');
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
        onclick={() => goto(tab.path)}
      >
        <span class="tab-icon">{tab.icon}</span>
        {tab.label}
      </button>
    {/each}
  </div>

  <main class="content-area">
      {#key $page.url.pathname}
        <div in:fade={{ duration: 200 }}>
            {@render children()}
        </div>
      {/key}
  </main>
</div>

<style>
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
</style>
