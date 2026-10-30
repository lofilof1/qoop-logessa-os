"use client";
import { useState } from "react";
export function ReferenceLink({
  referenceId,
  designs,
}: {
  referenceId: string;
  designs: { id: string; title: string; code: string }[];
}) {
  const [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const res = await fetch("/api/research/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceId,
            designId: form.get("designId"),
            influence: form.get("influence"),
          }),
        });
        setMessage(
          res.ok ? "Tasarım ile ilişkilendirildi." : (await res.json()).error,
        );
      }}
    >
      <label>
        Tasarımın
        <select name="designId" required>
          {designs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} · {d.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bu kaynaktan alınan etki
        <select name="influence">
          <option value="palette">Renk ilişkisi</option>
          <option value="composition">Kompozisyon ilkesi</option>
          <option value="motif">Motif araştırması</option>
          <option value="technique">Teknik yaklaşım</option>
          <option value="seo">Arama dili</option>
        </select>
      </label>
      <button disabled={!designs.length}>Kaynağı bağla</button>
      <p role="status">{message}</p>
    </form>
  );
}
