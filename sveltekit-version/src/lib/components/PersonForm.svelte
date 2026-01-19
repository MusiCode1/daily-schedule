<script lang="ts">
  import ImageUploader from './ImageUploader.svelte';
  import type { Person } from '$lib/types';

  // Props
  let {
    person = undefined,
    onsubmit,
    oncancel = undefined,
    compact = false
  }: {
    person?: Person | null;
    onsubmit: (data: { name: string; avatar: string }) => void;
    oncancel?: () => void;
    compact?: boolean;
  } = $props();

  // State - שימוש ב-derived כדי לעקוב אחרי שינויים ב-person
  let name = $state('');
  let avatar = $state('');

  // אתחול ועדכון ערכים כאשר person משתנה
  $effect(() => {
    if (person) {
      name = person.name;
      avatar = person.avatar;
    } else {
      name = '';
      avatar = '';
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (name.trim()) {
      onsubmit({ name: name.trim(), avatar });
    }
  }

  function handleCancel() {
    if (oncancel) {
      oncancel();
    }
  }
</script>

<form class="person-form" class:compact onsubmit={handleSubmit}>
  <div class="form-group">
    <label for="person-name">שם:</label>
    <input 
      id="person-name" 
      type="text" 
      bind:value={name} 
      placeholder="שם האדם" 
      required 
    />
  </div>

  <div class="form-group">
    <label for="person-avatar">תמונה:</label>
    <ImageUploader
      imageSrc={avatar || null}
      onchange={(src) => (avatar = src || '')}
      alt={name || 'תמונת איש'}
    />
  </div>

  <div class="form-actions">
    {#if oncancel}
      <button type="button" class="btn-cancel" onclick={handleCancel}>ביטול</button>
    {/if}
    <button type="submit" class="btn-submit">
      {person ? 'עדכן' : 'הוסף'}
    </button>
  </div>
</form>

<style>
  .person-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .person-form.compact {
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: #475569;
    font-size: 0.95rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .btn-submit {
    background: #6366f1;
    color: white;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  }

  .btn-submit:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
  }
</style>
