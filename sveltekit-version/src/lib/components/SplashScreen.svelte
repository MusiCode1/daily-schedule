<script lang="ts">
  import { fade } from 'svelte/transition';
  import favicon from '$lib/assets/logo.svg';

  // רכיב זה יוצג בזמן שהאפליקציה טוענת נתונים
</script>

<div class="splash-container" out:fade={{ duration: 500 }}>
  <div class="logo-wrapper">
    <img src={favicon} alt="לוגו סדר יום" class="logo-image" />
    <div class="pulse-ring"></div>
  </div>
  <h1 class="loading-text">טוען סדר יום...</h1>
</div>

<style>
  .splash-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    gap: 2rem;
  }

  .logo-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-image {
    width: 80px;
    height: 80px;
    z-index: 2;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
    animation: float 3s ease-in-out infinite;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--primary-accent, #6366f1);
    opacity: 0.2;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    z-index: 1;
  }

  .loading-text {
    font-size: 1.5rem;
    color: var(--text-color, #333);
    font-weight: 700;
    opacity: 0.8;
    animation: breath 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(0.8);
      opacity: 0.1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.3;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes breath {
     0%, 100% { opacity: 0.6; }
     50% { opacity: 1; }
  }
</style>
