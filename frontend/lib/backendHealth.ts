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

type BuildUrl = (path: string) => string;

let state: WakeState = { status: "idle", startedAt: null, elapsed: 0 };
const listeners = new Set<Listener>();

export function getWakeState(): WakeState {
  return state;
}

export function subscribeWake(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setWakeState(next: Partial<WakeState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export async function probeHealth(timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("/health", {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// Waits until the backend responds healthy (or the timeout elapses).
// Shows the wake overlay for the whole duration. Resolves true when ready.
export function waitForBackend(): Promise<boolean> {
  const startedAt = Date.now();
  setWakeState({ status: "waking", startedAt, elapsed: 0 });

  return new Promise((resolve) => {
    const check = async () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= WAKE_TIMEOUT_MS) {
        clearInterval(interval);
        setWakeState({ status: "failed", startedAt, elapsed });
        resolve(false);
        return;
      }
      setWakeState({ startedAt, elapsed });
      if (await probeHealth()) {
        clearInterval(interval);
        setWakeState({ status: "ready", startedAt, elapsed });
        window.setTimeout(() => {
          const cur = getWakeState();
          if (cur.status === "ready") {
            setWakeState({ status: "idle", startedAt: null, elapsed: 0 });
          }
        }, 800);
        resolve(true);
      }
    };
    const interval = window.setInterval(check, PROBE_INTERVAL_MS);
    check();
  });
}

export function retryWake(): Promise<boolean> {
  setWakeState({ status: "idle", startedAt: null, elapsed: 0 });
  return waitForBackend();
}