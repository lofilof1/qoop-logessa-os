"use client";
import { useEffect, useRef } from "react";
// One request at a time, only while visible and work is pending.
export function useVisiblePolling(
  callback: () => Promise<void>,
  enabled: boolean,
  delay = 5000,
) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      running = false;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (!stopped && document.visibilityState !== "hidden")
        timer = setTimeout(tick, delay);
    };
    async function tick() {
      if (stopped || running || document.visibilityState === "hidden") return;
      running = true;
      try {
        await latest.current();
      } finally {
        running = false;
        schedule();
      }
    }
    const visibility = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState !== "hidden") schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    schedule();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, delay]);
}
