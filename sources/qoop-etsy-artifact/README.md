# Qoop Etsy: kaynak kodu

Qoop (Qoop Walls) Etsy mağazası için tasarım, pazar araştırması ve ilan hazırlama aracı. Uygulama, tek dosyalık bir HTML sayfası olarak bir claude.ai Artifact'i içinde çalışır.

- **Dosya:** `index.html` (bağımlılık yok, derleme adımı yok)
- **Paket tarihi:** 30 Ekim 2026
- **Sürüm:** Canlıda v36 var. Bu paket, v36'nın üzerine aşağıdaki "Yayınlanmamış değişiklikler" bölümündeki eklemeleri içerir.

## Çalışma ortamı

Sayfa, claude.ai Artifact çalışma ortamının `window.claude` arayüzünü kullanır. İhtiyaç duyduğu yetenekler şunlardır:

| Yetenek | Kullanım |
|---|---|
| `db` | Paylaşılan veritabanı. Koleksiyonlar aşağıda listelenmiştir. |
| `sample` | Claude çağrıları: prompt üretimi, görsel analizi, ilan metni, kontrol analizi. Bu çağrılar kredi harcar. |
| `assets` | Yüklenen görseller. Görseller 1.600 px'e küçültülerek saklanır. |
| `downloads` | CSV ve JSON indirme. |
| `user` | Kullanıcı kimliği. |

Bu arayüz olmadan, örneğin dosyayı doğrudan tarayıcıda açınca, sayfa açılır ama veri okuyamaz, kaydedemez ve Claude'u çağıramaz.

## Veritabanı koleksiyonları

| Koleksiyon | İçerik |
|---|---|
| `items` | Arşiv: rakip ve beğenilen ilanlar, Claude görsel analizleri, pazar verisi |
| `adaylar` | eRank Top Listings'ten gelen pazar adayı ilanlar |
| `takip`, `olcumler` | Takip edilen ilanlar ve tarihli favori/satış ölçümleri |
| `kelime_dosyalari` | Her aile için eRank kelime satırları: `[kelime, arama, tık, ctr, rekabet, etiket, sınıf]` |
| `promptlar` | Tasarım promptları. Ayrıca şu alanları tutar: `brif`, `koleksiyon`, `tekrar`, `uretim`, `durum`, `ilan`, `kontrol`, `dikis_kontrol` |
| `settings/genel` | Kurallar, ürün bilgisi, AI beyanı, yasak terimler |
| `settings/baski` | Baskı ölçüleri: mural 400×300 cm, panel 58,42 cm (23 in), dikey tekrar, DPI |
| `recipes` | Kural ve reçete kayıtları |

## Sekmeler

- **Tasarım üret:**
  - Aile bazlı prompt üretimi, tasarım brifi ve canlı eRank aramalarına dayalı pazar önerileri.
  - ChatGPT ve Midjourney için ayrı metinler.
  - Görsel yükleme.
  - İlan çalışma alanı: analiz, SEO, standart açıklama, etiketler, görsel planı, sosyal medya.
- **Kullanılan promptlar:** Tıklayınca açılan liste: görsel, not, ölçek değerlendirmesi, prompt.
- **Kontrol:**
  - Claude, Modül 01 derslerindeki kriterlerle (1.6, 1.9, 1.11, 1.13, 1.15, 1.17, 1.19, 1.20) analiz eder ve doldurur: QDS, stil değerleri, teknik QC, QDS kararı.
  - Kenar eşleşmesi ve oran, Claude'a sorulmaz; ölçümden alınır.
  - Fiziksel kapılar (prova, uygulama, üretici şartları) elle işaretlenir.
  - Karar RELEASE / REVISE / HOLD olarak verilir.
- **Takip:** Haftalık eRank CSV ölçümleri ve ivme.
- **Arşiv, Kelimeler, Desenler, Kurallar:** Araştırma verisi, aile skorları, kurallar ve ürün bilgisi.

## Sabit iş kuralları (kodda)

- **Mural:** Tek görsel, 4:3 oranında. Panoramik değil.
- **Desen:** 23 in tasarım genişliği. Panel 24 in, bindirme payı dahil.
- **Midjourney `--tile`:** Yalnızca dikey tekrarlı desende eklenir.
- **Satış hızı sıralaması:** 10 doların altındaki fiyatlar numune sayılır ve dışlanır; 60 günden genç ilanlar da dışlanır.
- **Açıklama:** Claude yalnızca açılışı, tasarım detaylarını ve oda önerilerini yazar. Ölçü, malzeme, numune, üretim, tasarım süreci ve mockup beyanı standart şablondan gelir.
- **İddia filtresi:** Ürün bilgisinde ve şablonda bulunmayan malzeme iddiaları işaretlenir. "non toxic", "hand drawn" ve "AI-free" her durumda yasak iddia sayılır.
- **Etiketler:** 13 adet. Her biri en fazla 20 karakter ve yalnızca İngilizce karakterlerden oluşur.
- **Başlık:** En fazla 140 karakter.

## Yayınlanmamış değişiklikler (v36'ya göre)

1. Standart açıklama şablonu, mural ve desen için ayrı. Açıklamayı kredi harcamadan yeniden kuran "Standart şablonla yeniden kur" düğmesi.
2. Kontrol sekmesinde otomatik Claude analizi ve toplu analiz düğmesi. Ticari veri yoksa QDS geri kalan kategorilerden hesaplanır.
3. "Kullanılan promptlar" sekmesi tıklayınca açılan liste hâline geldi.

## Yayınlama

Dosyayı Artifact olarak yayınla. Mevcut sayfayı güncellemek için aynı Artifact'in URL'sine yayınla. Bu durumda veritabanı korunur.

Yeni bir Artifact olarak yayınlanırsa veritabanı boş başlar. Veriler eski Artifact'te kalır.

## Testler (`testler/`)

Playwright ve Chromium ile çalışan uçtan uca test betikleridir. Claude, `db` ve `assets` taklit edilerek çalışır.

- Betikler `index.html` ile aynı klasörde bir `mockreal.json` test verisi bekler. Bu dosya mağaza ve rakip ilan verisi içerdiği için pakete eklenmedi. Kendi örnek verinle oluşturmalısın.
- Betikler `studiotest.run.js` dosyasının başlığından türetilmiştir. Çalıştırmak için: `node testler/kontroltest2.run.js`. Betiklerdeki `__dirname` yollarını kendi klasörüne göre düzelt.

## Pakete dahil olmayanlar

- **Veritabanı içeriği:** Arşiv, kelimeler, promptlar, ölçümler.
- **Yüklenmiş görseller.**
- **Kişisel veri:** Pakette API anahtarı, şifre veya e-posta yok; kaynak kod tarandı.
