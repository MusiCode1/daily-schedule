<script lang="ts">
  import type { Task } from '$lib/types';
  import { dbImage } from '$lib/actions/dbImage';

  let { 
    task, 
    isActive = false, 
    isEditMode = false,
    ontoggle,
    ondelete,
    onedit,
    ...rest
  } = $props<{ 
    task: Task; 
    isActive?: boolean; 
    isEditMode?: boolean; 
    ontoggle?: (id: string) => void;
    ondelete?: (id: string) => void;
    onedit?: (task: Task) => void;
    [key: string]: any;
  }>();

  function handleDelete(e: Event) {
    if (!isEditMode) return;
    e.stopPropagation();
    if (confirm("למחוק?")) {
      ondelete?.(task.id);
    }
  }

  function handleEdit(e: Event) {
    if (!isEditMode) return;
    e.stopPropagation();
    onedit?.(task);
  }

  function handleToggle(e: Event) {
    e.stopPropagation();
    ontoggle?.(task.id);
  }
  
  let imageLoaded = $state(false);
</script>

<div class="task-row-wrapper" class:completed={task.isDone} class:active={isActive}>
  {#if isActive && !isEditMode}
    <div class="now-indicator">
      <div class="now-text">עכשיו</div>
      <div class="now-arrow"></div>
    </div>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="task-card"
    draggable={isEditMode}
    class:editable={isEditMode}
    onclick={handleToggle}
    {...rest}
  >
    {#if isEditMode}
      <button class="action-btn delete-btn" onclick={handleDelete} title="מחק">✕</button>
      <button class="action-btn edit-btn" onclick={handleEdit} title="ערוך">✎</button>
      <div class="drag-handle-indicator">⋮⋮</div>
    {/if}

    <div class="task-image-wrapper">
      {#if !imageLoaded}
        <div class="image-placeholder">⏳</div>
      {/if}
      {#if !imageLoaded}
        <div class="image-placeholder">⏳</div>
      {/if}
      
      {#if task.imageSrc}
          <img
            use:dbImage={task.imageSrc}
            class="task-image"
            class:hidden={!imageLoaded}
            alt=""
            onload={() => imageLoaded = true}
            onerror={() => imageLoaded = true} 
          />
      {:else}
          <img
            src={'https://placehold.co/400x400/e2e8f0/64748b?text=IMG'}
            class="task-image"
            class:hidden={!imageLoaded}
            alt=""
            onload={() => imageLoaded = true}
          />
      {/if}
    </div>

    <div class="task-content">
      <h3 class="task-name">{task.name}</h3>
      <div class="check-icon">✓ בוצע</div>
    </div>
  </div>
</div>

<style>
  .task-row-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    flex: 1;
    max-height: 180px;
    min-height: 100px;
    display: flex;
    align-items: center;
    transition: transform 0.2s;
  }

  .task-card {
    background: var(--bg-card, #ffffff);
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    overflow: hidden;
    width: 100%;
    height: 100%;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    cursor: pointer;
    border: 2px solid transparent;
    position: relative;
  }

  /* מצב גרירה (Dragging) */
  /* הערה: המחלקה 'dragging' מתווספת בדרך כלל דרך JS בהורה או ב-directive */
  :global(.task-card.dragging) {
    opacity: 0.5;
    transform: scale(0.95);
    border: 2px dashed var(--primary-accent, #6366f1);
  }

  .task-image-wrapper {
    height: 100%;
    aspect-ratio: 1 / 1;
    width: auto;
    position: relative;
    /* background-color: #f1f5f9; */
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-placeholder {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    align-items: center; justify-content: center;
    font-size: 2rem;
    color: #cbd5e1;
    background: #f1f5f9;
  }

  .task-image.hidden {
    opacity: 0;
  }

  .task-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    padding: 0;
    display: block;
    transition: opacity 0.3s ease;
  }

  .task-content {
    flex-grow: 1;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
  }

  .task-name {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }

  /* מצב פעיל (עכשיו) */
  .task-row-wrapper.active .task-card {
    border-color: var(--primary-accent, #6366f1);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
    z-index: 5;
    transform: scale(1.02);
  }

  .now-indicator {
    position: absolute;
    right: -3.5rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: row;
    align-items: center;
    z-index: 20;
    animation: bounceRight 1.5s infinite;
  }

  .now-text {
    background: var(--danger-color, #ef4444);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.9rem;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .now-arrow {
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 18px solid var(--danger-color, #ef4444);
    margin-right: -2px;
  }

  @keyframes bounceRight {
    0%,
    100% {
      transform: translate(0, -50%);
    }
    50% {
      transform: translate(-5px, -50%);
    }
  }

  /* מצב בוצע */
  .task-row-wrapper.completed .task-card {
    background: #ecfdf5;
    border: 2px solid var(--success-color, #22c55e);
    opacity: 1;
    transform: scale(0.98);
  }

  .task-row-wrapper.completed .task-name {
    text-decoration: none;
    color: #15803d;
  }

  .check-icon {
    display: none;
    color: var(--success-color, #22c55e);
    font-size: 2rem;
    margin-right: auto;
  }

  .task-row-wrapper.completed .check-icon {
    display: block;
  }

  /* כפתור מחיקה */
  /* כפתורי פעולה */
  .action-btn {
    position: absolute;
    top: 0;
    width: 36px;
    height: 36px;
    border: none;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.2s;
    z-index: 10;
  }

  .action-btn:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .delete-btn {
    left: 0;
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger-color, #ef4444);
    border-bottom-right-radius: 12px;
  }

  .delete-btn:hover {
    background: var(--danger-color, #ef4444);
    color: white;
  }

  .edit-btn {
    right: 0;
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary-accent, #6366f1);
    border-bottom-left-radius: 12px;
  }

  .edit-btn:hover {
    background: var(--primary-accent, #6366f1);
    color: white;
  }

  .delete-btn:hover {
    background: var(--danger-color, #ef4444);
    color: white;
    opacity: 1;
  }

  .drag-handle-indicator {
    position: absolute;
    top: 50%;
    right: 0.5rem; /* שמאל ב-RTL? המשתמש ביקש RTL, בדוק זרימה */
    transform: translateY(-50%);
    font-size: 1.5rem;
    color: #cbd5e1;
    cursor: grab;
    pointer-events: none; /* אפשר ללחיצות לעבור לכרטיס אם צריך, או טפל בגרירה על הכרטיס */
    z-index: 10;
  }
  
  /* ב-RTL 'ימין' הוא ההתחלה, אבל ידיות הן בדרך כלל ב"התחלה" או "סוף".
     תמונת המשימה בימין? הקוד אומר שעוטף התמונה הוא בילד הראשון.
     נבדוק את פריסת הכרטיס. כיוון flex row. עוטף תמונה ראשון.
     אז התמונה בימין. התוכן בשמאל.
     ידית הגרירה צריכה כנראה להיות בקצה השמאלי.
  */
  .drag-handle-indicator {
    right: auto;
    left: 0.5rem;
  }

  /* כשניתן לעריכה, אולי להראות את הידית טוב יותר */
  .task-card.editable {
    cursor: grab;
  }
  .task-card.editable:active {
    cursor: grabbing;
  }
</style>
