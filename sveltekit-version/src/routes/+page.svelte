<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import ImageDisplay from '$lib/components/ImageDisplay.svelte';
  import AddModal from '$lib/components/AddModal.svelte';
  import CelebrationModal from '$lib/components/CelebrationModal.svelte';
  import ListSwitcher from '$lib/components/ListSwitcher.svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import ListEditModal from '$lib/components/ListEditModal.svelte';
  import PeopleDisplay from '$lib/components/PeopleDisplay.svelte';
  import { listStore } from '$lib/stores/listStore.svelte';
  import { goto } from '$app/navigation';
  import type { List } from '$lib/types';
  import { TasksBoardController } from '$lib/logic/tasksBoard.svelte';
  import { ListsNavigationController } from '$lib/logic/listsNavigation.svelte';
  import { SessionController } from '$lib/logic/session.svelte';
  import { onMount } from 'svelte';
  import SplashScreen from '$lib/components/SplashScreen.svelte';
  import FloatingIframe from '$lib/components/FloatingIframe.svelte';
  import { TEXTS } from '$lib/services/language';

  // -- אתחול Controllers --
  const session = new SessionController();
  const nav = new ListsNavigationController();
  const board = new TasksBoardController();

  // עזר לגרירה/שחרור הנגזר מה-controller
  // שימוש ב-dnd manager ישירות מה-controller של הלוח
  const { dnd } = board;

  let isLoaded = $state(false);
  
  // State למודאל עריכת רשימה
  let isListEditModalOpen = $state(false);
  let editingListForModal: List | null = $state(null);

  onMount(() => {
    isLoaded = true;
  });

  $effect(() => {
    if (isLoaded && !session.currentUser) {
      goto('/login');
    }
  });
  
  // פונקציה לשמירת רשימה מעודכנת
  function handleSaveList(formData: { name: string; greeting: string; logo: string; title: string; description: string; peopleIds: string[] }) {
    if (!session.currentUser) return;
    
    if (editingListForModal) {
      listStore.updateList(session.currentUser.id, editingListForModal.id, {
        name: formData.name,
        greeting: formData.greeting,
        logo: formData.logo,
        title: formData.title,
        description: formData.description,
        peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
      });
    } else {
      const newListId = listStore.addList(session.currentUser.id, formData.name);
      if (newListId) {
        listStore.updateList(session.currentUser.id, newListId, {
          greeting: formData.greeting,
          logo: formData.logo,
          title: formData.title,
          description: formData.description,
          peopleIds: formData.peopleIds.length > 0 ? formData.peopleIds : undefined
        });
      }
    }
    isListEditModalOpen = false;
  }
</script>

{#if !isLoaded}
  <SplashScreen />
{:else if session.currentUser}
  <!-- מסך הלוח המלא -->
  <header>
    <div class="header-controls">
      <button class="icon-btn" onclick={() => board.toggleEditMode()} title={board.isEditMode ? 'סגור עריכה' : 'מצב עריכה'}>
        {board.isEditMode ? '🔓' : '🔒'}
      </button>
      
      {#if board.isEditMode}
        <button class="icon-btn settings-btn" onclick={() => goto('/settings')} title="הגדרות מתקדמות" transition:fade>
          ⚙️
        </button>
      {/if}
    </div>
    
    <div class="user-profile">
       <button class="avatar-circle" onclick={() => session.logout()} aria-label="החלף משתמש">
          {#if session.currentUser.avatar}
            <div class="avatar-image">
              <ImageDisplay 
                imageSrc={session.currentUser.avatar}
                alt={session.currentUser.name}
              />
            </div>
          {:else}
             <span>{session.currentUser.name[0]}</span>
          {/if}
       </button>
    </div>

    <div class="header-content">
      <!-- פנייה מגדרית -->
      <h1>
        {board.greeting}
        <span class="highlight-name">{session.currentUser.name}</span>
      </h1>
      <div class="subtitle">
        {session.currentUser.gender === 'boy' ? 'אתה אלוף!' : 'את אלופה!'}
      </div>
    </div>
  </header>

  <div class="task-list-container">
    <div class="tasks-center-wrapper">
      {#if nav.userLists.length > 0}
        <ListSwitcher 
          activeListId={nav.activeList?.id || ''} 
          listsData={nav.userLists}
          onchange={(e) => nav.switchList(e.listId)} 
        />
      {/if}
      
      {#if nav.activeList?.title || nav.activeList?.description}
        <ListHeader
          logo={nav.activeList.logo}
          title={nav.activeList.title}
          description={nav.activeList.description}
        />
      {/if}
      
      {#if nav.activeList?.peopleIds && nav.activeList.peopleIds.length > 0}
        <PeopleDisplay
          peopleIds={nav.activeList.peopleIds}
          isVisible={nav.activeList.isPeopleSectionVisible ?? true}
          ontoggle={() => board.togglePeopleSection()}
        />
      {/if}
      
      {#if board.isEditMode}
        <div class="list-actions-panel" transition:fade>
          <div class="panel-header">
            <span class="panel-icon">📋</span>
            <span class="panel-title">ניהול רשימה</span>
          </div>
          
          <div class="panel-actions">
            <button class="action-card primary" onclick={() => { editingListForModal = null; isListEditModalOpen = true; }}>
              <span class="action-icon">➕</span>
              <span class="action-label">רשימה חדשה</span>
            </button>
            
            {#if nav.activeList}
              <button class="action-card edit" onclick={() => { editingListForModal = nav.activeList || null; isListEditModalOpen = true; }}>
                <span class="action-icon">✏️</span>
                <span class="action-label">ערוך רשימה</span>
              </button>
              
              {#if !nav.activeList.isDefault}
                <button class="action-card visibility" onclick={() => { 
                  if (session.currentUser && nav.activeList) {
                    listStore.toggleListVisibility(session.currentUser.id, nav.activeList.id);
                  }
                }}>
                  <span class="action-icon">{nav.activeList.isHidden ? '👁️' : '🚫'}</span>
                  <span class="action-label">{nav.activeList.isHidden ? 'הצג רשימה' : 'הסתר רשימה'}</span>
                </button>
              {/if}
            {/if}
            
            <button class="action-card danger" onclick={() => nav.deleteCurrentList()}>
              <span class="action-icon">🗑️</span>
              <span class="action-label">מחק רשימה</span>
            </button>
            
            <button class="action-card warning" onclick={() => {
              if (confirm('האם אתה בטוח שברצונך לאפס את כל המשימות?')) {
                board.resetAllTasks();
              }
            }}>
              <span class="action-icon">🔄</span>
              <span class="action-label">אפס משימות</span>
            </button>
          </div>
        </div>
      {/if}

      {#each board.tasks as task, index (task.id)}
        <div
          class="drag-wrapper"
          animate:flip={{ duration: 300 }}
          in:fade={{ duration: 200 }}
          out:fade={{ duration: 200 }}
          ondragover={dnd.handleDragOver}
          ondragenter={(e: DragEvent) => dnd.handleDragEnter(e, index)}
          ondrop={(e: DragEvent) => dnd.handleDrop(e, index)}
          role="group"
        >
          <TaskRow
            {task}
            taskNumber={index + 1}
            isActive={index === board.activeTaskIndex}
            isEditMode={board.isEditMode}
            ontoggle={() => board.toggleTask(task.id)}
            ondelete={() => board.deleteTask(task.id)}
            onedit={() => board.openAddModal(task)}
            onopenboard={(url) => board.openCommunicationBoard(url)}
            ondragstart={(e: DragEvent) => dnd.handleDragStart(e, index)}
          />
        </div>
      {/each}
      
      {#if board.tasks.length === 0}
         <div class="empty-state">
            <p>אין משימות ברשימה זו.</p>
            {#if board.isEditMode}
              <p>לחץ על + כדי להוסיף.</p>
            {/if}
         </div>
      {/if}
    </div>
  </div>

  {#if board.isEditMode}
    <button class="floating-add-btn" onclick={() => board.openAddModal(null)} transition:fade>＋</button>
  {/if}

  <AddModal
    isOpen={board.isModalOpen}
    taskToEdit={board.taskToEdit}
    onclose={() => board.closeAddModal()}
    onsave={(data) => board.saveTask(data)}
  />

  <CelebrationModal
    isOpen={board.showCelebration}
    data={board.celebrationData}
    onclose={() => board.closeCelebration()}
  />
  
  <ListEditModal
    isOpen={isListEditModalOpen}
    editingList={editingListForModal}
    userId={session.currentUser?.id || ''}
    onclose={() => isListEditModalOpen = false}
    onsave={handleSaveList}
  />

  <!-- לוח תקשורת -->
  <FloatingIframe 
    bind:isVisible={board.iframeBoardVisible}
    bind:url={board.iframeBoardUrl}
    title={TEXTS.COMMUNICATION_BOARD}
  />
{/if}

<style>
  header {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    position: sticky;
    top: 0;
  }
  
  .header-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0;
    font-weight: 900;
    color: #333;
  }
  
  .highlight-name {
     background: linear-gradient(to left, var(--primary-accent), var(--secondary-accent));
     -webkit-background-clip: text;
     background-clip: text;
     -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 1rem;
    color: #4b5563;
    font-weight: bold;
  }

  .task-list-container {
    flex: 1;
    padding: 1rem 4.5rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  .tasks-center-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
  }

  .drag-wrapper {
    width: 100%;
    max-width: 600px;
    display: flex;
    justify-content: center;
  }

  .floating-add-btn {
    position: fixed;
    bottom: 1.5rem;
    left: 1.5rem;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--primary-accent),
      var(--secondary-accent)
    );
    color: white;
    border: none;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.5);
    font-size: 2.5rem;
    cursor: pointer;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

    @media (min-width: 600px) {
      header {
          flex-direction: column;
          align-items: center;
      }
    }

    .header-controls {
      position: absolute;
      top: 1rem;
      left: 1rem;
    }

    .icon-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .icon-btn:hover { opacity: 1; }

    .list-actions-panel {
      width: 100%;
      max-width: 600px;
      background: white;
      border-radius: 20px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 2px solid #e2e8f0;
      margin-top: 1rem;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f1f5f9;
    }

    .panel-icon {
      font-size: 1.5rem;
    }

    .panel-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
    }

    .panel-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 0.75rem;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.6rem 0.5rem;
      border: 2px solid;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .action-icon {
      font-size: 1.8rem;
      line-height: 1;
    }

    .action-label {
      text-align: center;
      line-height: 1.2;
      max-width: 100%;
    }

    .action-card.primary {
      border-color: #6366f1;
      color: #6366f1;
      background: #f5f7ff;
    }

    .action-card.primary:hover {
      background: #6366f1;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
    }

    .action-card.edit {
      border-color: #8b5cf6;
      color: #8b5cf6;
      background: #faf5ff;
    }

    .action-card.edit:hover {
      background: #8b5cf6;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
    }

    .action-card.visibility {
      border-color: #f59e0b;
      color: #f59e0b;
      background: #fffbeb;
    }

    .action-card.visibility:hover {
      background: #f59e0b;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
    }

    .action-card.danger {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
    }

    .action-card.danger:hover {
      background: #ef4444;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
    }

    .action-card.warning {
      border-color: #eab308;
      color: #92400e;
      background: #fefce8;
    }

    .action-card.warning:hover {
      background: #eab308;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(234, 179, 8, 0.3);
    }

    @media (max-width: 600px) {
      .panel-actions {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .action-card {
        padding: 0.75rem 0.5rem;
        font-size: 0.85rem;
      }
      
      .action-icon {
        font-size: 1.3rem;
      }
    }

    .user-profile {
      position: absolute;
      top: 0.8rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      z-index: 20; /* הבטחה שזה נשאר למעלה */
    }

    .avatar-circle {
      width: 56px; /* הוגדל מ-40px */
      height: 56px;
      background: #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      border: 3px solid white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      cursor: pointer;
      overflow: hidden;
      padding: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* מעבר קופצני */
      transform-origin: top right;
    }
    
    .avatar-circle:hover, .avatar-circle:active {
        transform: scale(2.2); /* זום דרמטי */
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 30;
    }
    
    .avatar-circle .avatar-image {
        position: absolute;
        width: 100%;
        height: 100%;
        inset: 0;
    }

    .avatar-circle :global(.image-display) {
        width: 100%;
        height: 100%;
        border-radius: 0;
    }
    
    .empty-state {
        text-align: center;
        color: #888;
        margin-top: 2rem;
        padding: 2rem;
        background: rgba(255,255,255,0.5);
        border-radius: 1rem;
    }
</style>
