<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import AddModal from '$lib/components/AddModal.svelte';
  import CelebrationModal from '$lib/components/CelebrationModal.svelte';
  import ListSwitcher from '$lib/components/ListSwitcher.svelte';
  import UserSelector from '$lib/components/UserSelector.svelte';
  import { goto } from '$app/navigation';
  import { TasksBoardController } from '$lib/logic/tasksBoard.svelte';
  import { ListsNavigationController } from '$lib/logic/listsNavigation.svelte';
  import { SessionController } from '$lib/logic/session.svelte';

  // -- Controllers Initialization --
  const session = new SessionController();
  const nav = new ListsNavigationController();
  const board = new TasksBoardController();

  // Helper for drag/drop derived from controller
  // We use the dnd manager directly from the board controller
  const { dnd } = board;

  // Active Index Calculation (UI Logic)
  // Can move to controller but simple enough here for view state
  let activeIndex = $derived(board.tasks.findIndex((t) => !t.isDone));

</script>

{#if !session.currentUser}
  <!-- מסך בחירת משתמש -->
  <UserSelector users={session.users} />
{:else}
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
            <img 
              src={session.currentUser.avatar} 
              alt={session.currentUser.name} 
              onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'} 
            />
          {/if}
          <!-- fallback initials or icon if needed -->
          {#if !session.currentUser.avatar}
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
      
      {#if board.isEditMode}
        <div class="edit-toolbar" transition:fade>
          <button onclick={() => nav.createNewList()}>➕ רשימה חדשה</button>
          <button onclick={() => nav.deleteCurrentList()} class="danger">🗑️ מחק רשימה</button>
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
            isActive={index === activeIndex}
            isEditMode={board.isEditMode}
            ontoggle={() => board.toggleTask(task.id)}
            ondelete={() => board.deleteTask(task.id)}
            onedit={() => board.openAddModal(task)}
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
    message={board.celebrationMessage}
    duration={5000}
    onclose={() => board.closeCelebration()}
  />
{/if}

<style>
  header {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(5px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    z-index: 10;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    position: relative;
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
    flex-grow: 1;
    padding: 1rem 4.5rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .tasks-center-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
  }
  
  :global(.list-switcher) {
     margin-bottom: 1rem;
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
      .edit-toolbar {
        flex-direction: row;
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

    .edit-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
      width: 100%;
      align-items: center;
      justify-content: center;
    }

    .edit-toolbar button {
      padding: 0.4rem 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      font-weight: 500;
    }

    .edit-toolbar button:hover {
      background: #e5e7eb;
    }

    .edit-toolbar button.danger {
      color: #dc2626;
      background: #fef2f2;
      border-color: #fecaca;
    }
    .edit-toolbar button.danger:hover {
      background: #fee2e2;
    }

    .user-profile {
      position: absolute;
      top: 0.8rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      z-index: 20; /* Ensure it stays on top */
    }

    .avatar-circle {
      width: 56px; /* Increased from 40px */
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
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy transition */
      transform-origin: top right;
    }
    
    .avatar-circle:hover, .avatar-circle:active {
        transform: scale(2.2); /* Dramatic zoom */
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 30;
    }
    
    .avatar-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
