# LOGESSA Studio

## Dinamik sezon radarı

Trend & sezon ekranında ayı değiştiren radar, hazırlık payı, stil/motif araması, seçim listesi ve yıllık takvim bulunur. Bir stilin üç temasını tek tuşla Alura'da ölçmek en fazla 3 yeni kredi kullanır; tek tema ölçümü en fazla 1 kredidir. `POST /api/seasonal` kullanıcı/origin kontrolü, eşzamanlı istek birleştirme, üç kelime üst sınırı ve 24 saat sağlayıcı önbelleği kullanır. Sayfa açılışı ücretli sorgu yapmaz.

Analitik bölümü gerçek arama hacmi ve rekabetten log ölçekli etkileşimli harita, kaynak tarihindeki 3 aylık değişim, sıralanabilir karşılaştırma ve CSV üretir. Aynı kelimede en yeni sağlayıcı tarihi seçilir; aramalar toplanıp hayalî bir toplam talep oluşturulmaz. 90 günden eski/tarihsiz kaynaklar varsayılan filtre dışında, istenirse işaretli olarak gösterilir. Takvim ayrı bir editoryal plandır; ay değişikliği Alura metriklerini veya yeni bir tahmini üretmez.

Kullanıcının `lofilof1/qoop-logessa-os` deposu incelendi: `keyword-watch` / `watch-evidence` yaklaşımından kaynak tarihi ve tekilleştirme ilkesi uyarlandı. Sabit eRank radar metinleri ve sabit fiyat/kâr önerileri canlı ölçüm olarak taşınmadı. Bu uygulama GitHub monoreposunda `apps/logessa-studio` altında diğer uygulamaları koruyarak yer alır.

Duvar kâğıdı ve desen işleri için tek çalışma alanı: **Bir fikir yaz veya hazır yön seç → Üret → Sonucu düzenle**.

## 2. sürüm: otomatik pazar paketi ve AI üretim yolu

Ana ekranda tek bir fikir alanı ve altı hazır yaratıcı yön var. Yeni tasarım düğmeleri de bu üretim akışını açar; boş form doldurmak gerekmez.

**Alura pazar paketi** mevcut `ALURA_API_KEY` ile çalışır. Türkçe temel tema eşleştirmesi veya İngilizce bir nişten Alura kelime sorgusu, 25 ilgili kelime ve ilk 25 rakip ilanı toplanır. İlgili kelimelerden talep/rekabet karşılaştırması, büyüme sinyali ve fiyat çeyrekleri çıkarılır. Brief, palet, üretim promptu, İngilizce başlık, 13 kısa etiket ve açıklama kurallı şablonla doldurulur. Bu mod her yerde **AI üretimi değildir / pazar taslağı** olarak etiketlidir. Yeni özgün görsel oluşturmaz; mevcut Alura anahtarı bir görsel modeli anahtarı olarak kullanılmaz.

**AI üretim yolu** ayrıca `OPENAI_API_KEY` sunucu sırrını gerektirir. İki Structured Outputs çağrısıyla kısa fikir yorumlanır ve Alura kanıtına dayalı özgün brief/ilan paketi yazılır; isteğe bağlı Images API çağrısı master PNG üretir. Master R2'ye kaydedilir ve aynı dosyadan ölçü oranı korunarak otomatik mekân önizlemesi oluşturulur. `OPENAI_TEXT_MODEL` varsayılanı `gpt-5-mini`, `OPENAI_IMAGE_MODEL` varsayılanı `gpt-image-2`. Bu anahtar mevcut yayına ayrıca eklenmediyse AI özelliği açıkmış gibi gösterilmez.

Üretimler `production_jobs` tablosunda adım adım saklanır. Aynı tıklama request ID ile tekilleştirilir, eşzamanlı ilerletme atomik lease ile korunur. Metin paketi ve iş durumu aynı D1 batch'inde kaydedilir. Görsel başarısız olsa da metin kaydı kalır. Belirsiz/başarısız ücretli adım otomatik yeniden gönderilmez; tekrar deneme açık kullanıcı tıklaması ister. Henüz başlamamış aşamalar son üretim kaydından devam eder.

Ek API uçları: `POST /api/analytics`, `GET/POST /api/production`, `GET/POST /api/production/:id`, `GET /api/designs/:id`.

Pazar skoru bir satış olasılığı değildir: logaritmik arama %60, ters logaritmik rekabet %25, 3 aylık değişim %15. Eksik parçaların ağırlığı bilinenlere dağıtılır; hacim bilinmiyorsa skor üretilmez. Sıfır hacim 0 skordur. Rakip fiyat dağılımı 10 USD altındaki olası numuneleri hariç tutar; ilk sayfa örneklemidir ve ilan yaşına göre filtre uygulamaz. Anahtar kelime, ilgili kelime ve rakip uçları 24 saat önbelleklenir. Alura-only paket en fazla 12, AI planının üç seed kelimesiyle paket en fazla 14 yeni API kredisi kullanır; AI kullanımı ayrıdır.

## Kullanım

1. Ana ekranda konunu yaz veya hazır yön seç. “Pazar paketini üret” ya da AI bağlıysa “Üret” ile başla.
2. Alura’da bir anahtar kelime veya rakip ürün araştır. Kaynak tarihi, tahmini metrikler ve bilinmeyen değerler korunur. Aramalar kullanıcı isteğiyle çalışır.
3. Doldurulmuş brief, palet, prompt ve ilanı incele. AI yolu açıksa görsel otomatik gelir; Alura-only modda promptu kendi üretim aracında kullanıp masterını yükleyebilirsin.
4. Mockup’ta sahneyi seç, **duvar ölçülerini** ve **desenin fiziksel tekrar genişliğini** gir. Dört köşeyi aynı duvar düzleminde saat yönünde kalibre et. Desen yüksekliği dosya oranından hesaplanır; bağımsız X/Y esnetme yapılmaz.
5. Kaynak sRGB veya sahne gölgesi modunu seç. Panel kılavuzlarını incele. Ölçüleri doğruladıktan sonra kılavuzsuz PNG ve ayrı JSON ölçü raporu indir. Mockup ayarlarını tasarıma kaydet.
6. Baskı ölçüsü/DPI, kenar sürekliliği, kullanım hakkı, fiziksel prova ve üretici şartlarını kontrol et.
7. İngilizce başlık, 13 etiket ve açıklamayı tamamla; CSV taslağını indir. Etsy’ye otomatik yayın yapılmaz.

Trend & sezon: 30 Ekim 2026 ZIP arşivinden 14 stil ve 78 alt tema. Takvim **editoryal plan** olarak etiketlidir; ölçülmüş aylık talep değildir. Gerçek Alura `change_3m` ölçümleri ayrı alanda gösterilir. 2027 seçimi arşivdeki planı yeni yıla uygular; yeni bir 2027 trend tahmini üretmez.

## Mimari kararı

Tek dağıtılabilir TypeScript uygulaması / modüler monolit. React 19 + Vinext/Vite; HTTP sınırında Zod doğrulama. Cloudflare Workers üzerinde çalışır. Kalıcı kayıtlar D1/SQLite, orijinal görseller özel R2 nesnelerinde tutulur. PostgreSQL, MinIO, Redis veya ayrı worker kurulumu gerekmez. Kilitli sürümler package-lock.json’dadır.

- `app/studio.tsx`: çalışma alanı ve ekran koordinasyonu.
- `components/studio/`: bağımsız kütüphane, araştırma, sezon, editör, ölçülü mockup, araç ve ayar ekranları.
- `lib/domain.ts`: ortak veri sözleşmesi, ilan/baskı kuralları ve iş mantığı.
- `lib/perspective.ts` / `lib/mockup-render.ts`: düzlemsel homografi, santimetre bazlı ölçek, çift doğrusal örnekleme ve ön plan maskesi.
- `app/api/`: kullanıcıya bağlı tasarım, dosya, araştırma ve oturum uçları.
- `db/schema.ts` / `drizzle/`: şema ve eklemeli migration geçmişi.
- `.openai/hosting.json`: site kimliği ve DB/BUCKET bağları. Sır içermez.

Her kayıt kullanıcı kimliğine bağlıdır. Yazmalarda aynı origin, dosyalarda gerçek başlık/piksel ölçüleri, tasarımlarda sürüm karşılaştırması doğrulanır. Arşivleme geri alınabilir. Orijinal görsel baytları değiştirilmeden saklanır. Görsel üst sınırı 15 MB / 100 megapikseldir. Çok büyük TIFF/PSD dosyaları bu sürümde desteklenmez.

## Alura

Sunucu sırrı: `ALURA_API_KEY`. Anahtar kaynak koduna, istemci paketine veya hosting manifestine yazılmaz. Canlı ortamda Sites sır yönetimiyle yapılandırılır.

Base URL: https://api.alura.io/v1

| İşlem | Yol | Önbellek |
| --- | --- | --- |
| Anahtar kelime | GET /research/keywords?q=...&language=en | 24 saat |
| İlk 25 rakip ürün | GET /research/products | 24 saat |
| Kredi ve plan | GET /usage | 60 saniye |

Anahtar kelime sonucu başına 1, ürün sonuç sayfası başına 10 API kredisi; kullanım sorgusu ücretsiz. Bunlar Alura belgelerindeki ücretlendirmedir; gerçek sağlayıcı başlıkları da saklanır. Pending/boş sonuçlar 24 saat kilitlenmez. Hatalı/ücretli çağrı otomatik tekrarlanmaz. Kullanıcı başına dakikada en fazla 6 yeni çağrı. Aynı çalışan Worker’daki eşzamanlı aynı sorgular birleştirilir; farklı isolate’larda eşzamanlı ilk sorgunun iki sağlayıcı çağrısı yapma ihtimali vardır.

Belgeler: https://docs.alura.io/guides/keyword-research ve https://docs.alura.io/guides/usage-and-limits

## Yerel çalıştırma · Windows PowerShell

Node >=22.13, npm ve Git gereklidir.

```powershell
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_woozy_miss_america.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_reflective_ben_grimm.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_messy_colossus.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_crazy_morlun.sql
npm run dev -- --port 5173
```

Migration komutları ilk boş yerel veritabanı içindir; uygulanmış migration’ları tekrar çalıştırma. Yerel adres: http://127.0.0.1:5173. “Çalışma alanına giriş” yalnız geliştirmede test oturumu açar. Üretimde platformun gerçek kimlik doğrulaması kullanılır; yeni site özel erişimlidir. Yerel ve canlı veritabanları ayrıdır. Yerel Alura kullanımı için ignored `.dev.vars` dosyasında yalnız kendi anahtarını tanımlayabilirsin; `.dev.vars.example` isim şablonudur.

```powershell
npm run typecheck
npm test
npm run test:production
# Geliştirme sunucusu açıkken; ücretli sağlayıcı çağrısı yapmaz:
npm run smoke
# İsteğe bağlı: yalnız yerel örnek desen kaydı oluşturur, baskı kontrollerini onaylamaz:
node scripts/load-demo.mjs
```

Smoke testi oturum/origin, kalıcı kayıt, orijinal dosya byte eşitliği, sahte dosya, dosya sahipliği, sunucunun piksel ölçüleri, sürüm çakışması ve geri alınabilir arşivleme akışını kontrol eder. `test:production` son derlenmiş Worker'ı izole Miniflare D1/R2 üzerinde, test Alura/OpenAI sağlayıcı yanıtlarıyla çalıştırır. Plan→araştırma→içerik→görsel akışı, çift tıklama, eşzamanlı ilerletme, sahiplik, orijinal görsel byte eşitliği, Alura-only mod ve görsel hatasında metni koruma denetlenir. Bu test gerçek model kalitesinin veya canlı AI erişiminin kanıtı değildir. Test kayıtları canlı ortama taşınmaz.

## Mockup doğruluğunun kapsamı

Ölçek doğruluğu girilen duvar ölçüsü ve kalibrasyon köşelerinin doğruluğuna bağlıdır. Hazır odaların gerçek fiziksel ölçüsü bilinmiyor; 400×300 cm ve 58,42 cm başlangıç örnekleridir. Tek düz duvar için perspektif uygulanır; köşe duvarları veya kavisli yüzeyler tek düzlem gibi yorumlanmamalıdır. Otomatik yeşil alan sınırları başlangıç önerisidir; son köşeleri kullanıcı doğrular.

Kaynak renk modu piksel değerlerine ilave ton/gölge uygulamaz. Perspektif küçültmede örnekleme yapılır; transparan alanlar açık duvar zeminine oturur. Tarayıcı canvas’ı sRGB ekran önizlemesidir; ICC profili koruma, CMYK ayrımı, monitör kalibrasyonu ve fiziksel baskı rengi garantisi yoktur. PNG, sahne fotoğrafının çözünürlüğünde iner. Kaynak renk modu ve gölgeli mod ayrı seçeneklerdir.

## Referanslar ve varlıklar

Üst dizindeki üç ZIP değiştirilmedi. `public/references/` içindeki altı oda, kullanıcının `logessa-kaynak-2026-10-30.zip` dosyasındaki şablonlardan alındı. `lib/seasonal-reference.json` aynı ZIP’teki STYLES sabitinin yalnız literal verilerinden çıkarıldı; kaynak sayfanın kodu çalıştırılmadı. Eski artifact veritabanları ZIP’lerde bulunmadığından sipariş/müşteri/ilan geçmişi aktarılmış sayılmaz.

GitHub etsy-engine yalnız akış fikri için incelendi; kaynak kodu alınmadı. Kapak: `public/studio-concept.png`, built-in Imagegen ile üretildi. Prompt özeti: “Serene sunlit European apartment, original delicate vintage botanical wallpaper, muted olive branches and terracotta blossoms, oak sideboard, ivory linen, editorial interior photograph; no text or logos.” Kapak açıkça AI örnek mekânı olarak etiketlidir.

`public/example-botanical.png` de built-in Imagegen ile oluşturulmuş düz bir test desenidir. Prompt: “Original flat botanical wallpaper tile, warm ivory, muted sage olive branches, terracotta buds, antique botanical ink detail, no room, furniture, shadows, perspective or text.” Seamless veya baskı uygunluğu onaylanmamıştır.

JSON dışa aktarımı kayıtları ve ölçüm anlık görüntülerini kapsar; R2 görsel baytlarını içermez. Masterları ayrıca indir. Otomatik yedek/geri yükleme, sipariş senkronizasyonu ve Etsy OAuth/yayınlama bu sürümün kapsamı değildir. AI üretimi ayrıca yapılandırılmış model erişimine bağlıdır; Alura-only taslağı AI sonucu gibi değerlendirme.
