/**
 * Tiny promise-based IndexedDB key/value store used to cache the parsed playlist
 * text and enrichment JSON, so reopening the app is instant and works offline.
 * Falls back to an in-memory map where IndexedDB is unavailable (private mode).
 */

const DB_NAME = 'iptvbro';
const STORE = 'kv';
const VERSION = 1;

const memory = new Map<string, unknown>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return memory.get(key) as T | undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.set(key, value);
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // best-effort cache; ignore quota errors
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.delete(key);
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** A cached value with a timestamp, for TTL checks. */
export interface Cached<T> {
  at: number;
  data: T;
}

export async function idbGetFresh<T>(key: string, ttlMs: number): Promise<T | undefined> {
  const entry = await idbGet<Cached<T>>(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > ttlMs) return undefined;
  return entry.data;
}

export async function idbSetFresh<T>(key: string, data: T): Promise<void> {
  await idbSet(key, { at: Date.now(), data } satisfies Cached<T>);
}
