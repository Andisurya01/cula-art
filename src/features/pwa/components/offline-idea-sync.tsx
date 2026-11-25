"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/action-client";
import { createQuickIdea } from "@/features/ideas/actions";
import { isQueueSupported, readQueue, removeFromQueue } from "../idb";
import {
  classifyResult,
  OFFLINE_QUEUE_EVENT,
  prepareQueue,
  queueBadgeText,
  syncQueue,
  toQuickIdeaInput,
} from "../offline-queue";

const LOCK_NAME = "studio-offline-ideas";

/**
 * Dipasang di layout Studio: kirim antrean ide offline lewat createQuickIdea saat Studio dibuka dan saat
 * kembali online, dengan badge "N ide menunggu sinkron" (ketuk untuk kirim sekarang). Satu tab saja yang
 * mengirim (Web Locks); `offlineId` membuat kirim ulang tidak menggandakan ide.
 */
export function OfflineIdeaSync() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const running = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      setCount(prepareQueue(await readQueue()).valid.length);
    } catch {
      setCount(0);
    }
  }, []);

  const sync = useCallback(async () => {
    if (!isQueueSupported() || running.current || !navigator.onLine) return;
    running.current = true;
    const run = async () => {
      const report = await syncQueue(await readQueue(), {
        send: async (item) => classifyResult(await callAction(() => createQuickIdea(toQuickIdeaInput(item)))),
        remove: removeFromQueue,
      });
      if (report.synced.length > 0) {
        toast.success(`${report.synced.length} ide offline masuk Bank Ide.`);
        router.refresh();
      }
      if (report.dropped.length > 0) {
        toast.error(`${report.dropped.length} ide offline ditolak server: ${report.dropped.map((i) => i.title).join(", ")}`);
      }
    };
    try {
      if (navigator.locks) {
        // Tab lain sedang mengirim → lewati; antrean yang sama tidak dikirim dua kali.
        await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
          if (lock) await run();
        });
      } else {
        await run();
      }
    } catch (error) {
      console.warn("[pwa] sinkron ide offline gagal:", error);
    } finally {
      running.current = false;
      await refreshCount();
    }
  }, [refreshCount, router]);

  useEffect(() => {
    // Saat Studio dibuka: hitung antrean lalu kirim (di luar render pertama).
    const start = window.setTimeout(() => void refreshCount().then(sync), 0);
    const onOnline = () => void sync();
    const onChange = () => void refreshCount();
    window.addEventListener("online", onOnline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, onChange);
    return () => {
      window.clearTimeout(start);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onChange);
    };
  }, [refreshCount, sync]);

  const text = queueBadgeText(count);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => void sync()}
      title="Kirim sekarang"
      aria-live="polite"
      className="fixed top-2 left-1/2 z-50 inline-flex h-9 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-badge bg-card/95 px-3.5 text-caption font-medium text-warning shadow-sm ring-1 ring-border/70 backdrop-blur outline-hidden focus-visible:ring-3 focus-visible:ring-ring"
    >
      <CloudUpload className="size-3.5 shrink-0" aria-hidden />
      {text}
    </button>
  );
}
