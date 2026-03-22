/**
 * PNPI — Cache IndexedDB pour mode hors-ligne.
 * Stocke les reponses API localement pour un acces offline.
 */

const DB_NAME = "pnpi-offline";
const DB_VERSION = 1;
const STORE_NAME = "api-cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheResponse(url: string, data: any, ttlMs: number = 5 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      url,
      data: JSON.stringify(data),
      expiresAt: Date.now() + ttlMs,
      cachedAt: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch {}
}

export async function getCachedResponse<T = any>(url: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(url);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const record = req.result;
        if (!record) { resolve(null); return; }
        if (Date.now() > record.expiresAt) { resolve(null); return; }
        resolve(JSON.parse(record.data) as T);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {}
}

/** Fetch with offline fallback */
export async function fetchWithCache(url: string, ttlMs?: number): Promise<any> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      await cacheResponse(url, data, ttlMs);
      return data;
    }
    throw new Error("Network error");
  } catch {
    // Fallback to cache
    const cached = await getCachedResponse(url);
    if (cached) return cached;
    throw new Error("Offline and no cache available");
  }
}
