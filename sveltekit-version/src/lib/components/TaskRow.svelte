<script lang="ts">
  import type { Task } from '$lib/types';
  import ImageDisplay from './ImageDisplay.svelte';
  import { TEXTS } from '$lib/services/language';

  let { 
    task, 
    isActive = false, 
    isEditMode = false,
    taskNumber,
    ontoggle,
    ondelete,
    onedit,
    onopenboard,
    ...rest
  } = $props<{ 
    task: Task; 
    isActive?: boolean; 
    isEditMode?: boolean;
    taskNumber?: number;
    ontoggle?: (id: string) => void;
    ondelete?: (id: string) => void;
    onedit?: (task: Task) => void;
    onopenboard?: (url: string) => void;
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

  function handleOpenBoard(e: Event) {
    e.stopPropagation();
    if (task.communicationBoardUrl) {
      onopenboard?.(task.communicationBoardUrl);
    }
  }
</script>

<div class="task-row-wrapper" class:completed={task.isDone} class:active={isActive} class:cancelled={task.changeType === 'cancelled'}>
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

    {#if taskNumber !== undefined}
      <div class="task-number">{taskNumber}</div>
    {/if}

    <div class="task-image-wrapper">
      {#if task.imageSrc}
        <ImageDisplay 
          imageSrc={task.imageSrc} 
          alt={task.name}
          className="task-image"
        />
      {:else}
        <div class="placeholder-image">
          <span>📷</span>
        </div>
      {/if}
    </div>

    <div class="task-content">
      {#if task.changeType}
        <div class="change-badge {task.changeType}">
          {#if task.changeType === 'cancelled'}
            <span class="change-icon">🚫</span>
            <span class="change-text">{TEXTS.CHANGE_LABEL}</span>
          {:else}
            <span class="change-icon">✨</span>
            <span class="change-text">{TEXTS.NEW_ACTIVITY_LABEL}</span>
          {/if}
        </div>
      {/if}
      
      <h3 class="task-name">{task.name}</h3>
      
      {#if task.communicationBoardUrl && (isActive || task.isDone) && !isEditMode}
        <button 
          class="comm-board-btn" 
          onclick={handleOpenBoard}
          title={TEXTS.OPEN_COMMUNICATION_BOARD}
        >
          💬
        </button>
      {/if}
      
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
    height: 120px; /* גובה קבוע לכל השורות */
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
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden; /* לחיתוך שוליים עגולות */
    border-radius: 12px; /* שוליים עגולות */
  }

  .task-image-wrapper :global(.task-image) {
    width: 100%;
    height: 100%;
  }

  .placeholder-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    font-size: 3rem;
  }

  .placeholder-image span {
    opacity: 0.3;
  }

  .task-content {
    flex-grow: 1;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
  }

  .task-number {
    min-width: 50px;
    padding: 0 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 800;
    color: #cbd5e1;
    flex-shrink: 0;
    transition: all 0.3s;
    line-height: 1;
  }

  .task-row-wrapper.active .task-number {
    color: var(--primary-accent, #6366f1);
    text-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  .task-row-wrapper.completed .task-number {
    color: var(--success-color, #22c55e);
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

  /* מצב בוטל (משימת שינוי) */
  .task-row-wrapper.cancelled .task-card {
    background: #fef2f2;
    border: 2px solid #fca5a5;
    opacity: 1;
    transform: scale(0.98);
  }

  .task-row-wrapper.cancelled .task-name {
    text-decoration: none;
    color: #991b1b;
  }

  .task-row-wrapper.cancelled .task-number {
    color: #dc2626;
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

  .change-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-bottom: 0.3rem;
    width: fit-content;
  }

  .change-badge.cancelled {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .change-badge.added {
    background: #fefce8;
    color: #ca8a04;
    border: 1px solid #fef08a;
  }

  .change-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .change-text {
    line-height: 1;
  }

  .comm-board-btn {
    background: #eef2ff;
    border: 2px solid var(--primary-accent, #6366f1);
    color: var(--primary-accent, #6366f1);
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-right: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comm-board-btn:hover {
    background: var(--primary-accent, #6366f1);
    transform: scale(1.1);
  }

  .comm-board-btn:hover {
    filter: brightness(110%);
  }
</style>
