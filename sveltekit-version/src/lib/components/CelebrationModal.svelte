<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';

  let { 
    isOpen = false, 
    message = '',
    duration = 3000,
    onclose
  } = $props<{ 
    isOpen?: boolean; 
    message?: string;
    duration?: number;
    onclose?: () => void; 
  }>();

  // אופציונלי: משך זמן לסגירה אוטומטית במילישניות

  let timeoutId: NodeJS.Timeout | undefined;

  $effect(() => {
    if (isOpen) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onclose?.();
      }, duration);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  function handleClose() {
      if (timeoutId) clearTimeout(timeoutId);
      onclose?.();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="celebration-overlay" onclick={handleClose} transition:fade={{ duration: 200 }}>
    <div 
      class="celebration-content"
      transition:scale={{ duration: 800, easing: elasticOut, start: 0.5 }}
    >
       <div class="modal-content" in:scale={{ duration: 400, start: 0.5 }} out:scale={{ duration: 300 }}>
         <div class="confetti">🎉</div>
         
         {#if message}
         <h2 transition:scale>{message}</h2>
          <!--  <p class="boost-message" transition:scale>{message}</p> -->
         {/if}
       </div>
    </div>
  </div>
{/if}

<style>
  .celebration-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: auto;
    cursor: pointer;
  }

  .celebration-content {
    background: linear-gradient(135deg, #fbbf24, #f59e0b); /* גרדיאנט ענבר/צהוב */
    color: white;
    padding: 3rem;
    border-radius: 2rem;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    border: 4px solid white;
  }

  .celebration-content h2 {
    font-size: 3rem;
    color: #4f46e5;
    margin: 1rem 0;
  }

  .boost-message {
    font-size: 1.5rem;
    color: #4b5563;
    margin: 0;
    font-weight: bold;
    text-align: center;
  }

  .confetti {
    font-size: 4rem;
    margin-bottom: 0.5rem;
  }
</style>
