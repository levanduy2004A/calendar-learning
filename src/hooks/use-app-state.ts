"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { getState, initStore, isStoreReady, subscribe } from "@/lib/store";
import { EMPTY_STATE, type AppState } from "@/lib/types";

export function useAppState(): { state: AppState; ready: boolean } {
  const state = useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);
  const ready = useSyncExternalStore(subscribe, isStoreReady, () => false);

  useEffect(() => {
    initStore();
  }, []);

  return { state, ready };
}

const blobCache = new Map<string, Blob | undefined>();
const blobListeners = new Set<() => void>();

function emitBlobs() {
  blobListeners.forEach((l) => l());
}

export function useObjectUrl(blob: Blob | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

export function useBlob(id: string | undefined, hasBlob: boolean | undefined) {
  return useSyncExternalStore(
    (onStoreChange) => {
      blobListeners.add(onStoreChange);
      if (id && hasBlob && !blobCache.has(id)) {
        void import("@/lib/files").then(({ getFile }) =>
          getFile(id).then((file) => {
            blobCache.set(id, file);
            emitBlobs();
          }),
        );
      }
      return () => {
        blobListeners.delete(onStoreChange);
      };
    },
    () => (id && hasBlob ? blobCache.get(id) : undefined),
    () => undefined,
  );
}
