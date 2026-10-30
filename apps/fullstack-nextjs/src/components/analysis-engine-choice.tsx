"use client";
import { useState, useRef, useEffect } from "react";
export function AnalysisEngineChoice() {
  const [provider, setProvider] = useState("local");
  const ref = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const reset = () => setProvider("local");
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  return (
    <fieldset ref={ref} style={{ border: 0, padding: 0, margin: "8px 0" }}>
      <label>
        Analiz yöntemi
        <select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="local">Bu Mac’te çalıştır · varsayılan</option>
          <option value="claude">Claude · yalnız bu işlem için</option>
        </select>
      </label>
      {provider === "claude" ? (
        <label className="check-line">
          <input type="checkbox" name="claudeConsent" value="true" required />
          Bu işlemde görselin Claude’a gönderilmesini ve hesap kullanım hakkımın
          kullanılmasını onaylıyorum.
        </label>
      ) : (
        <small>
          Görsel okuması ve metin üretimi yerel modelle yapılır. Claude veya
          ücretli API çağrısı yapılmaz.
        </small>
      )}
    </fieldset>
  );
}
