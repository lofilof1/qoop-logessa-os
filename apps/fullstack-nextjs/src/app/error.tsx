"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section>
      <h1>Verilere ulaşılamadı</h1>
      <p>PostgreSQL ve MinIO servislerinin çalıştığını kontrol edin.</p>
      <button onClick={reset}>Tekrar dene</button>
    </section>
  );
}
