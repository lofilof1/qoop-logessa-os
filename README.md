# Qoop & Logessa · Unified Wallpaper OS

Uçtan uca duvar kağıdı / mural e-ticaret işletim sistemi. Tasarım üretiminden yapay zekâ kalite kontrolüne (QDS), 8-temalı canlı HTML5 Canvas mockup motorundan Etsy API v3 entegrasyonu, envanter yönetimi ve eylemli pazar radarına kadar tüm süreci tek çatı altında toplar.

---

## 📁 Depo Mimarisi

```text
qoop-logessa-os/
├── apps/
│   ├── unified-platform/         # Canlı çalışan çok-iş-parçacıklı (Threading) web platformu & API sunucusu (~23 MB RAM)
│   │   ├── index.html            # 9 sekmeli hepsi-bir-arada web paneli (Multi-Shop, 3D Perspektif Prova, RAM Kalkanı)
│   │   ├── serve.py              # Çoklu mağaza Etsy OAuth 2.0 PKCE, 429 Retry, Envanter, Telemetri ve .env API sunucusu
│   │   ├── shops.json            # Çoklu Etsy mağaza profilleri (Logessa Murals, Qoop Patterns vb.)
│   │   ├── listings.json         # Mağaza bazlı yerel ilan ve envanter veritabanı
│   │   ├── .env.example          # Örnek konfigürasyon dosyası
│   │   └── img/                  # 68 adet yüksek çözünürlüklü oda WebP şablonu (std, da, bh, jp, ws, ml, fc)
│   └── fullstack-nextjs/         # Kurumsal Next.js 16 + TypeScript + Prisma + Lazy Docker Profile altyapısı
│       ├── compose.yaml          # 2GB RAM dostu mem_limit ve `heavy` profilli Postgres, MinIO, App, Worker orkestrasyonu
│       ├── prisma/schema.prisma  # 30+ veritabanı modeli (Design, SKU, Listing, Asset, Keyword vb.)
│       └── src/                  # Next.js App Router API rotaları ve bileşenleri
└── sources/
    ├── qoop-etsy-artifact/       # Orijinal QDS kalite motoru ve Playwright testleri
    └── logessa-artifact/         # Orijinal Logessa Claude Artifact kaynak kodları
```

---

## 🚀 Temel Modüller & Yetenekler

1. **Stüdyo & Desen Masası:**
   - 3 hazır lüks duvar kağıdı şablonu (*Chinoiserie Peony, Art Deco Scallop, Vintage Botanical Forest*) veya sürükle-bırak dosya yükleme.
   - Midjourney v6.1 (`--ar 4:3`, `--tile`) ve ChatGPT için anında prompt türetme.

2. **QDS (Qoop Design Score) & Baskı QC:**
   - %96 onay skoru ile otomatik `RELEASE / REVISE` kararı.
   - İnce dal, kuru filiz ve pampas otu baskı riski filtresi.
   - Resmi SKU üretimi (`CH-2026-M04`).

3. **Canlı 8-Temalı Mockup Motoru (HTML5 Canvas):**
   - Gerçek oda şablonlarının yeşil duvarlarına perspektif ve ışık haritalamasıyla anlık giydirme.
   - 7 Dekor Teması: *Standart, Dark Academia, Boho Minimal, Japandi, Western, Modern Luxury, French Country*.
   - Zoom, Shade (Gölge), Işık ve Dikişli Tekrar (Seamless Tile) ayarları.
   - Tek tıkla yüksek çözünürlüklü 8'li Etsy oda kontakt paftası (`.PNG`) oluşturma ve indirme.

4. **Etsy SEO, Dil Kalkanı & Canlı Arama Motoru:**
   - **Canlı Etsy Alıcı Arama Önerileri (Live Autosuggest):** Halka açık Etsy arama API'si üzerinden alıcıların arama çubuğundaki gerçek zamanlı trendlerini anlık çeker; tek tıkla 13 etikete veya başlığa aktarır.
   - **Fikri Mülkiyet & Telif Kalkanı (Trademark IP Shield):** Disney, Marvel, Harry Potter, Lego, Pokemon, Barbie vb. 35+ tescilli markayı gerçek zamanlı tarar ve mağazanın kapatılmasını önler.
   - 140 karakter sayaçlı İngilizce satış başlığı.
   - 13 adet, 20 karakteri aşmayan, yüksek hacimli etiketler.
   - Asılsız ve riskli iddia filtresi (`non-toxic`, `hand-made`, `AI-free`, `fireproof`, `100% organic` taraması).

5. **Çoklu Etsy Mağazası (Multi-Shop Hub) & Etsy API v3 Entegrasyonu:**
   - **Çoklu Mağaza Profilleri (`shops.json`):** *Logessa Wall Murals* ve *Qoop Studio Patterns* başta olmak üzere sınırsız sayıda Etsy mağazasını ayrı niş, varsayılan fiyat ve ayrı OAuth 2.0 PKCE token (`etsy_tokens_<id>.json`) oturumlarıyla yönetme; üst bardan anlık aktif mağaza geçişi.
   - **Dayanıklı API İstemcisi:** Token süresi dolmadan 180 sn önce otomatik arka plan yenileme (Proactive Token Refresh) ve `HTTP 429 / 5xx` hız limitlerine karşı `Retry-After` destekli üstel bekleme (Exponential Backoff).
   - **Kalkanlı Tek Tıkla Yayın (`POST /api/etsy/publish`):** Başlık, açıklama ve 13 etiketi IP + Uyumluluk Kalkanından geçirerek seçili mağazaya `DRAFT` veya `ACTIVE` olarak gönderir.

6. **Canlı Sipariş & 3D Perspektif + Gölge Derinlikli Müşteri Duvar Provası:**
   - Gelen siparişler, müşteri ebatları (Peel & Stick vs Traditional) ve net kâr analitiği.
   - **$12 \times 12$ Alt-Bölünmüş 3D Perspektif Mesh:** Müşterinin yüklediği gerçek oda fotoğrafına (veya mimari prova odasına) 4 köşe piniyle (fare + mobil dokunmatik destekli) gerçek perspektif projeksiyon giydirme.
   - **Ambient Occlusion & Işık Motoru:** Tavan, süpürgelik ve köşe gölge derinliği (AO), pencere yönlü doğal ışık gradyanı, duvar dokusu (`multiply`) harmanlama ve pin izleri gizlenmiş temiz VIP onay `.PNG` çıktısı.

7. **Pazar Radarı & Eylemli Analitik (Actionable Intelligence):**
   - Pasif grafikler yerine sistemi doğrudan güncelleyen kaldıraçlar:
     - *Trend Alarmı:* Tek tıkla Stüdyo desenini, Mockup temasını ve Etsy SEO'sunu yükselen trende adapte etme.
     - *Altın Kelime Matrisi:* eRank'teki en yüksek CTR'lı 13 kelimeyi doğrudan ilana aktarma.
     - *Dönüşüm Optimizatörü:* En çok satan Yatak Odası mockup'ını otomatik kapak görseli atama.
     - *Akıllı Fiyatlandırma:* Numune ($10 altı) elenmiş pazar fiyatı ($345.00) ve %57.5 net kâr marjı projeksiyonu.

8. **Çoklu Mağaza İlan Yönetimi, Envanter & Katalog Budama (Catalog Pruning):**
   - Tüm Etsy kataloğunu veya seçili mağazanın envanterini tek ekranda filtreleme ve canlı KPI paneli (Toplam, Yayında, Taslak, Pasif, Budama Önerisi).
   - **Ölü İlan Tespiti (Catalog Prune):** 30 günden eski olup <20 görüntülenme alan düşük performanslı ilanları otomatik tespit eder; tek tıkla pasife alarak mağaza kalite puanını korur.
   - Tek tıkla *"Yayından Kaldır / Pasife Al"*, *"Yeniden Yayına Al"*, *"Sil"* ve aktif mağazaya yeni ilan ekleme.

9. **Konfigürasyon (.env) & Raspberry Pi 2GB RAM Kaynak Kalkanı:**
   - Arayüz üzerinden API anahtarlarını girip doğrudan sunucudaki `.env` dosyasına kaydetme.
   - **Canlı Donanım Telemetrisi (`/api/system/resources`):** Python sunucu RSS belleği (~23 MB), toplam sistem RAM yüzdesi, CPU termal sıcaklığı (°C), boş disk alanı ve ağır Docker konteynerlerinin uyku durumu kontrolü.

---

## 🛠️ Hızlı Kurulum

### 1. Yöntem: Hafif Standart Sunucu (2GB RAM Dostu Python Threading Servisi · Önerilen)
```bash
cd apps/unified-platform
cp .env.example .env
python3 serve.py
```
Tarayıcınızda açın: `http://localhost:8765` veya Tailscale ağınızdan `http://<tailscale-ip>:8765`

### 2. Yöntem: Kurumsal Docker Ortamı (Lazy Profile + Bellek Sınırlamalı Next.js + Postgres + MinIO)
Ağır konteynerler 2GB RAM'li cihazları yormamak için `heavy` profili altında izole edilmiştir ve katı `mem_limit` tavanlarıyla korunur:
```bash
cd apps/fullstack-nextjs
cp .env.example .env
# Yalnızca veritabanını başlatmak için:
docker compose --profile db up -d
# Tüm ağır yığını (Next.js + MinIO + Worker + Postgres) bellek korumalı başlatmak için:
docker compose --profile heavy up --build -d
```
Servisler:
- Web Arayüzü: `http://localhost:3000`
- MinIO S3 Konsolu: `http://localhost:9001`
- Sağlık Kontrolü: `http://localhost:3000/api/health`

---

## 🔒 Güvenlik Notu
Bu depoda hiçbir kişisel müşteri verisi veya gizli şifre bulunmamaktadır. Canlı `.env` ve token dosyaları `.gitignore` ile korunmaktadır.
