<script lang="ts">
  import { dbImage } from '$lib/actions/dbImage';
  import { imageStore } from '$lib/stores/imageStore.svelte';
  import type { ImageCropData } from '$lib/types';

  let {
    imageSrc,
    alt = "תמונה",
    className = "",
    rounded = false,
    onload,
    onerror
  } = $props<{
    imageSrc: string | null | undefined;
    alt?: string;
    className?: string;
    rounded?: boolean;
    onload?: () => void;
    onerror?: (e: Event) => void;
  }>();

  // שליפת crop מהמאגר
  let cropData = $derived.by<ImageCropData | undefined>(() => {
    if (!imageSrc) return undefined;
    const metadata = imageStore.getImageMetadata(imageSrc);
    return metadata?.crop;
  });

  let imageLoaded = $state(false);
  let imageRef: HTMLImageElement | undefined = $state();
  let containerRef: HTMLDivElement | undefined = $state();
  
  // minScale - מחושב פעם אחת כשהתמונה נטענת
  let minScale = $state(1);

  function handleLoad() {
    // חישוב minScale רק פעם אחת כשהתמונה נטענת
    if (imageRef && containerRef) {
      const containerSize = containerRef.offsetWidth;
      const imageNaturalWidth = imageRef.naturalWidth;
      const imageNaturalHeight = imageRef.naturalHeight;
      
      if (imageNaturalWidth && imageNaturalHeight && containerSize > 0) {
        const scaleByWidth = containerSize / imageNaturalWidth;
        const scaleByHeight = containerSize / imageNaturalHeight;
        minScale = Math.max(scaleByWidth, scaleByHeight);
      }
    }
    
    imageLoaded = true;
    onload?.();
  }

  function handleError(e: Event) {
    imageLoaded = true; // להסתיר את ה-loader גם במקרה של שגיאה
    onerror?.(e);
  }
</script>

{#if imageSrc}
  <div bind:this={containerRef} class="image-display {className}" class:rounded>
    {#if !imageLoaded}
      <div class="image-loader">⏳</div>
    {/if}
    
    {#if cropData}
      <!-- תמונה עם crop -->
      <div class="image-cropped" class:loaded={imageLoaded}>
        <img
          bind:this={imageRef}
          use:dbImage={imageSrc}
          {alt}
          style:transform="translate(-50%, -50%) scale({minScale * cropData.scale})"
          style:left="{cropData.x}%"
          style:top="{cropData.y}%"
          onload={handleLoad}
          onerror={handleError}
          draggable="false"
        />
      </div>
    {:else}
      <!-- תמונה רגילה -->
      <img
        use:dbImage={imageSrc}
        {alt}
        class="image-normal"
        class:loaded={imageLoaded}
        onload={handleLoad}
        onerror={handleError}
        draggable="false"
      />
    {/if}
  </div>
{/if}

<style>
  .image-display {
    position: relative;
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
  }

  .image-display.rounded {
    border-radius: 12px;
  }

  .image-loader {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: #f1f5f9;
  }

  .image-cropped {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .image-cropped.loaded {
    opacity: 1;
  }

  .image-cropped img {
    position: absolute;
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    max-width: none;
    max-height: none;
    object-fit: none;
    transform-origin: center;
    user-select: none;
  }

  .image-normal {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity 0.3s ease;
    user-select: none;
  }

  .image-normal.loaded {
    opacity: 1;
  }
</style>
