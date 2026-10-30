"use client";
import { useEffect, useState } from "react";
type Observation = {
  observedAt: string;
  market: string;
  searches: string;
  clicks: string;
  competition: string;
  ctr: string;
  notes: string;
};
type Item = {
  term: string;
  category: string;
  priority: number;
  status: string;
  reason: string;
  tagEligible: boolean;
  historical: Record<string, unknown> | null;
  observations: Observation[];
  _count: { observations: number };
};
export function KeywordWatch() {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<Item[]>([]),
    [q, setQ] = useState(""),
    [priority, setPriority] = useState("1"),
    [message, setMessage] = useState("");
  async function load() {
    const r = await fetch(
      `/api/listing/watch?q=${encodeURIComponent(q)}&priority=${priority}`,
    );
    if (!r.ok) throw Error("Takip listesi okunamadı.");
    setItems((await r.json()).items);
  }
  useEffect(() => {
    if (open) load().catch((e) => setMessage(e.message));
  }, [open, priority]);
  const csv = `/api/listing/watch?csv=1&q=${encodeURIComponent(q)}&priority=${priority}`;
  return (
    <section>
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          <strong>eRank kelime takibi ve manuel veri girişi</strong>
        </summary>
        <p>
          52 başlangıç kelimesi; öncelik satış garantisi değildir. Önce 1. grubu
          kontrol et. Araştırma ifadesi 20 karakteri aşabilir; Etsy tag sınırı
          ayrıca gösterilir. Eski değerler 16 Ekim 2026 arşivinden gelir; gerçek
          ölçüm tarihi doğrulanmamıştır.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load().catch((e) => setMessage(e.message));
          }}
        >
          <div className="columns">
            <label>
              Kelime ara
              <input value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <label>
              Öncelik
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="1">1 — Önce kontrol et</option>
                <option value="2">2 — Tasarıma göre</option>
                <option value="3">3 — Deneme / geniş</option>
                <option value="">Tümü</option>
              </select>
            </label>
          </div>
          <button>Ara</button> <a href={csv}>Görünen listeyi CSV indir</a>
        </form>
        <p role="status">{message}</p>
        {items.map((item) => (
          <KeywordRow key={item.term} item={item} reload={load} />
        ))}
        <details>
          <summary>Kendi araştırma kelimeni ekle</summary>
          <WatchForm reload={load} />
        </details>
      </details>
    </section>
  );
}
function WatchForm({
  reload,
  item,
}: {
  reload: () => Promise<void>;
  item?: Item;
}) {
  const [msg, setMsg] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const r = await fetch("/api/listing/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "watch", ...v }),
          });
          const x = await r.json();
          if (!r.ok) throw Error(x.error);
          setMsg("Kaydedildi.");
          await reload();
        } catch (e) {
          setMsg(String(e));
        }
      }}
    >
      <div className="columns">
        <label>
          Kelime
          <input
            name="term"
            required
            maxLength={120}
            defaultValue={item?.term}
            readOnly={!!item}
          />
        </label>
        <label>
          Aile / kategori
          <input
            name="category"
            defaultValue={item?.category || "özel"}
            required
            maxLength={40}
          />
        </label>
        <label>
          Öncelik
          <select name="priority" defaultValue={item?.priority || 2}>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </label>
        <label>
          Takip
          <select name="status" defaultValue={item?.status || "active"}>
            <option value="active">Aktif</option>
            <option value="paused">Beklemede</option>
          </select>
        </label>
      </div>
      <label>
        Takip nedeni
        <input name="reason" maxLength={500} defaultValue={item?.reason} />
      </label>
      <button>Kaydet</button>
      <p role="status">{msg}</p>
    </form>
  );
}
function KeywordRow({
  item,
  reload,
}: {
  item: Item;
  reload: () => Promise<void>;
}) {
  const [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Observation[] | null>(null);
  const latest = item.observations[0];
  const h = item.historical || {};
  return (
    <details style={{ margin: "12px 0" }}>
      <summary>
        {item.term} · {item.category} ·{" "}
        {latest
          ? `${latest.observedAt} / ${latest.market}`
          : "Yeni ölçüm bekliyor"}
        {item.status === "paused" ? " · Beklemede" : ""}
      </summary>
      <p>{item.reason}</p>
      <p>
        {item.tagEligible
          ? "Etsy tag uzunluğuna uygun."
          : "20 karakteri aşar: araştırma ifadesi; doğrudan Etsy tag olarak kullanma."}
      </p>
      <p>
        Arşiv (güncel değil): arama {String(h.aylik_arama ?? "—")} · rekabet{" "}
        {String(h.rakip_ilan ?? "—")}
      </p>
      {latest && (
        <p>
          Son kayıt: arama {latest.searches || "—"} · tıklama{" "}
          {latest.clicks || "—"} · rekabet {latest.competition || "—"} · CTR{" "}
          {latest.ctr || "—"}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const values = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const r = await fetch("/api/listing/watch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...values, term: item.term }),
            });
            const x = await r.json();
            if (!r.ok) throw Error(x.error);
            setMsg(
              x.reused
                ? "Bu ölçüm zaten kayıtlı."
                : "Ölçüm kaydedildi. US verileri yeni listing taslaklarında kullanılacak.",
            );
            setHistory(null);
            await reload();
          } catch (e) {
            setMsg(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="columns">
          <label>
            eRank kontrol tarihi
            <input
              type="date"
              name="observedAt"
              required
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Pazar
            <select name="market">
              <option value="US">US</option>
              <option value="UK">UK</option>
              <option value="CA">CA</option>
              <option value="AU">AU</option>
              <option value="Global">Global</option>
            </select>
          </label>
          {[
            ["searches", "Ortalama arama"],
            ["clicks", "Ortalama tıklama"],
            ["competition", "Rekabet / ilan"],
            ["ctr", "CTR (%)"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                maxLength={20}
                placeholder="Örn. 250 veya <20"
              />
            </label>
          ))}
        </div>
        <p>
          eRank ekranındaki ortalama değerleri yaz. Bilinmeyeni boş bırak; sıfır
          gerçek sıfırdır. Binlik ayırıcı kullanma. US dışındaki ölçümler ayrı
          saklanır, US listing sıralamasına karıştırılmaz.
        </p>
        <label>
          Not / veri dönemi
          <input name="notes" maxLength={1000} />
        </label>
        <button disabled={busy}>
          {busy ? "Kaydediliyor…" : "Ölçümü kaydet"}
        </button>
        <p role="status">{msg}</p>
      </form>
      <details
        onToggle={async (e) => {
          if (e.currentTarget.open && !history) {
            try {
              const r = await fetch(
                `/api/listing/watch?history=${encodeURIComponent(item.term)}`,
              );
              if (!r.ok) throw Error();
              setHistory(await r.json());
            } catch {
              setMsg("Geçmiş okunamadı.");
            }
          }
        }}
      >
        <summary>Ölçüm geçmişi ({item._count.observations})</summary>
        {history?.map((o) => (
          <p key={o.observedAt + o.market}>
            {o.observedAt} · {o.market} · arama {o.searches || "—"} · tıklama{" "}
            {o.clicks || "—"} · rekabet {o.competition || "—"} · CTR{" "}
            {o.ctr || "—"} · {o.notes}
          </p>
        ))}
      </details>
      <details>
        <summary>Öncelik ve takip ayarları</summary>
        <WatchForm item={item} reload={reload} />
      </details>
    </details>
  );
}
