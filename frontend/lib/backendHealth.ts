export type WakeStatus = "idle" | "waking" | "ready" | "failed";

export interface WakeState {
  status: WakeStatus;
  startedAt: number | null;
  elapsed: number;
}

type Listener = (state: WakeState) => void;

const WAKE_TIMEOUT_MS = 180_000;
const PROBE_INTERVAL_MS = 3_000;
const PROBE_TIMEOUT_MS = 8_000;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

let state: WakeState = { status: "idle", startedAt: null, elapsed: 0 };
const listeners = new Set<Listener>();
let activeWait: Promise<boolean> | null = null;

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export function getWakeState(): WakeState {
  return state;
}

export function subscribeWake(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function setWakeState(next: Partial<WakeState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export async function probeHealth(timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl("/health"), {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Waits until the backend responds healthy (or the timeout elapses).
// Shows the wake overlay for the whole duration. Resolves true when ready.
export function waitForBackend(): Promise<boolean> {
  if (activeWait) return activeWait;

  const startedAt = Date.now();
  setWakeState({ status: "waking", startedAt, elapsed: 0 });

  activeWait = new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const finish = (healthy: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const elapsed = Date.now() - startedAt;
      setWakeState({ status: healthy ? "ready" : "failed", startedAt, elapsed });
      if (healthy) {
        setTimeout(() => {
          if (getWakeState().status === "ready") {
            setWakeState({ status: "idle", startedAt: null, elapsed: 0 });
          }
        }, 800);
      }
      resolve(healthy);
    };

    const check = async () => {
      if (settled) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= WAKE_TIMEOUT_MS) {
        finish(false);
        return;
      }
      setWakeState({ startedAt, elapsed });
      if (await probeHealth()) {
        finish(true);
        return;
      }
      if (!settled) timer = setTimeout(check, PROBE_INTERVAL_MS);
    };
    void check();
  });

  activeWait.then(
    () => { activeWait = null; },
    () => { activeWait = null; },
  );
  return activeWait;
}

export function retryWake(): Promise<boolean> {
  if (activeWait) return activeWait;
  return waitForBackend();
}
