<script lang="ts">
  import { db } from '$lib/services/db';
  import { imageStore } from '$lib/stores/imageStore.svelte';
  import ImageCropEditor from './ImageCropEditor.svelte';
  import ImageDisplay from './ImageDisplay.svelte';
  import type { ImageCropData } from '$lib/types';
  import { TEXTS } from '$lib/data/texts';

  let {
    imageSrc = null,
    alt = TEXTS.IMAGE_ALT_GENERIC,
    className = "",
    onchange
  } = $props<{
    imageSrc?: string | null;
    alt?: string;
    className?: string;
    onchange?: (src: string | null) => void;
  }>();

  let fileInput: HTMLInputElement | undefined = $state();
  let isLoading = $state(false);
  let showCropEditor = $state(false);
  let tempImageUrl = $state<string | null>(null);
  let currentImageSrc = $state<string | null>(null);
  let currentCrop = $state<ImageCropData | undefined>(undefined);

  // עדכון כשהנתונים משתנים מבחוץ
  $effect(() => {
    currentImageSrc = imageSrc;
    // טעינת crop מהמאגר
    if (imageSrc) {
      let metadata = imageStore.getImageMetadata(imageSrc);
      // אם אין מטא-דאטה (תמונה סטטית או חדשה), נוסיף ערכי ברירת מחדל
      if (!metadata) {
        const defaultMetadata = { crop: { x: 50, y: 50, scale: 1 } };
        imageStore.setImageMetadata(imageSrc, defaultMetadata);
        metadata = defaultMetadata;
      }
      currentCrop = metadata?.crop;
    } else {
      currentCrop = undefined;
    }
  });

  function triggerFileInput() {
    fileInput?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      isLoading = true;
      
      try {
        // שמירת התמונה ב-DB
        const id = await db.saveImage(file);
        
        // יצירת URL זמני להצגה בעורך
        const blob = await db.getImage(id);
        if (blob) {
          tempImageUrl = URL.createObjectURL(blob);
          currentImageSrc = id;
          currentCrop = undefined; // תמונה חדשה, אין עדיין crop
          showCropEditor = true;
        }
      } catch (err) {
        console.error("Failed to save image", err);
        alert(TEXTS.SAVE_ERROR);
      } finally {
        isLoading = false;
        if (fileInput) fileInput.value = '';
      }
    }
  }

  function handleCropConfirm(crop: ImageCropData) {
    if (currentImageSrc) {
      // שמירת crop במאגר
      imageStore.setImageMetadata(currentImageSrc, { crop });
      currentCrop = crop;
      onchange?.(currentImageSrc);
    }
    closeCropEditor();
  }

  function handleCropCancel() {
    // אם זו תמונה חדשה, נבטל אותה
    if (!imageSrc) {
      currentImageSrc = null;
      currentCrop = undefined;
    }
    closeCropEditor();
  }

  function closeCropEditor() {
    showCropEditor = false;
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      tempImageUrl = null;
    }
  }

  function handleRemove(e: Event) {
    e.stopPropagation();
    // מחיקת מטאדטה אם קיימת
    if (currentImageSrc) {
      imageStore.deleteImageMetadata(currentImageSrc);
    }
    currentImageSrc = null;
    currentCrop = undefined;
    onchange?.(null);
  }

  async function handleEditCrop() {
    if (!currentImageSrc) return;
    
    // אם זו תמונה מ-IndexedDB (מתחילה ב-idb:)
    if (currentImageSrc.startsWith('idb:')) {
      const blob = await db.getImage(currentImageSrc);
      if (blob) {
        tempImageUrl = URL.createObjectURL(blob);
        showCropEditor = true;
      }
    } else {
      // תמונה סטטית - משתמשים ב-URL ישירות
      tempImageUrl = currentImageSrc;
      showCropEditor = true;
    }
  }

  // ניקוי
  $effect(() => {
    return () => {
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
      }
    };
  });
</script>

{#if showCropEditor && tempImageUrl && currentImageSrc}
  <ImageCropEditor
    imageSrc={tempImageUrl}
    initialCrop={currentCrop || { x: 50, y: 50, scale: 1 }}
    onconfirm={handleCropConfirm}
    oncancel={handleCropCancel}
  />
{/if}

<div class="image-uploader {className}">
  <input
    type="file"
    bind:this={fileInput}
    accept="image/*"
    style="display: none"
    onchange={handleFileChange}
  />

  {#if currentImageSrc}
    <div class="preview-wrapper">
      <ImageDisplay 
        imageSrc={currentImageSrc}
        {alt}
        className="preview-image-display"
      />
      <button type="button" class="remove-btn" onclick={handleRemove} title={TEXTS.REMOVE_IMAGE_TITLE}>✕</button>
    </div>
    <div class="action-buttons">
      <button type="button" class="edit-btn" onclick={handleEditCrop}>
        ✂️ {TEXTS.EDIT_CROP_ACTION}
      </button>
      <button type="button" class="change-btn" onclick={triggerFileInput}>
        {isLoading ? TEXTS.SAVING_ELLIPSIS : `🔄 ${TEXTS.REPLACE_IMAGE}`}
      </button>
    </div>
  {:else}
    <button type="button" class="upload-btn" onclick={triggerFileInput}>
      {#if isLoading}
        ⏳ {TEXTS.SAVING_ELLIPSIS}
      {:else}
        📷 {TEXTS.UPLOAD_IMAGE}
      {/if}
    </button>
  {/if}
</div>

<style>
  .image-uploader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .preview-wrapper {
    position: relative;
    display: inline-block;
  }

  .preview-wrapper :global(.preview-image-display) {
    width: 150px;
    height: 150px;
    border: 2px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 12px; /* שוליים עגולות */
    overflow: hidden; /* לחיתוך שוליים עגולות */
  }

  .remove-btn {
    position: absolute;
    top: -8px;
    left: -8px;
    background: #ef4444;
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: transform 0.2s;
    z-index: 10;
  }

  .remove-btn:hover {
    transform: scale(1.1);
    background: #dc2626;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .upload-btn {
    background: #f1f5f9;
    border: 2px dashed #cbd5e1;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: center;
  }

  .upload-btn:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
    color: #475569;
  }

  .edit-btn,
  .change-btn {
    background: none;
    border: none;
    color: #6366f1;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .edit-btn:hover,
  .change-btn:hover {
    background: #eef2ff;
    color: #4f46e5;
  }
</style>
