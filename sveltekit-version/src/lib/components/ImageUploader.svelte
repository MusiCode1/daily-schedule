<script lang="ts">
  import { db } from '$lib/services/db';
  import { dbImage } from '$lib/actions/dbImage';

  let {
    imageSrc = null,
    alt = "תמונה",
    className = "",
    onchange
  } = $props<{
    imageSrc?: string | null;
    alt?: string;
    className?: string;
    onchange?: (id: string | null) => void;
  }>();

  let fileInput: HTMLInputElement | undefined = $state();
  let isLoading = $state(false);

  function triggerFileInput() {
    fileInput?.click();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      isLoading = true;
      
      db.saveImage(file).then((id) => {
          onchange?.(id);
      }).catch(err => {
          console.error("Failed to save image", err);
          alert("שגיאה בשמירת התמונה");
      }).finally(() => {
          isLoading = false;
          // Reset input so same file can be selected again if needed
          if (fileInput) fileInput.value = '';
      });
    }
  }

  function handleRemove(e: Event) {
      e.stopPropagation();
      onchange?.(null);
  }
</script>

<div class="image-uploader {className}">
  <input
    type="file"
    bind:this={fileInput}
    accept="image/*"
    style="display: none"
    onchange={handleFileChange}
  />

  {#if imageSrc}
    <div class="preview-wrapper">
        <img use:dbImage={imageSrc} {alt} class="preview-image" />
        <button type="button" class="remove-btn" onclick={handleRemove} title="הסר תמונה">✕</button>
    </div>
    <button type="button" class="change-btn" onclick={triggerFileInput}>
        {isLoading ? 'שומר...' : 'החלף תמונה'}
    </button>
  {:else}
    <button type="button" class="upload-btn" onclick={triggerFileInput}>
        {#if isLoading}
            ⏳ שומר...
        {:else}
            📷 העלה תמונה
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

  .preview-image {
      max-width: 100%;
      max-height: 150px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      display: block;
      object-fit: contain;
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
  }

  .remove-btn:hover {
      transform: scale(1.1);
      background: #dc2626;
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

  .change-btn {
      background: none;
      border: none;
      color: #6366f1;
      text-decoration: underline;
      font-size: 0.9rem;
      cursor: pointer;
  }

  .change-btn:hover {
      color: #4f46e5;
  }
</style>
