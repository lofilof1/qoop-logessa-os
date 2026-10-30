# Sprint 3 üretim worker sözleşmesi — TASLAK
Durum: uygulanmadı. Python servisi, queue veya çalışan üretim işi yoktur. Compose worker başlatmaz.

Önerilen Job v1: jobId (UUID), schemaVersion=1, designId, assetId, source {bucket,key,sha256}, operation (inspect|render_preview|tile|export_panels), parameters, outputPrefix, requestedAt.

Sonuç: jobId, status (queued|running|succeeded|failed), artifacts [{key,mime,bytes,sha256}], measurements, error {code,message,retryable}, startedAt, completedAt.

API dosya baytlarını kuyruğa koymaz; private S3 referansı iletir. Worker kısa süreli yetki kullanır. Aynı jobId tekrar çalıştırılabilir olmalı; çıktı atomik kaydedilmeli. Heartbeat, timeout, sınırlı retry, dead letter kuyruğu ve checksum doğrulaması Sprint 3 kabul koşullarıdır. PSD render, ICC/CMYK dönüşümü, panelleme, baskı DPI kabulü ve insan üretim onayı bu sprintte yoktur. Sprint 1 DPI değeri yalnızca dosyadaki metadata değeridir; baskıya uygunluk kanıtı değildir.
