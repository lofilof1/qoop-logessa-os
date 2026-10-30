"use client";
import {
  defaultSeamGrid,
  gridLines,
  seamGridPlan,
  snapGrid,
  gridSvg,
  type SeamGrid,
} from "@/lib/seam-grid";
export function SeamGridEditor({
  value,
  onChange,
  repeat,
}: {
  value?: SeamGrid;
  onChange: (g: SeamGrid) => void;
  repeat: string;
}) {
  const g = value || defaultSeamGrid(),
    lines = gridLines(g.step),
    plan = seamGridPlan(g);
  const toggle = (key: "leftRight" | "topBottom", n: number) =>
    onChange({
      ...g,
      [key]: g[key].includes(n)
        ? g[key].filter((v) => v !== n)
        : [...g[key], n].sort((a, b) => a - b),
    });
  const download = (kind: "svg" | "json") => {
    const blob = new Blob(
      [kind === "svg" ? gridSvg(g) : JSON.stringify(plan, null, 2)],
      { type: kind === "svg" ? "image/svg+xml" : "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qoop-seam-grid.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section id="seam-grid">
      <h2>Koordinatlara göre kenar eşleştirme</h2>
      <p>
        Karşılıklı tüm grid çizgilerindeki kenar çiftleri prompta otomatik
        eklenir: sağ–sol aynı Y, üst–alt aynı X. Birleşim yalnız nokta konumu
        değil, motif biçimi, renk, çizgi kalınlığı ve devam yönünü kapsar.
      </p>
      <details>
        <summary>Koordinat planını göster / düzenle</summary>
        <p>
          İç tuval 1000 × 1000 px. Başlangıç sol üst (0,0); X sağa, Y aşağı
          artar. Her çizginin adı ve konumu var. Turuncu eşler, motifin kenardan
          çıkıp karşı kenarda devam edeceği hedef noktaları gösterir.
        </p>
        <label>
          Grid aralığı
          <select
            value={g.step}
            onChange={(e) =>
              onChange(snapGrid(g, Number(e.target.value) as SeamGrid["step"]))
            }
          >
            <option value={100}>100 px · 10 × 10 hücre</option>
            <option value={50}>50 px · 20 × 20 hücre</option>
            <option value={200}>200 px · 5 × 5 hücre</option>
          </select>
        </label>
        <svg
          viewBox="-130 -100 1240 1230"
          role="img"
          aria-label="1000 piksel tuvalde X ve Y koordinatlı grid ve karşılıklı birleşim noktaları"
          style={{
            width: "100%",
            maxWidth: 740,
            height: "auto",
            background: "white",
          }}
        >
          <title>
            Koordinatlı planlama gridi; çizgiler üretilecek görsele eklenmez
          </title>
          {lines.map((l) => (
            <g key={l.index}>
              <path
                d={`M${l.x} 0V1000M0 ${l.x}H1000`}
                stroke={l.index % 5 === 0 ? "#91abc8" : "#d7e0eb"}
                strokeWidth={l.index % 5 === 0 ? 2 : 1}
              />
              <text
                x={l.x}
                y={-35}
                textAnchor="middle"
                fontSize={g.step === 50 ? 13 : 19}
              >
                {l.xId}
              </text>
              <text
                x={l.x}
                y={-12}
                textAnchor="middle"
                fontSize={g.step === 50 ? 12 : 17}
              >
                {l.x}
              </text>
              <text
                x={-12}
                y={l.x + 5}
                textAnchor="end"
                fontSize={g.step === 50 ? 13 : 18}
              >
                {l.yId} · {l.x}
              </text>
            </g>
          ))}
          <rect
            width={1000}
            height={1000}
            fill="none"
            stroke="#244f40"
            strokeWidth={4}
          />
          {(repeat === "Half-drop" || repeat === "Brick") && (
            <path
              d={repeat === "Half-drop" ? "M500 0V1000" : "M0 500H1000"}
              stroke="#356885"
              strokeDasharray="15 8"
              strokeWidth={3}
            />
          )}
          {[...plan.leftRight, ...plan.topBottom].map((p) => (
            <g key={p.id}>
              <title>
                {p.id}: {p.from.join(",")} ↔ {p.to.join(",")}
              </title>
              <path
                d={`M${p.from.join(" ")}L${p.to.join(" ")}`}
                stroke="#b5742c"
                strokeDasharray="8 14"
                opacity={0.55}
              />
              {[p.from, p.to].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={9} fill="#b5742c" />
              ))}
            </g>
          ))}
        </svg>
        <details>
          <summary>Birleşim noktalarını seç / koordinat listesini aç</summary>
          <div className="columns">
            <div>
              <strong>Sağ ↔ sol (aynı Y)</strong>
              {lines.slice(1, -1).map((l) => (
                <label className="check-line" key={l.index}>
                  <input
                    type="checkbox"
                    checked={g.leftRight.includes(l.x)}
                    onChange={() => toggle("leftRight", l.x)}
                  />
                  {l.yId} · (0,{l.x}) ↔ (1000,{l.x})
                </label>
              ))}
            </div>
            <div>
              <strong>Üst ↔ alt (aynı X)</strong>
              {lines.slice(1, -1).map((l) => (
                <label className="check-line" key={l.index}>
                  <input
                    type="checkbox"
                    checked={g.topBottom.includes(l.x)}
                    onChange={() => toggle("topBottom", l.x)}
                  />
                  {l.xId} · ({l.x},0) ↔ ({l.x},1000)
                </label>
              ))}
            </div>
          </div>
          <p>
            Köşeler: (0,0), (1000,0), (0,1000), (1000,1000) iki eksende
            devamlılık hedefler. 1000 tuval sınırıdır; piksel indisleri
            0–999’dur.
          </p>
        </details>
        {(repeat === "Half-drop" || repeat === "Brick") && (
          <p>
            {repeat === "Half-drop"
              ? "İki kolonlu half-drop supertile: komşu kolonda 500 px düşey faz farkı hedeflenir."
              : "İki satırlı brick supertile: komşu satırda 500 px yatay faz farkı hedeflenir."}{" "}
            Dış kenarlar yine aynı koordinatlarda eşleşir; bu yerleşim ayrıca
            kontrol edilmelidir.
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => download("svg")}
          >
            Grid şablonunu SVG indir
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => download("json")}
          >
            Koordinat planını indir
          </button>
        </div>
        <p>
          Grid değişiklikleri iki prompta da yansır. Çizgi, sayı ve işaretler
          sadece planlama içindir; tasarıma çizilmez. Görsel modelleri kesin
          piksel konumunu garanti etmez; sonuç 3 × 3 tekrar ve kenar kontrolü
          gerektirir. SVG’nin etiket payı dışarıdadır; tasarım alanı 1000 ×
          1000’dır.
        </p>
      </details>
    </section>
  );
}
