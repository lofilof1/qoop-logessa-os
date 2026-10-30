# Qoop & Logessa · Unified Wallpaper OS

Uçtan uca duvar kağıdı / mural e-ticaret işletim sistemi. Tasarım üretiminden yapay zekâ kalite kontrolüne (QDS), 8-temalı canlı HTML5 Canvas mockup motorundan Etsy API v3 entegrasyonu, envanter yönetimi ve eylemli pazar radarına kadar tüm süreci tek çatı altında toplar.

---

## 📁 Depo Mimarisi

```text
qoop-logessa-os/
├── apps/
│   ├── unified-platform/         # Canlı çalışan tekil web platformu & Python API sunucusu
│   │   ├── index.html            # 9 sekmeli hepsi-bir-arada web paneli
│   │   ├── serve.py              # Etsy OAuth 2.0 PKCE, Envanter ve .env API sunucusu
│   │   ├── listings.json         # Yerel ilan ve envanter veritabanı
│   │   ├── .env.example          # Örnek konfigürasyon dosyası
│   │   └── img/                  # 68 adet yüksek çözünürlüklü oda WebP şablonu (std, da, bh, jp, ws, ml, fc)
│   └── fullstack-nextjs/         # Kurumsal Next.js 16 + TypeScript + Prisma + Docker altyapısı
│       ├── compose.yaml          # Postgres, MinIO, Migration, App ve Worker orkestrasyonu
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
   - Tek tıkla 10'lu Etsy mockup paketi indirme.

4. **Etsy SEO, Dil Kalkanı & Canlı Arama Motoru:**
   - **Canlı Etsy Alıcı Arama Önerileri (Live Autosuggest):** Halka açık Etsy arama API'si üzerinden alıcıların arama çubuğundaki gerçek zamanlı trendlerini anlık çeker; tek tıkla 13 etikete veya başlığa aktarır.
   - **Fikri Mülkiyet & Telif Kalkanı (Trademark IP Shield):** Disney, Marvel, Harry Potter, Lego, Pokemon, Barbie vb. 35+ tescilli markayı gerçek zamanlı tarar ve mağazanın kapatılmasını önler.
   - 140 karakter sayaçlı İngilizce satış başlığı.
   - 13 adet, 20 karakteri aşmayan, yüksek hacimli etiketler.
   - Asılsız iddia filtresi (`non-toxic`, `hand-made`, `AI-free` taraması).

5. **Etsy API v3 Entegrasyonu (OAuth 2.0 PKCE):**
   - Resmî Etsy Open API v3 bağlantısı (`client_id: znhmaxofm17pggem67prm1888`).
   - Token süresi dolmadan önce arka planda otomatik yenileme (OAuth Token Refresh) mimarisi.
   - Tek tıkla taslak (`DRAFT`) veya canlı (`ACTIVE`) ilan oluşturma.
   - 10 adet mockup görselini otomatik yükleme simülasyonu ve JSON yükü denetleyicisi.

6. **Canlı Sipariş & Müşteri Duvar Prova Masası:**
   - Gelen siparişler, müşteri ebatları (Peel & Stick vs Traditional) ve net kâr analitiği.
   - Müşterinin gönderdiği boş oda fotoğrafına 4 köşe pini koyarak canlı perspektif prova giydirme.

7. **Pazar Radarı & Eylemli Analitik (Actionable Intelligence):**
   - Pasif grafikler yerine sistemi doğrudan güncelleyen kaldıraçlar:
     - *Trend Alarmı:* Tek tıkla Stüdyo desenini, Mockup temasını ve Etsy SEO'sunu yükselen trende adapte etme.
     - *Altın Kelime Matrisi:* eRank'teki en yüksek CTR'lı 13 kelimeyi doğrudan ilana aktarma.
     - *Dönüşüm Optimizatörü:* En çok satan Yatak Odası mockup'ını otomatik kapak görseli atama.
     - *Akıllı Fiyatlandırma:* Numune ($10 altı) elenmiş pazar fiyatı ($345.00) ve %57.5 net kâr marjı projeksiyonu.

8. **İlan Yönetimi, Envanter & Katalog Budama (Catalog Pruning):**
   - Tüm Etsy kataloğunu tek ekranda görme ve canlı KPI paneli (Toplam, Yayında, Taslak, Pasif, Budama Önerisi).
   - **Ölü İlan Tespiti (Catalog Prune):** 30 günden eski olup <20 görüntülenme alan düşük performanslı ilanları otomatik tespit eder; tek tıkla pasife alarak mağaza kalite puanını korur.
   - Tek tıkla *"Yayından Kaldır / Pasife Al"*, *"Yeniden Yayına Al"* ve *"Sil"*.
   - Yeni ilan ekleme ve filtreleme (Tümü, Yayında, Taslak, Pasif, Budama Önerilen).

9. **Konfigürasyon & .env Yönetim Paneli:**
   - Arayüz üzerinden API anahtarlarını girip doğrudan sunucudaki `.env` dosyasına kaydetme.

---

## 🛠️ Hızlı Kurulum

### 1. Yöntem: Hafif Standart Sunucu (Python Servisi)
```bash
cd apps/unified-platform
cp .env.example .env
python3 serve.py
```
Tarayıcınızda açın: `http://localhost:8765` veya Tailscale ağınızdan `http://<tailscale-ip>:8765`

### 2. Yöntem: Kurumsal Docker Ortamı (Next.js + Postgres + MinIO)
```bash
cd apps/fullstack-nextjs
cp .env.example .env
docker compose up --build -d
```
Servisler:
- Web Arayüzü: `http://localhost:3000`
- MinIO S3 Konsolu: `http://localhost:9001`
- Sağlık Kontrolü: `http://localhost:3000/api/health`

---

## 🔒 Güvenlik Notu
Bu depoda hiçbir kişisel müşteri verisi veya gizli şifre bulunmamaktadır. Canlı `.env` ve token dosyaları `.gitignore` ile korunmaktadır.
