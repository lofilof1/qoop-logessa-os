"use client";
import { useState } from "react";
export function ProviderPrompts({
  prompts,
}: {
  prompts: { chatgpt: string; midjourney: string };
}) {
  const [active, setActive] = useState<"chatgpt" | "midjourney">("chatgpt"),
    [message, setMessage] = useState("");
  return (
    <section className="prompt-panel">
      <div className="studio-tabs">
        {(["chatgpt", "midjourney"] as const).map((p) => (
          <button
            type="button"
            key={p}
            className={active === p ? "selected" : "secondary"}
            onClick={() => setActive(p)}
          >
            {p === "chatgpt" ? "ChatGPT promptu" : "Midjourney promptu"}
          </button>
        ))}
      </div>
      <textarea
        aria-label={`${active} promptu`}
        readOnly
        rows={8}
        value={prompts[active]}
      />
      <div className="actions">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompts[active]);
              setMessage("Prompt kopyalandı.");
            } catch {
              setMessage("Metni seçip kopyalayabilirsin.");
            }
          }}
        >
          Promptu kopyala
        </button>
        <a
          target="_blank"
          rel="noreferrer"
          href={
            active === "chatgpt"
              ? "https://chatgpt.com/"
              : "https://www.midjourney.com/imagine"
          }
        >
          {active === "chatgpt" ? "ChatGPT" : "Midjourney"} aç ↗
        </a>
      </div>
      <small>
        Aynı tasarım hedefi, araca uygun ayrı komutlar. İki model birebir aynı
        görseli üretmez. Promptu açılan sayfaya yapıştırıp gönder.
      </small>
      {active === "midjourney" && /--tile\b/.test(prompts.midjourney) && (
        <p>
          Devamlılık kontrolü: önce 3 × 3 tekrar önizlemesinde sağ–sol, üst–alt
          ve köşeleri incele. Upscale eşleşmeyi bozabilir; büyütme veya boyut
          değişikliğinden sonra tekrar kontrol et. Prompt, kenar testinin yerine
          geçmez.
        </p>
      )}
      {active === "midjourney" &&
        /Horizontal (?:mural|artwork) continuity:/.test(prompts.midjourney) && (
          <p>
            Yalnız yatay devamlılık hedeflenir. Panelleri tek masterdan kes;
            ayrı üretilen görsellerin veya aynı seed’in birleşeceği garanti
            değildir. Sağ ve sol kenarları yan yana önizleyerek kontrol et.
          </p>
        )}
      <p role="status">{message}</p>
    </section>
  );
}
