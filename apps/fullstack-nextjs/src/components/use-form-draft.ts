"use client";
import { useEffect, useRef } from "react";
const names = ["sku", "subject", "color", "style", "product", "material", "aiUsed", "profileMaterial"];
export function useListingFormDraft() {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const key = "qoop-listing-form-v1";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const field = (n: string) =>
      form.elements.namedItem(n) as
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    try {
      const old = JSON.parse(localStorage.getItem(key) || "{}");
      for (const n of names) {
        const el = field(n);
        if (el && typeof old[n] === "string")
          el.value = old[n].slice(
            0,
            el instanceof HTMLSelectElement
              ? 100
              : Math.max(0, el.maxLength) || 1000,
          );
      }
    } catch {}
    const save = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify(
            Object.fromEntries(names.map((n) => [n, field(n)?.value || ""])),
          ),
        );
      } catch {}
    };
    const input = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 700);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") save();
    };
    const reset = () => {
      if (timer) clearTimeout(timer);
      try {
        localStorage.removeItem(key);
      } catch {}
    };
    form.addEventListener("reset", reset);
    form.addEventListener("input", input);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", hide);
    return () => {
      if (timer) clearTimeout(timer);
      save();
      form.removeEventListener("reset", reset);
      form.removeEventListener("input", input);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  return ref;
}
