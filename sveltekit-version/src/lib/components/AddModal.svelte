<script lang="ts">
  import { ACTIVITIES } from '$lib/data/defaults';
  import ImageUploader from './ImageUploader.svelte';
  import { TEXTS } from '$lib/services/language';

  let { 
    isOpen = false,
    taskToEdit,
    onclose,
    onsave
  } = $props<{ 
    isOpen?: boolean;
    taskToEdit?: { name: string; imageSrc: string | null } | null;
    onclose?: () => void;
    onsave?: (data: { name: string; imageSrc: string | null }) => void;
  }>();

  let taskName = $state('');
  let imageSrc: string | null = $state(null);

  $effect(() => {
    if (isOpen && taskToEdit) {
      taskName = taskToEdit.name;
      imageSrc = taskToEdit.imageSrc;
      // נסה למצוא אם זו פעילות מוכרת
      const found = ACTIVITIES.find(a => a.name === taskName);
      if (found) selectedActivityId = found.id;
    } else if (isOpen && !taskToEdit) {
      // ניקוי רק אם נפתח במצב חדש
      // לא מאפסים כאן, האיפוס קורה ב-resetForm או ב-close?
      // עדיף לאפס הכל כשנפתח
    }
  });
  let selectedActivityId: string | null = $state(null);

  function handleClose() {
    onclose?.();
  }

  function handleSave() {
    if (!taskName) return;
    onsave?.({ name: taskName, imageSrc });
    resetForm();
  }

  function resetForm() {
    taskName = '';
    imageSrc = null;
    selectedActivityId = null;
  }

  function handleActivitySelect(activity: (typeof ACTIVITIES)[number]) {
    selectedActivityId = activity.id;
    taskName = activity.name;
    imageSrc = `/images/activities/${activity.image}`;
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay open" onclick={(e) => e.target === e.currentTarget && handleClose()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-card">
      <h2 style="margin-top: 0; margin-bottom: 1rem;">{TEXTS.ADD_ACTIVITY}</h2>
      
      <!-- בחירת רשת פעילויות -->
      <div class="activities-grid">
        {#each ACTIVITIES as activity}
          <button 
            type="button"
            class="activity-card {selectedActivityId === activity.id ? 'selected' : ''}"
            onclick={() => handleActivitySelect(activity)}
          >
            <div class="image-wrapper">
              <img src="/images/activities/{activity.image}" alt={activity.name} loading="lazy" />
            </div>
            <span class="activity-name">{activity.name}</span>
          </button>
        {/each}
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="form-group">
          <label for="taskName">{TEXTS.ACTIVITY_NAME}</label>
          <input
            id="taskName"
            type="text"
            bind:value={taskName}
            class="form-input"
            placeholder={TEXTS.CHOOSE_OR_TYPE}
            required
          />
        </div>
        
        <div class="custom-image-section">
            <span class="label">{TEXTS.CHOOSE_IMAGE_OPTIONAL}</span>
            <!-- ניקוי בחירת פעילות אם מתבצעת העלאה ידנית -->
            <ImageUploader 
                imageSrc={imageSrc} 
                onchange={(id) => { 
                    imageSrc = id; 
                    if (id) selectedActivityId = null; 
                }} 
            />
        </div>

        <div class="actions">
          <button
            type="button"
            onclick={handleClose}
            class="btn-cancel"
          >
            {TEXTS.CANCEL}
          </button>
          <button type="submit" class="btn-primary" disabled={!taskName}>
            {TEXTS.SAVE}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    z-index: 200;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-overlay.open {
    display: flex;
  }

  .modal-card {
    background: white;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    padding: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .activities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
    overflow-y: auto;
    margin-bottom: 1.5rem;
    padding-right: 0.5rem; /* מקום לפס גלילה */
    flex: 1; /* תפוס מקום פנוי */
    min-height: 200px;
  }

  /* עיצוב פס גלילה */
  .activities-grid::-webkit-scrollbar {
    width: 6px;
  }
  .activities-grid::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  .activities-grid::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .activity-card {
    background: #f8fafc;
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .activity-card:hover {
    background: #f1f5f9;
    transform: translateY(-2px);
  }

  .activity-card.selected {
    border-color: var(--primary-accent, #6366f1);
    background: #eef2ff;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1);
  }

  .image-wrapper {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .image-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 3px rgba(0,0,0,0.07));
  }

  .activity-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    line-height: 1.2;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #1e293b;
  }

  .form-input {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-accent, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .custom-image-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
  }
  
  .label {
      font-weight: 500;
      color: #1e293b;
      margin-bottom: 0.25rem;
  }



  .actions {
    display: flex;
    gap: 1rem;
    margin-top: auto;
  }

  .btn-primary {
    flex: 2;
    padding: 1rem;
    background: var(--primary-accent, #6366f1);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: bold;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(110%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .btn-cancel {
    flex: 1;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    padding: 1rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
    color: #475569;
  }
</style>
