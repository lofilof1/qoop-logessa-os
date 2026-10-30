"use client";
import { useEffect, useState } from "react";
import { type ProductProfile } from "@/lib/product-profile";
export function ProductProfileEditor() {
  const [open, setOpen] = useState(false),
    [p, setP] = useState<ProductProfile | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [materials, setMaterials] = useState(""),
    [heights, setHeights] = useState("");
  useEffect(() => {
    if (open && !p)
      fetch("/api/product-profile")
        .then((r) => r.json())
        .then((x) => {
          setP(x.data);
          setMaterials(
            x.data.materials
              .map(
                (m: { name: string; details: string }) =>
                  `${m.name} | ${m.details}`,
              )
              .join("\n"),
          );
          setHeights(x.data.heights.join(", "));
        })
        .catch(() => setMessage("Profil okunamadı."));
  }, [open, p]);
  const number = (key: keyof ProductProfile, label: string) => (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="any"
        value={p?.[key] === null ? "" : String(p?.[key] ?? "")}
        onChange={(e) =>
          setP((old) => ({
            ...old!,
            [key]: e.target.value === "" ? null : Number(e.target.value),
            confirmed: false,
          }))
        }
      />
    </label>
  );
  const text = (key: keyof ProductProfile, label: string) => (
    <label>
      {label}
      <input
        value={String(p?.[key] ?? "")}
        maxLength={key === "technicalNotes" ? 1000 : 300}
        onChange={(e) =>
          setP((old) => ({ ...old!, [key]: e.target.value, confirmed: false }))
        }
      />
    </label>
  );
  return (
    <section id="product-profile">
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          <strong>LOGESSA ürün ve baskı ayarları · bir kez tanımla</strong>
        </summary>
        <p>
          Herhangi bir üreticiye bağlantı kurulmaz. Panel, malzeme, süre ve
          fiyatlar boş başlar; yalnız kendi doğruladığın bilgiler kullanılır.
          Kaydetmek önceki profil sürümlerini silmez.
        </p>
        {p && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const body = {
                  ...p,
                  heights: heights
                    .split(/[,;]+/)
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map(Number),
                  materials: materials
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const [name, ...rest] = line.split("|");
                      return {
                        name: name.trim(),
                        details: rest.join("|").trim(),
                      };
                    }),
                };
                const r = await fetch("/api/product-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const x = await r.json();
                if (!r.ok) throw Error(x.error);
                setP(x.data);
                window.dispatchEvent(new Event("qoop-profile-updated"));
                setMessage(
                  "Profil sürümü kaydedildi. Listing malzemeleri güncellendi.",
                );
              } catch (e) {
                setMessage(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <details open>
              <summary>Listing tercihleri · bir kez tanımla</summary>
              <div className="columns">
                <label>
                  Hedef pazar
                  <select
                    value={p.targetMarket}
                    onChange={(e) =>
                      setP({
                        ...p,
                        targetMarket: e.target
                          .value as ProductProfile["targetMarket"],
                      })
                    }
                  >
                    {[
                      ["US", "ABD"],
                      ["UK", "Birleşik Krallık"],
                      ["CA", "Kanada"],
                      ["AU", "Avustralya"],
                      ["DE", "Almanya"],
                      ["unknown", "Henüz belirlenmedi"],
                    ].map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Gerçek satış biçimi
                  <select
                    value={p.saleForm}
                    onChange={(e) =>
                      setP({
                        ...p,
                        saleForm: e.target.value as ProductProfile["saleForm"],
                      })
                    }
                  >
                    <option value="unknown">Henüz doğrulanmadı</option>
                    <option value="physical-wallpaper">
                      Fiziksel duvar kâğıdı
                    </option>
                    <option value="physical-mural">Fiziksel mural</option>
                  </select>
                </label>
              </div>
              <p>
                İlan dili: İngilizce. Pazar seçimi üretim yeri beyanı değildir.
                Eksik satış biçimi taslak oluşturmayı engellemez; sonuç kontrol
                bekler.
              </p>
              <label>
                Marka üslubu
                <textarea
                  value={p.brandVoice}
                  maxLength={500}
                  onChange={(e) => setP({ ...p, brandVoice: e.target.value })}
                />
              </label>
              <label>
                Kullanılmayacak ifadeler · virgül veya satırla ayır
                <textarea
                  value={p.excludedPhrases}
                  maxLength={500}
                  onChange={(e) =>
                    setP({ ...p, excludedPhrases: e.target.value })
                  }
                />
              </label>
            </details>
            <div className="columns">
              {text("name", "Profil adı")}
              {text("shopName", "Mağaza adı")}
              <label>
                Ölçü birimi
                <select
                  value={p.unit}
                  onChange={(e) =>
                    setP({
                      ...p,
                      unit: e.target.value as "cm" | "in",
                      confirmed: false,
                    })
                  }
                >
                  <option value="cm">cm</option>
                  <option value="in">inç</option>
                </select>
              </label>
              {number("panelWidth", "Panel toplam genişliği")}
              {number("overlap", "Bindirme genişliği (yoksa doğrulanmış 0)")}
              {number("targetPpi", "Üretici hedef PPI")}
            </div>
            <label>
              Siparişte adet 1 neyi ifade eder?
              <select
                value={p.orderUnit}
                onChange={(e) =>
                  setP({
                    ...p,
                    orderUnit: e.target.value as ProductProfile["orderUnit"],
                    confirmed: false,
                  })
                }
              >
                <option value="unknown">Henüz belirlenmedi</option>
                <option value="panel">Bir panel</option>
                <option value="wall">Bir tam duvar siparişi</option>
              </select>
            </label>
            <label>
              Panel yükseklikleri — seçtiğin birimde, virgülle ayır
              <input
                value={heights}
                onChange={(e) => {
                  setHeights(e.target.value);
                  setP({ ...p, confirmed: false });
                }}
                placeholder="Örnek standart aktarılmaz; kendi seçeneklerin"
              />
            </label>
            <label>
              Malzemeler — her satıra İngilizce ad | doğrulanmış İngilizce
              özellik
              <textarea
                rows={4}
                value={materials}
                maxLength={4000}
                onChange={(e) => {
                  setMaterials(e.target.value);
                  setP({ ...p, confirmed: false });
                }}
              />
            </label>
            <details>
              <summary>Mural ölçüsü, özel ölçü ve bakım</summary>
              <div className="columns">
                {number("muralWidth", "Tam mural genişliği")}
                {number("muralHeight", "Tam mural yüksekliği")}
                {number("muralPanels", "Mural panel sayısı")}
                {text("customSizing", "Özel ölçü koşulları — English")}
                {text("printingInks", "Baskı mürekkebi — English")}
                {text("careInstructions", "Temizlik ve bakım — English")}
              </div>
            </details>
            <details>
              <summary>Numune, üretim, teslimat ve müşteri metinleri</summary>
              <div className="columns">
                <label>
                  Numune ölçü birimi
                  <select
                    value={p.sampleUnit || p.unit}
                    onChange={(e) =>
                      setP({
                        ...p,
                        sampleUnit: e.target.value as "cm" | "in",
                        confirmed: false,
                      })
                    }
                  >
                    <option value="cm">cm</option>
                    <option value="in">inç</option>
                  </select>
                </label>
                {number("sampleWidth", "Numune genişliği")}
                {number("sampleHeight", "Numune yüksekliği")}
                {text("samplePrice", "Numune fiyatı ve para birimi — English")}
                {text("productionLocation", "Gerçek üretim yeri — English")}
                {text(
                  "productionPartner",
                  "Üretim ortağı varsa adı — yoksa boş",
                )}
                {text("processing", "Üretim süresi — English")}
                {text("shipping", "Kargo süresi/ücreti/kapsamı — English")}
                {text("surface", "Uygun yüzey/kurulum — English")}
                {text("toolkit", "Paket içeriği ve numune istisnası — English")}
                {text("returns", "İade/hasar bildirimi — English")}
                {text(
                  "technicalNotes",
                  "Dosya, renk profili, kesim ve bindirme notları",
                )}
              </div>
            </details>
            <label className="check-line">
              <input
                type="checkbox"
                checked={p.confirmed}
                onChange={(e) => setP({ ...p, confirmed: e.target.checked })}
              />{" "}
              Bu teknik bilgileri kendi ürün/üretim koşullarıma göre doğruladım.
            </label>
            <button disabled={busy}>
              {busy ? "Kaydediliyor…" : "Ürün profilini kaydet"}
            </button>
          </form>
        )}
        <p role="status">{message}</p>
      </details>
    </section>
  );
}
