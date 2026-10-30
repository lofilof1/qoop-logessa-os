"use client";
import { useState } from "react";
import { composeStudio } from "@/lib/studio-composer";
import {
  currentCreativePlan,
  selected,
  stableBriefJson,
  type StudioData,
} from "@/lib/studio";
import { fieldOptions, type PersonalOption } from "@/lib/studio-options";
export function StudioComposer({
  brief,
  onChange,
  personalOptions,
  guided,
  setGuided,
  showFields,
  setShowFields,
  onProduction,
}: {
  brief: StudioData;
  onChange: (d: StudioData) => void;
  personalOptions: PersonalOption[];
  guided: boolean;
  setGuided: (v: boolean) => void;
  showFields: boolean;
  setShowFields: (v: boolean) => void;
  onProduction?: () => void;
}) {
  const [preserveAspect, setPreserveAspect] = useState(true),
    [preserveStyle, setPreserveStyle] = useState(false),
    [message, setMessage] = useState("");
  const [undo, setUndo] = useState<{
    before: StudioData;
    after: string;
  } | null>(null);
  const plan = currentCreativePlan(brief);
  return (
    <section>
      <h2>Kompozisyonu nasıl belirleyelim?</h2>
      <div className="studio-modes">
        <button
          type="button"
          className={!guided ? "selected" : "secondary"}
          onClick={() => setGuided(false)}
          aria-pressed={!guided}
        >
          Seçimleri kendim yapacağım
        </button>
        <button
          type="button"
          className={guided ? "selected" : "secondary"}
          onClick={() => setGuided(true)}
          aria-pressed={guided}
        >
          Ana motifi ben seçeyim, gerisini LOGESSA tamamlasın
        </button>
      </div>
      {guided && (
        <>
          <p>
            Çalışma türünü ve ana motifini belirle. LOGESSA; destekleri, renkleri,
            tekniği, yoğunluğu ve kompozisyonu birlikte önerip iki araç için
            prompt hazırlar.
          </p>
          <label>
            Ana motif
            <select
              value={brief.values.primary}
              onChange={(e) =>
                onChange({
                  ...brief,
                  values: { ...brief.values, primary: e.target.value },
                })
              }
            >
              {fieldOptions("primary", personalOptions).map((v) => (
                <option key={v}>{v}</option>
              ))}
              <option value="__other__">Diğer — kendim belirleyeceğim</option>
            </select>
          </label>
          {brief.values.primary === "__other__" && (
            <label>
              Özel ana motif
              <input
                maxLength={1000}
                value={brief.custom.primary || ""}
                onChange={(e) =>
                  onChange({
                    ...brief,
                    custom: { ...brief.custom, primary: e.target.value },
                  })
                }
              />
            </label>
          )}
          <details>
            <summary>Korunacak seçimler</summary>
            <label>
              <input
                type="checkbox"
                disabled={brief.mode === "pattern"}
                checked={brief.mode === "pattern" || preserveAspect}
                onChange={(e) => setPreserveAspect(e.target.checked)}
              />{" "}
              Seçtiğim tuval oranını koru ({selected(brief, "aspect")})
            </label>
            <label>
              <input
                type="checkbox"
                checked={preserveStyle}
                onChange={(e) => setPreserveStyle(e.target.checked)}
              />{" "}
              Paletimi ve sanatsal tekniğimi koru
            </label>
            <p>
              Çalışma adı, ana motif, fiziksel ölçüler, baskı hedefi ve ek
              taleplerin her zaman korunur.
            </p>
          </details>
          <label>
            Ek talebin / korunacak özellikler
            <textarea
              maxLength={5000}
              rows={2}
              value={brief.notes}
              onChange={(e) => onChange({ ...brief, notes: e.target.value })}
            />
          </label>
          <button
            type="button"
            disabled={!selected(brief, "primary").trim()}
            onClick={() => {
              try {
                const next = composeStudio(brief, {
                  preserveAspect,
                  preserveStyle,
                });
                setUndo({
                  before: structuredClone(brief),
                  after: stableBriefJson(next),
                });
                onChange(next);
                setMessage(
                  "Öneri uygulandı. ChatGPT ve Midjourney promptları aşağıda hazır.",
                );
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Seçimleri kontrol et.",
                );
              }
            }}
          >
            Kompozisyonu tamamla ve promptları hazırla
          </button>
          {undo && stableBriefJson(brief) === undo.after && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onChange(undo.before);
                setUndo(null);
                setMessage("Önceki seçimlerin geri yüklendi.");
              }}
            >
              Önceki seçimlerime dön
            </button>
          )}
          <p role="status">{message}</p>
          {brief.creativePlan && !plan && (
            <p>
              Seçimlerin değişti; aşağıdaki promptlar güncel seçimlerine göre
              yenilendi. Kompozisyonu tekrar tamamlatırsan elle değiştirdiğin
              seçimler korunur.
            </p>
          )}
          {plan && (
            <article>
              <strong>Kompozisyon önerim</strong>
              <p>{plan.explanation}</p>
              <p>
                {selected(brief, "primary")} · {selected(brief, "palette")} ·{" "}
                {selected(brief, "medium")} · doluluk %{brief.density} · sakin
                alan %{brief.quietArea}
              </p>
              <a href="#production" onClick={onProduction}>ChatGPT ve Midjourney promptlarına git →</a>
            </article>
          )}
          <button
            type="button"
            className="secondary"
            aria-expanded={showFields}
            onClick={() => setShowFields(!showFields)}
          >
            {showFields
              ? "Ayrıntılı seçimleri kapat"
              : "Önerilen seçimleri gör / düzenle"}
          </button>
          <small>
            {" "}
            Derslerdeki ilkelerden hazırlanmış yerel kompozisyon önerisidir; her
            tıklamada model veya API çağrısı yapılmaz. Görsel üretilmez;
            promptlar hazırlanır.
          </small>
        </>
      )}
    </section>
  );
}
