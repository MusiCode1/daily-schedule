<script lang="ts">
  import ImageDisplay from './ImageDisplay.svelte';

  // Props
  let { logo = '', title = '', description = '' }: {
    logo?: string;
    title?: string;
    description?: string;
  } = $props();
</script>

<div class="list-header">
  {#if logo}
    <div class="logo-large">
      <ImageDisplay imageSrc={logo} alt={title || 'לוגו'} />
    </div>
  {/if}
  
  <div class="header-content">
    {#if title}
      <h2 class="header-title">{title}</h2>
    {/if}
    {#if description}
      <p class="header-description">{description}</p>
    {/if}
  </div>
</div>

<style>
  .list-header {
    width: 100%;
    max-width: 600px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
    border-radius: 20px;
    border: 2px solid #e2e8f0;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .logo-large {
    width: 200px;
    height: 200px;
    flex-shrink: 0;
    border-radius: 16px;
    overflow: hidden;
    background: white;
    border: 3px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .logo-large :global(.image-display) {
    width: 100%;
    height: 100%;
  }

  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .header-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: #1e293b;
    margin: 0;
    line-height: 1.3;
    background: linear-gradient(to left, var(--primary-accent, #6366f1), var(--secondary-accent, #8b5cf6));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-description {
    font-size: 1.1rem;
    color: #475569;
    line-height: 1.5;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .list-header {
      flex-direction: column;
      text-align: center;
    }

    .logo-large {
      width: 150px;
      height: 150px;
    }

    .header-title {
      font-size: 1.5rem;
    }

    .header-description {
      font-size: 1rem;
    }
  }
</style>
