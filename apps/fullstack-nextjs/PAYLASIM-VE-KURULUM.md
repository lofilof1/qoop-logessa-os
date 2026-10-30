# LOGESSA kaynak kod paketi — 30 Ekim 2026

Bu paket kaynak kod aktarımı içindir; mevcut kullanıcı hesabının veya veritabanının yedeği değildir.

## İçindekiler
Next.js / TypeScript kaynakları; Prisma şeması, migration ve örnek seed; Docker yapılandırmaları; testler; LOGESSA logosu; derslerden türetilmiş tasarım seçenekleri, ders metinleri ve üretim/analiz kuralları; ürün açıklama standartları; kurulum belgeleri.

## Pakette olmayanlar
.env, API anahtarları, yerel bağlantı/oturum ayarları, .runtime, yüklenen tasarımlar, MinIO dosyaları, PostgreSQL verileri, özel eRank/CSV araştırma arşivi, analiz çıktıları, ekran görüntüleri, node_modules ve derlenmiş uygulama. Araştırma dataset dosyaları boş başlangıç verisiyle değiştirilmiştir. Kaynak içindeki eski kişisel ana klasör yolları /Users/USER ile anonimleştirilmiştir.

Ders metinleri ve marka kuralları bu pakete dahildir; bunları paylaşmak istemediğiniz bir alıcıya paketi göndermeyin. Bu kodun yeniden dağıtım hakkı için yeni bir açık kaynak lisansı eklenmemiştir. Bağımlılıkların kendi lisansları geçerlidir.

## Yeni Mac üzerinde
1. Docker Desktop (Apple Silicon için uygun sürüm) kurulu ve açık olsun.
2. Terminal ile bu klasöre girin.
3. `cp .env.example .env` çalıştırın. Örnek yerel parolaları kurulumunuza göre değiştirin; DATABASE_URL ve S3 değerlerini tutarlı güncelleyin. Gerçek .env dosyasını paylaşmayın.
4. `docker compose up --build -d` çalıştırın. Migration, örnek seed ve boş araştırma başlangıcı otomatik uygulanır.
5. `http://localhost:3000` adresini açın. Kontrol: `docker compose ps` ve `http://localhost:3000/api/health`.
6. Görsel analiz için ayrıca Ollama kurun, `ollama pull qwen3-vl:4b-instruct` çalıştırın ve Ollama servisini açık tutun. İlk model indirmesi internet ve disk alanı gerektirir. Varsayılan analiz yereldir; Claude zorunlu değildir. Model yoksa arayüz açılabilir ancak AI işleri tamamlanmaz.
7. Kendi CSV dosyalarınızı arayüzden yükleyin. Önceki makinenin ilan, görsel veya ölçümleri bu kaynak paketiyle taşınmaz.

Mevcut LOGESSA kurulumunun üzerinde ikinci kopyayı aynı anda başlatmayın: aynı yerel portlar çakışır. Kaynak paketi temiz yeni kurulum içindir; mevcut PostgreSQL/MinIO volume'larını silmeyin.

## Geliştirme kontrolleri
Node.js 22 ile `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm test`, `npm run build`. Docker kurulumunda bağımlılıklar imajın içinde yüklenir; Mac üzerinde ayrıca Node kurulması zorunlu değildir. Python üretim worker yalnız sözleşme taslağıdır; uygulanmış üretim servisi değildir. PSD arşivlenir.

Tam kullanım ve mevcut özelliklerin sınırları için README.md ve docs/ klasörüne bakın. Tarihli doğrulama belgeleri önceki çalışma ortamına aittir; yeni bilgisayarınızda otomatik doğrulanmış sonuç sayılmaz.
