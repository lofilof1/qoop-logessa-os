"use client";
import { useEffect, useRef, useState } from "react";
// Only small form fields, never files or secrets. A changed server baseline wins.
export function useLocalDraft<T>(
  key: string,
  value: T,
  restore: (v: unknown) => void,
) {
  const current = useRef(value),
    apply = useRef(restore),
    [ready, setReady] = useState(false);
  current.current = value;
  apply.current = restore;
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) apply.current(JSON.parse(s));
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    return () => {
      try {
        localStorage.setItem(key, JSON.stringify(current.current));
      } catch {}
    };
  }, [key, ready]);
  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try {
        localStorage.setItem(key, JSON.stringify(current.current));
      } catch {}
    };
    const timer = setTimeout(save, 700);
    const visibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [key, value, ready]);
}
