<script lang="ts">
  import { backupController } from '$lib/logic/backupController.svelte';
  import { TEXTS } from '$lib/services/language';
  import { fade } from 'svelte/transition';

  // רשימת גיבויים לשחזור
  let restoreFiles: any[] = $state([]);
  let isRestoreModalOpen = $state(false);
  let isRestoring = $state(false);

  async function handleBackup() {
      await backupController.performBackup();
  }

  async function handleRestoreClick() {
      isRestoring = true;
      restoreFiles = await backupController.getRestoreList();
      isRestoring = false;
      if (restoreFiles.length > 0) {
          isRestoreModalOpen = true;
      } else {
          alert(TEXTS.NO_BACKUPS_FOUND);
      }
  }

  async function confirmRestore(fileId: string) {
      if (confirm(TEXTS.RESTORE_CONFIRM)) {
          isRestoreModalOpen = false;
          await backupController.restoreFromFile(fileId);
      }
  }

  function handleClientIdSave() {
      backupController.saveLocalSettings();
      // היררכיה פשוטה: אם שינה ClientID, אולי כדאי לנתק ולהתחבר מחדש?
      if (backupController.isConnected) {
          alert('אנא התנתק והתחבר מחדש כדי להחיל את ה-Client ID החדש.');
      }
  }
</script>

<div class="google-drive-card">
  <div class="card-header">
      <div class="drive-icon">
          <!-- SVG של Google Drive או סתם ענן -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-9-4 9"/></svg>
      </div>
      <h3>{TEXTS.GOOGLE_DRIVE_TITLE}</h3>
  </div>

  <div class="card-content">
      {#if !backupController.isConnected}
          <div class="connect-section">
              <p>גבה את הנתונים שלך לענן וסנכרן בין מכשירים.</p>
              
              <button class="btn-google" onclick={() => backupController.signIn()}>
                 <span class="icon">G</span> {TEXTS.CONNECT_DRIVE}
              </button>

              <div class="advanced-settings">
                  <details>
                      <summary>{TEXTS.CLIENT_ID_LABEL}</summary>
                      <div class="input-group">
                          <input 
                              type="text" 
                              bind:value={backupController.customClientId} 
                              placeholder={TEXTS.CLIENT_ID_PLACEHOLDER}
                              onchange={handleClientIdSave}
                          />
                      </div>
                  </details>
              </div>
          </div>
      {:else}
          <div class="status-section" in:fade>
              <div class="user-info">
                  {#if backupController.userInfo?.photoLink}
                      <img src={backupController.userInfo.photoLink} alt="Avatar" class="g-avatar" />
                  {/if}
                  <div>
                      <span class="label">{TEXTS.CONNECTED_AS}</span>
                      <span class="value">{backupController.userInfo?.displayName || backupController.userInfo?.emailAddress || 'User'}</span>
                  </div>
              </div>

              <div class="actions-row">
                  <button class="btn-outline" onclick={() => backupController.signOut()}>{TEXTS.DISCONNECT_DRIVE}</button>
                  <button class="btn-primary" onclick={handleBackup} disabled={backupController.status === 'backing_up'}>
                      {backupController.status === 'backing_up' ? '...' : TEXTS.BACKUP_NOW}
                  </button>
              </div>

              <label class="toggle-row">
                  <input type="checkbox" bind:checked={backupController.isAutoBackupEnabled} onchange={() => backupController.saveLocalSettings()} />
                  <span>{TEXTS.AUTO_BACKUP}</span>
              </label>

              {#if backupController.lastBackupTime}
                  <div class="last-backup">
                      {TEXTS.LAST_BACKUP} {backupController.lastBackupTime.toLocaleString('he-IL')}
                  </div>
              {/if}

              {#if backupController.status === 'success'}
                  <div class="msg success">{TEXTS.BACKUP_SUCCESS}</div>
              {/if}
              {#if backupController.status === 'error'}
                  <div class="msg error">{backupController.errorMessage || TEXTS.ERROR_GENERIC}</div>
              {/if}

              <div class="restore-section">
                   <button class="btn-text" onclick={handleRestoreClick} disabled={isRestoring}>
                       {isRestoring ? '...' : TEXTS.RESTORE_FROM_BACKUP}
                   </button>
              </div>
          </div>
      {/if}
  </div>
</div>

{#if isRestoreModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (isRestoreModalOpen = false)}>
      <div class="modal-card">
          <h3>{TEXTS.RESTORE_FROM_BACKUP}</h3>
          <div class="backup-list">
              {#each restoreFiles as file}
                  <button class="backup-item" onclick={() => confirmRestore(file.id)}>
                      <span class="file-date">{new Date(file.modifiedTime).toLocaleString('he-IL')}</span>
                      <span class="file-name">{file.name}</span>
                  </button>
              {/each}
          </div>
          <button class="close-btn" onclick={() => isRestoreModalOpen = false}>{TEXTS.CANCEL}</button>
      </div>
  </div>
{/if}

{#if backupController.conflictState.isConflict}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" style="z-index: 2100;">
        <div class="modal-card warning">
            <h3 style="color: #c2410c;">⚠️ {TEXTS.CONFLICT_TITLE}</h3>
            <p>{TEXTS.CONFLICT_REMOTE_NEWER}</p>
            
            <div class="conflict-comparison">
                <div class="conflict-option remote">
                    <strong>{TEXTS.REMOTE_VERSION}</strong>
                    <span>{backupController.conflictState.remoteTime?.toLocaleString('he-IL')}</span>
                </div>
                <div class="conflict-option local">
                    <strong>{TEXTS.LOCAL_VERSION}</strong>
                    <span>{backupController.conflictState.localTime?.toLocaleString('he-IL') || 'לא ידוע'}</span>
                </div>
            </div>

            <div class="modal-actions" style="justify-content: space-between; margin-top: 1rem;">
                <button class="btn-conflict-remote" onclick={() => backupController.resolveConflict('remote')}>
                    {TEXTS.KEEP_REMOTE}
                </button>
                 <button class="btn-conflict-local" onclick={() => backupController.resolveConflict('local')}>
                    {TEXTS.KEEP_LOCAL}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
  .google-drive-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      max-width: 500px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .card-header {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;
      color: #334155;
  }
  
  .card-header h3 { margin: 0; font-size: 1.25rem; }
  .drive-icon { color: #6366f1; }

  .connect-section {
      text-align: center;
      display: flex; flex-direction: column; gap: 1rem;
  }

  .btn-google {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      background: #4285F4; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s;
  }
  .btn-google:hover { background: #3367D6; }
  .btn-google .icon { background: white; color: #4285F4; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }

  .user-info {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;
      background: #f8fafc; padding: 0.75rem; border-radius: 12px;
  }

  .g-avatar { width: 40px; height: 40px; border-radius: 50%; }
  .label { font-size: 0.85rem; color: #64748b; display: block; }
  .value { font-weight: 600; color: #1e293b; }

  .actions-row { display: flex; gap: 1rem; margin-bottom: 1rem; justify-content: space-between; }
  
  .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
  .btn-outline:hover { background: #f1f5f9; }
  
  .btn-primary { background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
  .btn-primary:active { transform: translateY(1px); }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

  .toggle-row {
      display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none;
      margin-bottom: 1rem; font-weight: 500; color: #475569;
  }
  
  .toggle-row input { width: 1.2rem; height: 1.2rem; }

  .last-backup {
      font-size: 0.9rem; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 0.5rem;
  }

  .msg { padding: 0.5rem; border-radius: 8px; margin-top: 0.5rem; font-size: 0.9rem; text-align: center; }
  .msg.success { background: #dcfce7; color: #166534; }
  .msg.error { background: #fee2e2; color: #991b1b; }

  .restore-section { margin-top: 1rem; text-align: left; }
  .btn-text { background: none; border: none; color: #6366f1; text-decoration: underline; cursor: pointer; font-size: 0.9rem; }

  .advanced-settings { margin-top: 1rem; font-size: 0.85rem; color: #94a3b8; text-align: right; }
  .advanced-settings summary { cursor: pointer; list-style: none; text-align: center; }
  .input-group input { width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; }

  /* Modal */
  .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;
  }
  .modal-card {
      background: white; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px;
      display: flex; flex-direction: column; gap: 1rem;
      max-height: 80vh;
  }
  .backup-list {
      display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto;
  }
  .backup-item {
      display: flex; justify-content: space-between; padding: 1rem;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      cursor: pointer; text-align: right;
  }
  .backup-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .close-btn { margin-top: 1rem; background: none; border: 1px solid #e2e8f0; padding: 0.5rem; border-radius: 8px; cursor: pointer; }
  
  .conflict-comparison { display: flex; flex-direction: column; gap: 0.5rem; background: #fff7ed; padding: 1rem; border-radius: 8px; border: 1px solid #fed7aa; }
  .conflict-option { display: flex; justify-content: space-between; font-size: 0.9rem; }
  .conflict-option strong { color: #555; }
  
  .btn-conflict-remote { background: #ea580c; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-weight: bold; cursor: pointer; }
  .btn-conflict-remote:hover { background: #c2410c; }
  
  .btn-conflict-local { background: white; border: 1px solid #d1d5db; color: #4b5563; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; }
  .btn-conflict-local:hover { background: #f3f4f6; }
</style>
