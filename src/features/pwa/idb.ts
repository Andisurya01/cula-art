"use client";

// Akses IndexedDB antrean ide offline (browser saja). Skema sama dengan public/studio-offline.html.

import { OFFLINE_IDEA_DB, OFFLINE_QUEUE_EVENT, type QueuedIdea } from "./offline-queue";

export function isQueueSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_IDEA_DB.name, OFFLINE_IDEA_DB.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_IDEA_DB.store)) {
        db.createObjectStore(OFFLINE_IDEA_DB.store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openQueueDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_IDEA_DB.store, mode);
    const request = run(tx.objectStore(OFFLINE_IDEA_DB.store));
    tx.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function notify() {
  window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

/** Isi mentah antrean (divalidasi `prepareQueue`). */
export async function readQueue(): Promise<unknown[]> {
  if (!isQueueSupported()) return [];
  return (await withStore<unknown[]>("readonly", (store) => store.getAll())) ?? [];
}

export async function addToQueue(item: QueuedIdea): Promise<void> {
  await withStore("readwrite", (store) => {
    store.add(item);
  });
  notify();
}

export async function removeFromQueue(id: string): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
  notify();
}

/** Id acak untuk satu ide offline (juga kunci idempoten `offlineId` di server). */
export function newOfflineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
