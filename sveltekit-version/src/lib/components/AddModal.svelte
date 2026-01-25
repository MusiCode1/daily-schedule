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
  let communicationBoardUrl = $state('');
  let isChangeTask = $state(false);
  let changeType: 'cancelled' | 'added' = $state('cancelled');
  let isActivitiesExpanded = $state(true); // מצב פתוח/סגור של רשת הפעילויות

  $effect(() => {
    if (isOpen && taskToEdit) {
      taskName = taskToEdit.name;
      imageSrc = taskToEdit.imageSrc;
      communicationBoardUrl = (taskToEdit as any).communicationBoardUrl || '';
      isChangeTask = !!(taskToEdit as any).changeType;
      changeType = (taskToEdit as any).changeType || 'cancelled';
      // נסה למצוא אם זו פעילות מוכרת
      const found = ACTIVITIES.find(a => a.name === taskName);
      if (found) selectedActivityId = found.id;
    } else if (isOpen && !taskToEdit) {
      // ניקוי רק אם נפתח במצב חדש
    }
  });
  let selectedActivityId: string | null = $state(null);

  function handleClose() {
    onclose?.();
  }

  function handleSave() {
    if (!taskName) return;
    const saveData: any = { 
      name: taskName, 
      imageSrc,
      communicationBoardUrl: communicationBoardUrl || undefined,
      changeType: isChangeTask ? changeType : undefined
    };
    onsave?.(saveData);
    resetForm();
  }

  function resetForm() {
    taskName = '';
    imageSrc = null;
    communicationBoardUrl = '';
    isChangeTask = false;
    changeType = 'cancelled';
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
      <div class="modal-header">
        <h2>{TEXTS.ADD_ACTIVITY}</h2>
        <button 
          type="button"
          class="toggle-activities-btn"
          onclick={() => isActivitiesExpanded = !isActivitiesExpanded}
          title={isActivitiesExpanded ? 'כווץ רשת פעילויות' : 'הרחב רשת פעילויות'}
        >
          {isActivitiesExpanded ? '▼' : '◀'}
        </button>
      </div>
      
      <!-- בחירת רשת פעילויות -->
      <div class="activities-grid" class:collapsed={!isActivitiesExpanded}>
        {#each ACTIVITIES as activity}
          <button 
            type="button"
            class="selection-card {selectedActivityId === activity.id ? 'selected' : ''}"
            onclick={() => handleActivitySelect(activity)}
          >
            <!-- svelte-ignore a11y_img_redundant_alt -->
            <img class="selection-card-img" src="/images/activities/{activity.image}" alt={activity.name} loading="lazy" />
            <span class="selection-card-label">{activity.name}</span>
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
            class="input"
            placeholder={TEXTS.CHOOSE_OR_TYPE}
            required
          />
        </div>
        
        <div class="custom-image-section">
            <span class="label">{TEXTS.CHOOSE_IMAGE_OPTIONAL}</span>
            <!-- ניקוי בחירת פעילות אם מתבצעת העלאה ידנית -->
            <ImageUploader 
                imageSrc={imageSrc} 
                onchange={(src) => { 
                    imageSrc = src; 
                    if (src) selectedActivityId = null; 
                }} 
            />
        </div>

        <!-- קישור ללוח תקשורת -->
        <div class="form-group">
          <label for="boardUrl">{TEXTS.COMMUNICATION_BOARD_URL}</label>
          <input
            id="boardUrl"
            type="url"
            bind:value={communicationBoardUrl}
            class="input"
            placeholder={TEXTS.COMMUNICATION_BOARD_PLACEHOLDER}
          />
        </div>

        <!-- סימון כמשימת שינוי -->
        <div class="change-section">
          <label class="toggle-label">
            <input type="checkbox" bind:checked={isChangeTask} />
            <span>{TEXTS.MARK_AS_CHANGE}</span>
          </label>
          
          {#if isChangeTask}
            <div class="change-type-select">
              <label class="change-option">
                <input type="radio" bind:group={changeType} value="cancelled" />
                <span class="change-cancelled">🚫 {TEXTS.CHANGE_CANCELLED}</span>
              </label>
              <label class="change-option">
                <input type="radio" bind:group={changeType} value="added" />
                <span class="change-added">✨ {TEXTS.CHANGE_ADDED}</span>
              </label>
            </div>
          {/if}
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
  @reference "tailwindcss";

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
    padding: 0; /* הסרת padding כללי */
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden; /* מניעת גלילה של הכרטיס עצמו */
  }

  .modal-header {
    @apply px-6 pt-6 pb-4; /* Tailwind padding */
    flex-shrink: 0; /* הכותרת לא תתכווץ */
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-card form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; /* חשוב ל-flexbox overflow */
    overflow-y: auto; /* גלילה אנכית לתוכן הטופס */
    padding: 0 1.5rem; /* padding בצדדים בלבד */
  }

  .modal-card form .actions {
    margin-top: auto; /* דוחף לתחתית */
    padding: 1rem 0 1.5rem; /* padding עליון ותחתון */
    position: sticky; /* קבוע בתחתית */
    bottom: 0;
    background: white; /* רקע לבן כדי לכסות תוכן */
    z-index: 10;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0; /* לא יתכווץ */
  }

  .modal-header h2 {
    margin: 0;
  }

  .toggle-activities-btn {
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
    color: #64748b;
  }

  .toggle-activities-btn:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .activities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    transition: max-height 0.3s ease-in-out;
    overflow-y: auto; /* גלילה כשמורחב */
    max-height: 400px; /* גובה מקסימלי כשמורחב */
    @apply px-6; /* PADDING ADDED HERE via Tailwind utility */
  }

  .activities-grid.collapsed {
    max-height: 140px; /* גובה של שורה אחת בערך */
    overflow: hidden; /* ללא גלילה כשמכווץ */
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
  .activities-grid::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
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
    margin-top: 1rem;
    flex-shrink: 0; /* הכפתורים תמיד יהיו גלויים */
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9; /* קו הפרדה ויזואלי */
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

  .change-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    color: #1e293b;
  }

  .toggle-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .change-type-select {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 1.5rem;
  }

  .change-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background 0.2s;
  }

  .change-option:hover {
    background: #f8fafc;
  }

  .change-option input[type="radio"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .change-cancelled {
    color: #dc2626;
    font-weight: 600;
  }

  .change-added {
    color: #ca8a04;
    font-weight: 600;
  }
</style>
