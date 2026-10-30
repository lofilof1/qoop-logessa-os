"use client";
import { useState } from "react";
import { briefSchema, type StudioData, stableBriefJson } from "@/lib/studio";
import { studioPrompts } from "@/lib/provider-prompts";
import { ProviderPrompts } from "./provider-prompts";
export function StudioProduction({ brief }: { brief: StudioData }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [record, setRecord] = useState<{ id: string; code: string } | null>(null),
    [identity, setIdentity] = useState("");
  const current = stableBriefJson(brief);
  const registered = identity === current ? record : null;
  const parsed = briefSchema.safeParse(brief);
  let prompts = { chatgpt: "", midjourney: "" },
    problem = "";
  try {
    if (parsed.success) prompts = studioPrompts(parsed.data);
    else problem = parsed.error.issues.map((x) => x.message).join(" ");
  } catch (e) {
    problem = e instanceof Error ? e.message : "Seçimleri kontrol et.";
  }
  return (
    <section id="production">
      <h2>1. Promptları al ve görselini üret</h2>
      <p>
        Seçimlerin iki araç için ayrı hazırlanır. Bu aşamada SKU oluşturulmaz.
      </p>
      {problem ? (
        <p role="alert">{problem}</p>
      ) : (
        <ProviderPrompts prompts={prompts} />
      )}
      <h2>2. Beğendiğin sonucu kaydet</h2>
      <p>
        Sonuç uygunsa “Üretildi” seçeneğini işaretle. SKU, kullanılan prompt,
        seçimler ve Midjourney kaynak bilgileri birlikte kaydedilir.
      </p>
      <form
        key={current}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setMessage("");
          const form = new FormData(e.currentTarget);
          try {
            const r = await fetch("/api/studio/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                brief,
                provider: form.get("provider"),
                sku: form.get("sku"),
                sourceUrl: form.get("sourceUrl"),
                jobId: form.get("jobId"),
                seed: form.get("seed"),
                produced: form.get("produced") === "on",
              }),
            });
            const x = await r.json();
            if (!r.ok) throw Error(x.error);
            setRecord(x);
            setIdentity(current);
            setMessage(
              x.reused
                ? "Bu üretim zaten kayıtlı; mevcut tasarım açılabilir."
                : `${x.code} kaydedildi. Görselini tasarım kaydına yükleyebilirsin.`,
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Kaydedilemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="columns">
          <label>
            Üretim aracı
            <select name="provider">
              <option value="MIDJOURNEY">Midjourney</option>
              <option value="CHATGPT">ChatGPT</option>
            </select>
          </label>
          <label>
            SKU kodu (boşsa otomatik)
            <input
              name="sku"
              placeholder="LOGESSA-…"
              pattern="[A-Z0-9][A-Z0-9-]{2,39}"
              maxLength={40}
            />
          </label>
        </div>
        <details>
          <summary>Kaynak bilgileri (isteğe bağlı)</summary>
          <label>
            Görsel / üretim bağlantısı
            <input name="sourceUrl" type="url" />
          </label>
          <div className="columns">
            <label>
              Job ID
              <input name="jobId" maxLength={200} />
            </label>
            <label>
              Seed
              <input name="seed" maxLength={100} />
            </label>
          </div>
        </details>
        <label className="check-line">
          <input type="checkbox" name="produced" required />
          Üretildi · sonucu beğendim ve tasarımlara kaydetmek istiyorum
        </label>
        <button disabled={busy || !!problem || !!registered}>
          {busy
            ? "Kaydediliyor…"
            : registered
              ? "Kaydedildi"
              : "Üretildi olarak kaydet"}
        </button>
        {registered && (
          <p>
            <a href={`/designs/${registered.id}`}>
              {registered.code} · Tasarımı aç ve görsel yükle →
            </a>
          </p>
        )}
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
