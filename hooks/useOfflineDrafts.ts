import { useState, useEffect, useCallback, useRef } from 'react';

// --- IndexedDB Wrapper ---
const DB_NAME = 'sosfu_offline';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

interface DraftEntry {
  id: string; // accountabilityId
  items: any[];
  images: { itemIndex: number; blob: Blob; filename: string }[];
  updatedAt: number;
  synced: boolean;
}

type SyncStatus = 'idle' | 'saved' | 'syncing' | 'synced' | 'error';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDraft(draft: DraftEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDraft(id: string): Promise<DraftEntry | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllUnsyncedDrafts(): Promise<DraftEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result || []).filter((d: DraftEntry) => !d.synced));
    req.onerror = () => reject(req.error);
  });
}

// --- Hook ---
export function useOfflineDrafts(accountabilityId: string | null) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Online/Offline listener
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Check pending drafts on mount
  useEffect(() => {
    getAllUnsyncedDrafts().then(drafts => setPendingCount(drafts.length)).catch(() => {});
  }, []);

  // Save draft (debounced)
  const saveLocalDraft = useCallback(
    (items: any[], images: { itemIndex: number; blob: Blob; filename: string }[] = []) => {
      if (!accountabilityId) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        try {
          await saveDraft({
            id: accountabilityId,
            items,
            images,
            updatedAt: Date.now(),
            synced: false,
          });
          setSyncStatus('saved');
          const drafts = await getAllUnsyncedDrafts();
          setPendingCount(drafts.length);
        } catch (e) {
          console.error('Erro ao salvar rascunho offline:', e);
          setSyncStatus('error');
        }
      }, 2000); // debounce 2s
    },
    [accountabilityId]
  );

  // Load saved draft
  const loadLocalDraft = useCallback(async (): Promise<DraftEntry | undefined> => {
    if (!accountabilityId) return undefined;
    try {
      return await getDraft(accountabilityId);
    } catch {
      return undefined;
    }
  }, [accountabilityId]);

  // Mark as synced (call after successful API save)
  const markSynced = useCallback(async () => {
    if (!accountabilityId) return;
    try {
      await deleteDraft(accountabilityId);
      setSyncStatus('synced');
      const drafts = await getAllUnsyncedDrafts();
      setPendingCount(drafts.length);
    } catch (e) {
      console.error('Erro ao limpar rascunho:', e);
    }
  }, [accountabilityId]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    saveLocalDraft,
    loadLocalDraft,
    markSynced,
  };
}
