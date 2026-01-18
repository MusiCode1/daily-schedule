<script lang="ts">
  import type { ImageCropData } from '$lib/types';

  let {
    imageSrc,
    initialCrop,
    onconfirm,
    oncancel
  } = $props<{
    imageSrc: string;
    initialCrop?: ImageCropData;
    onconfirm: (crop: ImageCropData) => void;
    oncancel: () => void;
  }>();

  // מצב ה-crop הנוכחי
  let crop = $state<ImageCropData>({ x: 50, y: 50, scale: 1 });
  
  // אתחול crop מהערך ההתחלתי
  $effect(() => {
    if (initialCrop) {
      crop = { ...initialCrop };
    }
  });
  
  // מצב גרירה
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let startCropX = $state(0);
  let startCropY = $state(0);

  let containerRef: HTMLDivElement | undefined = $state();
  let imageRef: HTMLImageElement | undefined = $state();
  let imageNaturalWidth = $state(0);
  let imageNaturalHeight = $state(0);

  // חישוב מינימום scale דינמי - מבטיח שהתמונה תמיד תכסה את כל הקונטיינר
  let minScale = $derived.by(() => {
    if (!containerRef || !imageNaturalWidth || !imageNaturalHeight) return 1;
    const containerSize = containerRef.offsetWidth; // ריבוע
    
    // חישוב ה-scale הנדרש לכיסוי הקונטיינר בשני הממדים
    const scaleByWidth = containerSize / imageNaturalWidth;
    const scaleByHeight = containerSize / imageNaturalHeight;
    
    // נבחר את ה-scale הגדול יותר כדי להבטיח כיסוי מלא
    return Math.max(scaleByWidth, scaleByHeight);
  });

  // טיפול בטעינת תמונה
  function handleImageLoad() {
    if (imageRef) {
      imageNaturalWidth = imageRef.naturalWidth;
      imageNaturalHeight = imageRef.naturalHeight;
    }
  }

  // התחל גרירה
  function startDrag(e: MouseEvent | TouchEvent) {
    isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartX = clientX;
    dragStartY = clientY;
    startCropX = crop.x;
    startCropY = crop.y;
  }

  // המשך גרירה
  function handleDrag(e: MouseEvent | TouchEvent) {
    if (!isDragging || !containerRef || !imageNaturalWidth || !imageNaturalHeight) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    
    // המרה לאחוזים יחסית לגודל הקונטיינר
    const containerWidth = containerRef.offsetWidth;
    const containerHeight = containerRef.offsetHeight;
    
    // Scale מוחלט (יחסי לתמונה המקורית)
    const actualScale = minScale * crop.scale;
    
    const deltaXPercent = (deltaX / containerWidth) * 100 * actualScale;
    const deltaYPercent = (deltaY / containerHeight) * 100 * actualScale;
    
    // חישוב גבולות הזזה בהתאם ליחס התמונה והזום
    const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
    
    // חישוב גודל התמונה המוצגת ביחס לקונטיינר
    let displayedWidth: number, displayedHeight: number;
    if (imageAspectRatio > 1) {
      // תמונה רחבה
      displayedHeight = containerHeight;
      displayedWidth = displayedHeight * imageAspectRatio;
    } else {
      // תמונה גבוהה או ריבועית
      displayedWidth = containerWidth;
      displayedHeight = displayedWidth / imageAspectRatio;
    }
    
    // חישוב הגבולות עם הזום
    const scaledWidth = displayedWidth * actualScale;
    const scaledHeight = displayedHeight * actualScale;
    
    // חישוב הטווח המותר להזזה (באחוזים)
    const maxMoveX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxMoveY = Math.max(0, (scaledHeight - containerHeight) / 2);
    
    const minX = 50 - (maxMoveX / containerWidth) * 100;
    const maxX = 50 + (maxMoveX / containerWidth) * 100;
    const minY = 50 - (maxMoveY / containerHeight) * 100;
    const maxY = 50 + (maxMoveY / containerHeight) * 100;
    
    crop.x = Math.max(minX, Math.min(maxX, startCropX + deltaXPercent));
    crop.y = Math.max(minY, Math.min(maxY, startCropY + deltaYPercent));
  }

  // סיים גרירה
  function endDrag() {
    isDragging = false;
  }

  // שינוי זום - scale יחסי (1.0 = minScale, 3.0 = פי 3 מ-minScale)
  function handleZoom(delta: number) {
    const newScale = Math.max(1.0, Math.min(3.0, crop.scale + delta));
    crop.scale = newScale;
  }

  // גלגלת עכבר לזום
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }

  // איפוס
  function resetCrop() {
    crop = { x: 50, y: 50, scale: 1.0 };
  }

  // אישור
  function confirm() {
    onconfirm(crop);
  }
</script>

<svelte:window
  onmousemove={handleDrag}
  onmouseup={endDrag}
  ontouchmove={handleDrag}
  ontouchend={endDrag}
/>

<div class="crop-editor-overlay">
  <div class="crop-editor">
    <div class="crop-header">
      <h3>התאמת תמונה</h3>
      <p>גרור להזזה, השתמש בכפתורים לזום</p>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div 
      class="crop-container"
      bind:this={containerRef}
      onwheel={handleWheel}
      onmousedown={startDrag}
      ontouchstart={startDrag}
      role="img"
      tabindex="0"
    >
      <img
        bind:this={imageRef}
        src={imageSrc}
        alt="עריכת תמונה"
        class="crop-image"
        style:transform="translate(-50%, -50%) scale({minScale * crop.scale})"
        style:left="{crop.x}%"
        style:top="{crop.y}%"
        onload={handleImageLoad}
        draggable="false"
      />
      <div class="crop-frame"></div>
    </div>

    <div class="crop-controls">
      <div class="zoom-controls">
        <button type="button" onclick={() => handleZoom(-0.2)} class="control-btn">
          🔍-
        </button>
        <span class="zoom-level">{Math.round(crop.scale * 100)}%</span>
        <button type="button" onclick={() => handleZoom(0.2)} class="control-btn">
          🔍+
        </button>
      </div>
      
      <button type="button" onclick={resetCrop} class="reset-btn">
        🔄 איפוס
      </button>
    </div>

    <div class="crop-actions">
      <button type="button" onclick={oncancel} class="btn-cancel">
        ביטול
      </button>
      <button type="button" onclick={confirm} class="btn-confirm">
        ✓ אישור
      </button>
    </div>
  </div>
</div>

<style>
  .crop-editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }

  .crop-editor {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 500px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }

  .crop-header {
    text-align: center;
  }

  .crop-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: #1e293b;
  }

  .crop-header p {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .crop-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: #f1f5f9;
    border-radius: 12px;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }

  .crop-container:active {
    cursor: grabbing;
  }

  .crop-image {
    position: absolute;
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    max-width: none;
    max-height: none;
    object-fit: none;
    user-select: none;
    pointer-events: none;
    transform-origin: center;
  }

  .crop-frame {
    position: absolute;
    inset: 0;
    border: 3px solid #6366f1;
    border-radius: 12px;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  }

  .crop-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .control-btn {
    background: #f1f5f9;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover {
    background: #e2e8f0;
    transform: scale(1.05);
  }

  .control-btn:active {
    transform: scale(0.95);
  }

  .zoom-level {
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 600;
    min-width: 50px;
    text-align: center;
  }

  .reset-btn {
    background: #f1f5f9;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #64748b;
  }

  .reset-btn:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .crop-actions {
    display: flex;
    gap: 0.75rem;
  }

  .crop-actions button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .btn-confirm {
    background: #6366f1;
    color: white;
  }

  .btn-confirm:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  @media (max-width: 640px) {
    .crop-editor {
      padding: 1rem;
    }

    .crop-header h3 {
      font-size: 1.25rem;
    }

    .control-btn {
      width: 36px;
      height: 36px;
      font-size: 1rem;
    }
  }
</style>
