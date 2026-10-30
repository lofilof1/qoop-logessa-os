"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function Form({
  kind,
  designId,
}: {
  kind: "design" | "sku" | "asset" | "source";
  designId?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (busy) return;
        setBusy(true);
        setMessage("");
        try {
          const f = new FormData(form);
          let body: BodyInit;
          let url: string;
          let headers: HeadersInit | undefined;
          if (kind === "asset") {
            body = f;
            url = `/api/designs/${designId}/assets`;
          } else {
            let data: Record<string, unknown> = Object.fromEntries(f.entries());
            if (kind === "sku") data.designId = designId;
            if (kind === "source") {
              data = JSON.parse(String(f.get("metadata")));
            }
            body = JSON.stringify(data);
            headers = { "Content-Type": "application/json" };
            url =
              kind === "source"
                ? `/api/designs/${designId}/sources`
                : `/api/${kind === "design" ? "designs" : "skus"}`;
          }
          const res = await fetch(url, { method: "POST", body, headers });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          setMessage(
            result.reused
              ? "Aynı dosya zaten kayıtlı; ikinci kopya oluşturulmadı."
              : "Kaydedildi.",
          );
          form.reset();
          if (kind === "design") router.push(`/designs/${result.id}`);
          else router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "İşlem başarısız");
        } finally {
          setBusy(false);
        }
      }}
    >
      {kind === "design" && (
        <>
          <label>
            Tasarım kodu
            <input
              name="code"
              placeholder="QP-0001"
              required
              pattern="[A-Z0-9][A-Z0-9-]{2,39}"
            />
          </label>
          <label>
            Başlık
            <input name="title" required maxLength={200} />
          </label>
          <label>
            Açıklama
            <textarea name="description" maxLength={5000} />
          </label>
        </>
      )}
      {kind === "sku" && (
        <>
          <label>
            SKU kodu
            <input name="code" placeholder="QP-0001-01" required />
          </label>
          <label>
            Ürün / varyant adı
            <input name="label" required />
          </label>
        </>
      )}
      {kind === "asset" && (
        <>
          <label>
            Master dosyası
            <input
              name="file"
              type="file"
              accept=".png,.tif,.tiff,.psd"
              required
            />
          </label>
          <p>
            PNG/TIFF: boyut ve DPI metadata. PSD: yalnızca arşiv. Varsayılan
            sınır 100 MB.
          </p>
        </>
      )}
      {kind === "source" && (
        <>
          <label>
            Midjourney metadata JSON
            <textarea
              name="metadata"
              rows={10}
              required
              defaultValue={JSON.stringify(
                {
                  prompt: "",
                  sourceUrl: "https://www.midjourney.com/",
                  jobId: "",
                  model: "",
                  seed: "",
                },
                null,
                2,
              )}
            />
          </label>
          <p>
            prompt zorunlu. Kaynak bağlantısı, jobId, model ve seed isteğe
            bağlıdır. Otomatik hesap bağlantısı yapılmaz.
          </p>
        </>
      )}
      <button disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
