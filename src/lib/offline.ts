// Offline layer: intercepts backend REST requests.
// GET -> network, cached in IndexedDB; on network failure the cached copy is returned.
// Writes while offline -> queued in IndexedDB and replayed in order once online.
import { get, set, del, keys, createStore } from "idb-keyval";

type Queued = { id: string; url: string; method: string; headers: Record<string, string>; body: string | null; at: number };

const cacheStore = createStore("pasichnyk-offline", "cache");
const queueStore = createStore("pasichnyk-queue", "queue");
const listeners = new Set<() => void>();
let installed = false;
let syncing = false;
let realFetch: typeof fetch;
let pendingCount = 0;

export type OfflineState = { online: boolean; pending: number; syncing: boolean };
export function getOfflineState(): OfflineState {
  return { online: typeof navigator === "undefined" ? true : navigator.onLine, pending: pendingCount, syncing };
}
export function subscribeOffline(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function emit() {
  listeners.forEach((l) => l());
}

function isRest(url: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return !!base && url.startsWith(base) && url.includes("/rest/v1/");
}

function headersToObj(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  new Headers(h).forEach((v, k) => (out[k] = v));
  return out;
}

async function refreshCount() {
  pendingCount = (await keys(queueStore)).length;
  emit();
}

async function currentToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function syncQueue() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  emit();
  try {
    const ids = ((await keys(queueStore)) as string[]).sort();
    const token = await currentToken();
    for (const id of ids) {
      const item = (await get(id, queueStore)) as Queued | undefined;
      if (!item) continue;
      const headers = { ...item.headers };
      if (token) headers["authorization"] = `Bearer ${token}`;
      try {
        const res = await realFetch(item.url, { method: item.method, headers, body: item.body });
        // 4xx = permanent error (e.g. duplicate) — drop it so the queue never blocks
        if (res.ok || (res.status >= 400 && res.status < 500)) await del(id, queueStore);
        else break;
      } catch {
        break; // still offline
      }
    }
  } finally {
    syncing = false;
    await refreshCount();
  }
}

export function installOfflineLayer() {
  if (installed || typeof window === "undefined" || !("indexedDB" in window)) return;
  installed = true;
  realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (!isRest(url)) return realFetch(input, init);

    if (method === "GET" || method === "HEAD") {
      try {
        const res = await realFetch(input, init);
        if (res.ok && method === "GET") {
          const text = await res.clone().text();
          const range = res.headers.get("content-range");
          set(url, { text, range, status: res.status }, cacheStore).catch(() => {});
        }
        return res;
      } catch (err) {
        const hit = (await get(url, cacheStore)) as { text: string; range: string | null; status: number } | undefined;
        if (!hit) throw err;
        const h = new Headers({ "content-type": "application/json" });
        if (hit.range) h.set("content-range", hit.range);
        return new Response(hit.text, { status: hit.status, headers: h });
      }
    }

    // Write requests
    const body = typeof init?.body === "string" ? init.body : null;
    const tryNetwork = navigator.onLine;
    if (tryNetwork) {
      try {
        return await realFetch(input, init);
      } catch {
        /* fall through to queue */
      }
    }
    const item: Queued = {
      id: `${Date.now().toString().padStart(15, "0")}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      method,
      headers: headersToObj(init?.headers),
      body,
      at: Date.now(),
    };
    await set(item.id, item, queueStore);
    await refreshCount();
    // Echo payload so optimistic UI can continue
    let echo: unknown = [];
    try {
      const parsed = body ? JSON.parse(body) : [];
      echo = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      /* ignore */
    }
    const wantsSingle = (item.headers["accept"] || "").includes("vnd.pgrst.object");
    return new Response(JSON.stringify(wantsSingle ? (echo as unknown[])[0] ?? {} : echo), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  window.addEventListener("online", () => {
    emit();
    void syncQueue();
  });
  window.addEventListener("offline", emit);
  setInterval(() => void syncQueue(), 60_000);
  void refreshCount().then(() => syncQueue());
}
