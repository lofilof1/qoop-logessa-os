"use client";
import {WorkspaceNav} from "./workspace-nav";
import { SeamGridEditor } from "./seam-grid";
import { StudioComposer } from "./studio-composer";
import { useLocalDraft } from "./use-local-draft";
import { useState, useEffect } from "react";
import { fieldOptions, type PersonalOption } from "@/lib/studio-options";
import { StudioProduction } from "./studio-production";
import catalog from "../../data/lessons/catalog.json";
import {
  changeStudioField,
  chooseStudioValue,
  briefSchema,
  initialBrief,
  selected,
  studioWarnings,
  plannedCrop,
  intervention,
  type StudioData,
} from "@/lib/studio";
const modeNames = {
  pattern: "Seamless pattern",
  mural: "Mural",
  continuous: "Seamless mural",
  motif: "Tekil motif / motif seti",
  edit: "Mevcut görseli geliştirme planı",
};
function Scheme({ d }: { d: StudioData }) {
  const crop = plannedCrop(d);
  const treeX =
    selected(d, "composition") === "İki yandan çerçeveleme" ? 70 : 210;
  const heroY = 260 - d.heroHeight * 2;
  const h = d.horizon * 2.3;
  const ratio = selected(d, "aspect").split(":").map(Number);
  const aspect =
    ratio.length === 2 && ratio.every((n) => Number.isFinite(n) && n > 0)
      ? ratio[0] / ratio[1]
      : 1;
  const support = selected(d, "secondary");
  const extra = selected(d, "secondaryExtra");
  return (
    <svg
      viewBox="0 0 600 300"
      preserveAspectRatio="none"
      style={{ aspectRatio: String(aspect), height: "auto" }}
      role="img"
      aria-label="Kompozisyon planlama şeması"
    >
      <defs>
        <clipPath id="canvas">
          <rect width="600" height="300" />
        </clipPath>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="#9b693c" />
        </marker>
      </defs>
      <g clipPath="url(#canvas)">
        <rect width="600" height="300" fill="#f1eee3" />
        {d.mode === "pattern" ? (
          Array.from({ length: 6 }, (_, x) =>
            Array.from({ length: 5 }, (_, y) => {
              const half = selected(d, "repeat") === "Half-drop";
              const brick = selected(d, "repeat") === "Brick";
              const cx = x * 120 - 30 + (brick && y % 2 ? 60 : 0);
              const cy = y * 85 - 40 + (half && x % 2 ? 42.5 : 0);
              return (
                <g key={`${x}-${y}`}>
                  <rect
                    x={cx}
                    y={cy}
                    width="120"
                    height="85"
                    fill="none"
                    stroke="#b8c4b3"
                    strokeDasharray="3 4"
                  />
                  {Array.from(
                    { length: Math.max(1, Math.round(d.density / 12)) },
                    (_, i) => (
                      <ellipse
                        key={i}
                        cx={cx + 20 + ((i * 31) % 85)}
                        cy={cy + 20 + ((i * 19) % 50)}
                        rx={Math.max(5, d.heroPhysicalCm * 0.7)}
                        ry={Math.max(9, d.heroPhysicalCm * 1.1)}
                        transform={`rotate(${(i % 2 ? 1 : -1) * d.rotation} ${cx + 20 + ((i * 31) % 85)} ${cy + 20 + ((i * 19) % 50)})`}
                        fill={i % 2 ? "#aabd9d" : "#567c62"}
                      />
                    ),
                  )}
                </g>
              );
            }),
          )
        ) : d.mode === "motif" ? (
          <>
            <path
              d="M300 250 Q260 150 325 55"
              fill="none"
              stroke="#526e52"
              strokeWidth="4"
            />
            {Array.from({ length: 6 }, (_, i) => (
              <ellipse
                key={i}
                cx={i % 2 ? 320 : 275}
                cy={75 + i * 27}
                rx="32"
                ry="10"
                transform={`rotate(${i % 2 ? -30 : 30} ${i % 2 ? 320 : 275} ${75 + i * 27})`}
                fill="#789579"
              />
            ))}
          </>
        ) : (
          <>
            <path
              d={`M0 ${h + 30} Q120 ${h - 30} 250 ${h + 15} T600 ${h + 5} L600 300 L0 300Z`}
              fill="#d7dfca"
            />
            {selected(d, "scene") === "Manzara" &&
              [support, extra].includes("Göl") && (
                <ellipse
                  cx="415"
                  cy="245"
                  rx={d.waterArea * 3}
                  ry="38"
                  fill="#a5c4c5"
                />
              )}
            <rect
              x={treeX}
              y={heroY + 25}
              width="14"
              height={260 - heroY - 25}
              fill="#8c7760"
            />
            <ellipse
              cx={treeX + 7}
              cy={heroY + 25}
              rx={d.heroHeight * 0.75}
              ry={d.heroHeight * 0.65}
              fill="#6e8b6b"
            />
            {selected(d, "composition") === "İki yandan çerçeveleme" && (
              <>
                <rect
                  x="510"
                  y={heroY + 25}
                  width="12"
                  height={260 - heroY - 25}
                  fill="#8c7760"
                />
                <ellipse
                  cx="516"
                  cy={heroY + 25}
                  rx={d.heroHeight * 0.65}
                  ry={d.heroHeight * 0.6}
                  fill="#789579"
                />
              </>
            )}
            {[support, extra].includes("Ördek") && (
              <>
                <ellipse
                  cx="420"
                  cy="245"
                  rx={d.supportSize * 2}
                  ry={d.supportSize}
                  fill="#ece6d2"
                />
                <circle
                  cx={420 + d.supportSize * 2}
                  cy={245 - d.supportSize}
                  r={d.supportSize * 0.7}
                  fill="#ece6d2"
                />
              </>
            )}
            <line
              x1="0"
              y1={h}
              x2="600"
              y2={h}
              stroke="#85977c"
              strokeDasharray="5 5"
            />
            {d.mode === "continuous" && (
              <rect
                x={(crop.left / d.wallWidth) * 600}
                y="3"
                width={(crop.width / d.wallWidth) * 600}
                height="294"
                fill="#ddac3b"
                fillOpacity=".1"
                stroke="#a56c21"
                strokeWidth="3"
              />
            )}
          </>
        )}
        {["mural", "continuous", "edit"].includes(d.mode) && (
          <path
            d={
              selected(d, "flow") === "Sağdan sola"
                ? "M520 40 L100 40"
                : selected(d, "flow") === "Dikey yükselen"
                  ? "M550 250 L550 50"
                  : "M100 40 L520 40"
            }
            fill="none"
            stroke="#9b693c"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
        )}
      </g>
    </svg>
  );
}
export function Studio() {
  const [backup,setBackup]=useState<StudioData|null>(null);
  useEffect(()=>{try{const previous=JSON.parse(localStorage.getItem("qoop-studio-before-reopen")||"null");const parsed=briefSchema.safeParse(previous);if(parsed.success)setBackup(parsed.data);}catch{}},[]);
  const [step,setStep]=useState("brief");
  useEffect(()=>{const sync=()=>{if(location.hash==="#production")setStep("produce");else if(location.hash==="#seam-grid")setStep("refine");};sync();window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync);},[]);
  const [guided, setGuided] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [d, setD] = useState<StudioData>(initialBrief);
  useLocalDraft("qoop-studio-draft-v1", d, (raw) => {
    const p = briefSchema.safeParse(raw);
    if (p.success) {
      setD(p.data);
      setGuided(!!p.data.creativePlan);
    }
  });
  const [message, setMessage] = useState("");
  const [personalOptions, setPersonalOptions] = useState<PersonalOption[]>([]);
  useEffect(() => {
    fetch("/api/studio/options")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setPersonalOptions)
      .catch(() =>
        setMessage(
          "Kişisel seçenekler yüklenemedi; mevcut seçimlerin korunuyor.",
        ),
      );
  }, []);
  async function remember(fieldId: string, value: string) {
    if (!value.trim()) return;
    try {
      const r = await fetch("/api/studio/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, value }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setPersonalOptions((old) => [
        ...old.filter(
          (x) => !(x.fieldId === result.fieldId && x.value === result.value),
        ),
        result,
      ]);
      setMessage(
        "Özel seçenek kaydedildi; sonraki çalışmalarda listeden seçebilirsin.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Seçenek kaydedilemedi.");
    }
  }
  const [active, setActive] = useState("motif");
  const update = (key: keyof StudioData, value: unknown) =>
    setD((old) => changeStudioField(old, key, value));
  const warnings = studioWarnings(d);
  const isScene = ["mural", "continuous", "edit"].includes(d.mode);
  const slider = (
    key: keyof StudioData,
    label: string,
    min: number,
    max: number,
    unit: string,
    page: number,
  ) => (
    <label>
      {label}:{" "}
      <b>
        {String(d[key])}
        {unit}
      </b>
      <input
        type="range"
        min={min}
        max={max}
        value={d[key] as number}
        onChange={(e) => update(key, Number(e.target.value))}
      />
      <input
        aria-label={label + " özel değer"}
        type="number"
        min={min}
        max={max}
        value={d[key] as number}
        onChange={(e) => update(key, Number(e.target.value))}
      />
      <small>
        Planlama hedefi ·{" "}
        <a href={`/lessons/course.pdf#page=${page}`} target="_blank">
          PDF s.{page}
        </a>
      </small>
    </label>
  );
  return (
    <>
      <header>
        <p>DERSLERDEN TASARIM KARARLARINA</p>
        <h1>Tasarım atölyesi</h1>
        <p>Fikrini tanımla, kompozisyonu şekillendir ve iki araç için üretim promptunu hazırla.</p>
      </header>
      {backup&&<details><summary>Önceki atölye taslağını geri al</summary><p>Kayıtlı tasarımı açmadan önceki çalışma korunuyor.</p><button className="secondary" type="button" onClick={()=>{setD(backup);setGuided(!!backup.creativePlan);localStorage.removeItem("qoop-studio-before-reopen");setBackup(null);}}>Önceki çalışmaya dön</button></details>}
      <WorkspaceNav prefix="studio" value={step} onChange={setStep} items={[{id:"brief",label:"Çalışmayı tanımla",description:"Tür ve çalışma yöntemi"},{id:"refine",label:"Tasarımı düzenle",description:"Motif, renk ve kompozisyon"},{id:"produce",label:"Prompt ve üretim",description:"Kopyala, üret ve kaydet"}]}/>
      <div role="tabpanel" id="studio-panel-brief" aria-labelledby="studio-tab-brief" hidden={step!=="brief"}>
      <section>
        <div className="section-heading"><div><p className="eyebrow">BAŞLANGIÇ</p><h2>Ne tasarlamak istiyorsun?</h2></div></div>
        <div className="columns">
          <label>
            Çalışma adı
            <input
              value={d.title}
              maxLength={160}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
        </div>
        {d.mode === "pattern" && (
          <p>
            <strong>
              Seamless pattern: 1000 × 1000 px · sabit kare tuval.
            </strong>
          </p>
        )}
        <div className="studio-modes">
          {Object.entries(modeNames).map(([id, label]) => (
            <button
              key={id}
              className={d.mode === id ? "selected" : "secondary"}
              onClick={() => update("mode", id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <StudioComposer
        brief={d}
        onChange={setD}
        personalOptions={personalOptions}
        guided={guided}
        setGuided={setGuided}
        showFields={showFields}
        setShowFields={setShowFields}
        onProduction={()=>setStep("produce")}
      />
      <div className="workflow-actions"><span className="muted">Seçimlerin bu tarayıcıda otomatik korunur.</span><button type="button" onClick={()=>{if(guided)setShowFields(true);setStep("refine");}}>Tasarımı düzenlemeye devam et →</button></div>
      </div>
      <div role="tabpanel" id="studio-panel-refine" aria-labelledby="studio-tab-refine" hidden={step!=="refine"}>
      <div
        className="studio-layout"
        hidden={false}
        style={undefined}
      >
        <section>
          <div className="studio-tabs">
            {[
              ["motif", "Motifler"],
              ["style", "Renk ve stil"],
              ["composition", "Kompozisyon ve ölçek"],
              ["constraints", "Ek talepler"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={active === id ? "selected" : "secondary"}
                onClick={() => setActive(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="criteria-grid">
            {catalog.fields
              .filter(
                (f) =>
                  (f.group === active ||
                    (active === "style" && f.group === "collection") ||
                    (active === "constraints" && f.group === "revision")) &&
                  f.modes.includes(d.mode),
              )
              .map((f) => (
                <div key={f.id} className="studio-field">
                  <label>
                    {f.label}
                    <select
                      value={
                        f.id === "aspect" && d.mode === "pattern"
                          ? "1:1"
                          : d.values[f.id] || f.options[0]
                      }
                      disabled={f.id === "aspect" && d.mode === "pattern"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setD((old) => chooseStudioValue(old, f.id, value));
                      }}
                    >
                      {fieldOptions(f.id, personalOptions).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value="__other__">
                        Diğer — kendim belirleyeceğim
                      </option>
                    </select>
                  </label>
                  {d.values[f.id] === "__other__" &&
                    !(f.id === "aspect" && d.mode === "pattern") && (
                      <label>
                        Özel {f.label.toLowerCase()}
                        <input
                          value={d.custom[f.id] || ""}
                          maxLength={1000}
                          onBlur={(e) => remember(f.id, e.target.value)}
                          onChange={(e) =>
                            update("custom", {
                              ...d.custom,
                              [f.id]: e.target.value,
                            })
                          }
                        />
                        <small>
                          Yazıp alandan çıktığında kişisel seçeneklerine
                          eklenir.
                        </small>
                      </label>
                    )}
                </div>
              ))}
          </div>
          {active === "composition" && (
            <>
              <details>
                <summary>Ölçek ve yoğunluk hedeflerini düzenle</summary>
                <p>
                  Başlangıç değerleri ders örnekleridir; zorunlu tasarım veya
                  üretim standardı değildir.
                </p>
                {slider("density", "Motif doluluk hedefi", 1, 95, "%", 12)}
                {slider(
                  "quietArea",
                  "Ayrılmış sakin alan hedefi",
                  0,
                  90,
                  "%",
                  38,
                )}
                {d.mode === "pattern" ? (
                  <>
                    <label>
                      Tekrar genişliği (cm)
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={d.tileWidth}
                        onChange={(e) =>
                          update("tileWidth", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Tekrar yüksekliği (cm)
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={d.tileHeight}
                        onChange={(e) =>
                          update("tileHeight", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Ana motif fiziksel boy hedefi (cm)
                      <input
                        type="number"
                        min=".1"
                        max="300"
                        step=".1"
                        value={d.heroPhysicalCm}
                        onChange={(e) =>
                          update("heroPhysicalCm", Number(e.target.value))
                        }
                      />
                    </label>
                    {slider("rotation", "Rotasyon sınırı", 0, 180, "°", 40)}
                  </>
                ) : (
                  <>
                    {slider(
                      "heroHeight",
                      "Ana öğe / tuval yüksekliği",
                      1,
                      95,
                      "%",
                      38,
                    )}
                    {isScene && selected(d, "scene") === "Manzara" && (
                      <>
                        {slider(
                          "waterArea",
                          "Göl yüzey alanı hedefi",
                          0,
                          80,
                          "%",
                          38,
                        )}
                        {slider(
                          "horizon",
                          "Ufuk / üstten konum",
                          10,
                          90,
                          "%",
                          22,
                        )}
                      </>
                    )}
                    {slider(
                      "supportSize",
                      "Destek öğesi / tuval yüksekliği",
                      1,
                      30,
                      "%",
                      38,
                    )}
                    <p>
                      Bu yüzdeler farklı ölçüleri tanımlar; ağaç, göl ve ördek
                      için tek bir doğal oran standardı değildir. Manzara oran
                      alanları kullanıcı talebinden türetilmiş planlama
                      kontrolleridir.
                    </p>
                  </>
                )}
                <div className="columns">
                  <label>
                    Duvar eni (cm)
                    <input
                      type="number"
                      min="10"
                      max="2000"
                      value={d.wallWidth}
                      onChange={(e) =>
                        update("wallWidth", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Duvar yüksekliği (cm)
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={d.wallHeight}
                      onChange={(e) =>
                        update("wallHeight", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <label>
                  Üretici hedef PPI (bilinmiyorsa boş bırak)
                  <input
                    type="number"
                    min="20"
                    max="600"
                    value={d.targetPpi ?? ""}
                    onChange={(e) =>
                      update(
                        "targetPpi",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
                {d.mode === "continuous" && (
                  <>
                    <label>
                      Satın alınabilir kesit eni (cm)
                      <input
                        type="number"
                        min="10"
                        max={d.wallWidth}
                        value={d.cropWidth}
                        onChange={(e) =>
                          update("cropWidth", Number(e.target.value))
                        }
                      />
                    </label>
                    {slider(
                      "cropOffset",
                      "Kesitin yatay konumu",
                      0,
                      100,
                      "%",
                      22,
                    )}
                    <p>
                      Kesit alanları kullanıcı talebinden türetilmiştir; PDF’de
                      ayrı bir seamless mural standardı yoktur.
                    </p>
                  </>
                )}
              </details>
            </>
          )}
          {active === "revision" && (
            <article>
              <h3>Önerilen müdahale yolu</h3>
              <p>{intervention(d)}</p>
              <p>
                Bu öneri seçtiğin soruna dayanır. Yüklenmiş bir görsel üzerinde
                hata tespiti yapılmış değildir.
              </p>
            </article>
          )}
          {active === "constraints" && (
            <label>
              Ek talebin / korunacak özellikler
              <textarea
                rows={5}
                value={d.notes}
                maxLength={5000}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          )}
        </section>
        <div className="studio-preview">
          <details>
            <summary>Kompozisyon planını göster</summary>
            <Scheme d={d} />
            <p>
              Temsili şema: seçtiğin gerçek motifler çizilmez. Şekiller üretim
              dosyası, piksel analizi veya doğrulanmış seamless çıktı değildir.
            </p>
            {d.mode === "pattern" ? (
              <p>
                {selected(d, "repeat")} · {d.tileWidth} × {d.tileHeight} cm
                tekrar hedefi · {selected(d, "distribution")} seçimi kaydedilir.
              </p>
            ) : (
              <p>
                Ana öğe yüksekliği %{d.heroHeight} · destek öğesi yüksekliği %
                {d.supportSize}
                {d.mode === "continuous" &&
                  ` · ${plannedCrop(d).width} cm planlanan kesit`}
              </p>
            )}
            <p>
              Şema seçilen üretim tuvali oranında gösterilir; fiziksel duvar ve
              tekrar ölçüleri ayrıca briefte korunur.
            </p>
          </details>
          <section><details>
            <summary>Planlama kontrolleri ({warnings.length})</summary>
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <p>
              Seam: çalıştırılmadı · Görsel inceleme: yapılmadı · Fiziksel
              prova: yapılmadı
            </p>
            <p role="status">{message}</p>
          </details></section>
        </div>
      </div>
      {d.mode === "pattern" && (
        <SeamGridEditor
          value={d.seamGrid}
          repeat={selected(d, "repeat")}
          onChange={(grid) => update("seamGrid", grid)}
        />
      )}
      <div className="workflow-actions"><button type="button" className="secondary" onClick={()=>setStep("brief")}>← Çalışma bilgileri</button><button type="button" onClick={()=>setStep("produce")}>Promptları hazırla →</button></div>
      </div>
      <div role="tabpanel" id="studio-panel-produce" aria-labelledby="studio-tab-produce" hidden={step!=="produce"}>
      <div className="brief-summary"><span>{modeNames[d.mode]}</span><strong>{selected(d,"primary")}</strong><span>{selected(d,"medium")} · {selected(d,"palette")}</span><button type="button" className="text-button" onClick={()=>setStep("refine")}>Seçimleri düzenle</button></div>
      <StudioProduction brief={d} />
      </div>
    </>
  );
}
