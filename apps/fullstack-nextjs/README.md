# LOGESSA · Sprint 1

MacBook Apple Silicon üzerinde tek kullanıcı için yerel tasarım arşivi. Next.js + TypeScript, PostgreSQL + Prisma ve S3 uyumlu MinIO kullanır. Dashboard, tasarım listesi/detayı, SKU kaydı, master dosya yükleme/indirme ve manuel Midjourney JSON metadata import dahildir.

## Mac üzerinde başlatma

Docker Desktop'ın Apple Silicon sürümünü kurup açın. Terminalde bu klasöre geçin:

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
curl -f http://localhost:3000/api/health
```

İlk derleme internet ve birkaç dakika gerektirir. `.env` örnekleri yalnızca yerel başlangıç içindir. Parolaları ilk başlatmadan önce değiştirin; DATABASE_URL içindeki parolayı POSTGRES_PASSWORD ile aynı tutun. Compose içindeki bağlantı da bu değişkenlerden kurulur. Parolalarda URL özel karakterleri kullanırsanız DATABASE_URL ve compose URL'sinde URL encoding gerekir; kolay başlangıç için uzun alfasayısal parolalar kullanın.

- Uygulama: http://localhost:3000
- MinIO konsolu: http://localhost:9001 (`S3_ACCESS_KEY` / `S3_SECRET_KEY`)
- Hazırlık kontrolü: http://localhost:3000/api/health

Compose PostgreSQL'in sağlıklı olmasını bekler; migration ve idempotent seed çalıştırır, private bucket oluşturur, ardından uygulamayı başlatır. Örnek kayıt `QP-0001` ve SKU `QP-0001-01`'dir. Sahte master dosya veya üretim işi oluşturulmaz. Görseller veritabanına gömülmez.

## Geliştirme

Node.js 22 LTS ve npm kullanın. Docker servislerini başlatın, yerel uygulamayı ayrı çalıştırın:

```sh
cp .env.example .env
npm ci
docker compose up -d db minio storage-init
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Daha önce tam Compose başlatıldıysa `docker compose stop app` ile 3000 portunu boşaltın. `npm run dev` yalnızca 127.0.0.1 üzerinde dinler. Yerel production başlangıcı için `npm run build` ardından `npm start -- --hostname 127.0.0.1` kullanın.

## Kontroller

```sh
npm test
npm run typecheck
npm run build
# Çalışan Docker uygulamasına karşı; yerel npm bağımlılıkları ve .env gerekir:
npm run smoke
```

Smoke testi gerçek healthcheck, tasarım oluşturma, mükerrer kod reddi, SKU, kaynak kaydı, PNG/TIFF metadata, PSD arşiv durumu, byte eşitliğiyle indirme, geçersiz yükleme reddi, ekran HTTP yanıtları ve çapraz origin reddini doğrular. Kendi TEST-* kayıtlarını ve S3 dosyalarını sonunda temizler. Servisler kapalıysa başarılıymış gibi sonuç vermez. PSD smoke fixture yalnızca arşiv sınırını test eden başlıktır; PSD render testi değildir.

## Kullanım

1. Tasarımlar ekranından kod ve başlıkla kayıt açın.
2. Detay ekranında SKU ekleyin. Kodlar tekildir; tasarım ile SKU ayrı kayıtlardır. Örnek kodlar zorunlu bir dış katalog standardı değildir.
3. PNG, TIFF veya PSD yükleyin. Dosya uzantısına ek olarak imza denetlenir. PNG/TIFF için Sharp metadata ile width, height ve mevcut density okunur. SHA-256 saklanır. PSD yalnızca `ARCHIVED` durumunda orijinal baytlarıyla saklanır. PSD render/preview yapılmaz.
4. Midjourney import ekranında tasarımı seçip JSON kaydedin:

```json
{
  "prompt": "Quiet garden, painted botanical mural --ar 4:3",
  "sourceUrl": "https://www.midjourney.com/",
  "jobId": "optional-job-id",
  "model": "optional-model",
  "seed": "42"
}
```

`prompt` zorunludur. İsteğe bağlı alanları bilmiyorsanız kaldırın. JSON, raw alanında da saklanır. Bu özellik Midjourney hesabına bağlanmaz, görsel üretmez veya URL'den görsel indirmez. Görseli ayrıca yükleyin.

## Sınırlar ve güvenlik

Bu sürüm oturum açma olmadan yerel tek kullanıcı içindir. Compose portları yalnızca 127.0.0.1'e bağlıdır; sunucuya taşımadan önce kimlik doğrulama, TLS, yetkilendirme, yedekleme ve upload rate limiting eklenmelidir. Bucket anonim erişime açılmaz; indirmeler uygulamadan geçer. Çapraz origin yazmalar reddedilir. Yerel kullanıcıdan gelen doğrudan API erişimi oturum gerektirmez.

Yükleme varsayılan olarak 100 MB ile sınırlıdır (`MAX_UPLOAD_MB`); request stream de sınırlanır. Bu sprint multipart yüklemeyi bellekte işler; büyük PSD/TIFF dosyaları için Sprint 3'te presigned multipart ve arka plan işleme gerekir. PNG/TIFF pixel sınırı 268402689'dur. Dosyada DPI bilgisi bulunmayabilir; density baskı çözünürlüğü veya fiziksel boyuta uygunluk onayı değildir. TIFF çok sayfalıysa ilk görüntünün metadata bilgisi kullanılır. ICC/CMYK dönüşümü, baskı panelleme ve kusursuz tekrar doğrulaması yapılmaz.

Python üretim worker **uygulanmadı**. Yalnızca [sözleşme taslağı](docs/worker-contract.md) bulunur. Compose Python üretim worker’ı çalıştırmaz; healthcheck bunu açıkça `NOT_IMPLEMENTED_SPRINT_3` olarak bildirir.

Prisma 6 bu sprint için bilinçli olarak sabitlenmiştir; lockfile gerçek sürümleri kaydeder. `deepmerge-ts` geçişli bağımlılığı güvenlik düzeltmesi için 8.x'e override edilmiştir. Prisma major sürüm yükseltmesi ayrı migration çalışması gerektirir.

## Veri kalıcılığı ve sorun giderme

`postgres-data` ve `minio-data` named volume kullanılır. `docker compose down` veriyi korur; **`down -v` tüm yerel verileri siler**. PostgreSQL ile MinIO birlikte yedeklenmelidir; bu sprint otomatik yedekleme sağlamaz.

```sh
docker compose logs --tail=100 app migrate storage-init
docker compose restart app
```

Migration hatasında migration dosyalarını düzenleyerek veya veritabanını sıfırlayarak devam etmeyin. Önce logları inceleyin. Yeni geliştirme migration'ı için `npx prisma migrate dev --name aciklama`, dağıtım için `npm run db:deploy` kullanın. 3000/5432/9000/9001 portları başka uygulamada açıksa önce çakışmayı giderin.

## API

| Yol | İşlem |
| --- | --- |
| GET /api/health | PostgreSQL + private bucket hazır mı? Başarısızsa 503 |
| GET /api/designs | Tasarım listesi |
| POST /api/designs | code, title, description |
| POST /api/skus | designId, code, label |
| POST /api/designs/:id/assets | multipart file |
| GET /api/assets/:id | Orijinal dosya indirme |
| POST /api/designs/:id/sources | Midjourney JSON |

Kaynak kodu: `src/app`, `src/lib`; şema/migration/seed: `prisma`; birim testleri: `tests`; uçtan uca smoke: `scripts/smoke.ts`.

## MinIO kaynak derlemesi
Hazır MinIO/mc imajlarına bağımlılık kaldırılmıştır. MinIO, resmi RELEASE.2025-10-15T17-29-55Z kaynak etiketinden docker/minio.Dockerfile ile derlenir. İlk kurulum daha uzun sürer. Private bucket, uygulamanın AWS SDK istemcisiyle scripts/init-storage.mjs tarafından oluşturulur. MinIO AGPLv3 lisanslıdır; kaynak ve lisans upstream depoda bulunur: https://github.com/minio/minio/tree/RELEASE.2025-10-15T17-29-55Z

## Tasarım hafızası

Yeni araştırma ekranı: http://localhost:3000/research . 16 Ekim 2026 Qoop Etsy kopyasından ayıklanan 202 referans, 15.913 kelime, 10 prompt ve 18 kaynak belgesi yerel PostgreSQL'e aktarılır. Araştırmalar kendi tasarımlarından ayrı tutulur; referansların hangi etkisinin tasarımını beslediği bağlanabilir. Kullanım durumları kaynak tarihine aittir.

Compose migration adımı bilgi katmanını otomatik içeri alır. Aynı dataset hash'i tekrar işlenmez. Yerel yardımcı komutlar: `npm run knowledge:import`, `npm run knowledge:verify`, `npm run knowledge:context -- "botanical wallpaper" BT`. Claude ve görev önbelleği Mac üzerinde `knowledge:ask` ile çalışır; ekranları gezmek model çağrısı yapmaz. Ayrıntılar: [kullanım tasarrufu ve ajan yönlendirmesi](docs/knowledge-efficiency.md).

## Ders tabanlı tasarım atölyesi

http://localhost:3000/studio üzerinde 26 seçim alanı, Diğer değerleri, sayısal hedefler, temsili kompozisyon şeması, kayıtlı briefler ve kaynak PDF sayfaları bulunur. Bu sürüm planlama içindir; görsel üretimi/incelemesi ve üretim motoru henüz bu ekrana bağlanmadı. Ayrıntılar: [ders entegrasyonu](docs/lesson-integration.md). Doğrulama: `npm run studio:verify`.


## Atölyeden görsel üretim

## Kurulum kaydı: Görsel üretim (OpenAI API)

**Durum:** Arayüz eklendi; gerçek üretim doğrulanmadı, çünkü API anahtarı yok.

- **Eklenenler:** Atölyede "Seçimlerden görsel üret" alanı, anahtar bağlantı alanı, seçime göre hazır prompt, "Görsel üret", ayrı ücretli "Yeni varyasyon üret", önizleme, PNG indirme, promptla arşivleme.
- **Model:** gpt-image-2, orta kalite. Oranlar 16 px katlarında korunur; desteklenmeyen özel oran reddedilir.
- **Maliyet güvenliği:** Aynı istekte üretilmiş sonuç kullanılır. Bağlantı koparsa ücretli istek otomatik tekrarlanmaz. ChatGPT aboneliğinden ayrı API bakiyesi gerekir.
- **Test:** 29 test ve Docker build geçti.
- **Sınır:** Mevcut görselde piksel düzenleme yok; edit modu yalnız planlama. Mural/Pattern için yeni görsel üretilir.
- **Kontrol:** Çıktı seam veya baskı onayı değildir; tile, 3×3 test ve efektif çözünürlük ayrıca doğrulanır.

Bağlantı anahtarı Docker `runtime-data` biriminde tutulur; `.env` içindeki `OPENAI_API_KEY` alternatifidir. `.runtime` Git ve Docker build kapsamından çıkarılır. Üretim kayıtları PostgreSQL, PNG dosyaları MinIO içindedir.


### eRank CSV yükleme ve karşılaştırma

Listing > CSV yükle ve analiz et. 1–10 UTF-8 CSV seç (dosya başına 2 MB / 10.000 satır). Otomatik sütun eşleştirmesini kontrol et; gerekirse ülke, veri tanımı, YYYY-AA dönem ve gerçek kontrol tarihini dosya bazında belirt. Dönem/kaynak bilinmiyorsa öyle bırak: veri saklanır, trend uydurulmaz. Önizlemeden sonra aktar. Hatalı satırları atlamak veya aynı ölçümdeki farklı değerleri yeni sürüm saymak açık tercih gerektirir. Dosya bazında tamamlanan aktarım başka dosya başarısız olsa da korunur ve bildirilir.

Kelime/arama/tıklama/CTR/rekabet için İngilizce-Türkçe başlıklar; virgül, noktalı virgül, sekme; BOM ve tırnaklı çok satırlı hücreler desteklenir. YYYY-AA başlıklı sütunlar aylık **arama** serisi olarak açılır; bu biçimde ortalama metrikler ayrı CSV ile yüklenir. Diğer geniş aylık biçimler önce uzun biçime (keyword, month, searches) çevrilmeli veya gerçek dosyayla yeni adapter eklenmelidir. Bu sürüm CSV’de olmayan grafikten ay verisi çıkarmaz.

Tek ölçüm, 12 ay ortalaması değişimi, gerçek aylık değişim/yön sinyali ve aynı ay yıllık değişim ayrıdır. Tamamlanmamış mevcut ay aylık trend hesabına girmez. Rekabet değişimi gerçek kontrol tarihlerine göre hesaplanır. Aylık/ortalama veya farklı ülke/platform/kaynak karıştırılmaz. 0, boş, Unknown, <20 korunur; CTR %100 üzerinde olabilir. İlk CSV olmadan güncel pazar sonucu yoktur.

Özgün CSV byte’ları PostgreSQL’de tek kopya saklanır; geçmişten indirilebilir. Ölçümler silinmez; farklı değerler yeni sürümdür, rapor son kabul edilen sürümü kullanır. Aynı dosya ve ayarlar tekrar aktarılmaz; yeni isim de çift gözlem yaratmaz. Rapor yereldir; genel rapor veri+kural sürümüyle önbelleklenir. Arama filtreleri ayrı cache çoğaltmaz. Dış AI/eRank API çağrısı veya Etsy’ye otomatik yayın yapılmaz. PostgreSQL yedeği CSV arşivini de kapsar. US Etsy eRank 12 ay ortalamaları yerel listing kanıtını besler; aylık değerler ortalama sıralamasına karıştırılmaz. Eski araştırma ve tekil girişler korunur.


Seamless pattern çıktı hedefi sabit **1000 × 1000 px / 1:1**. Atölye, öneri ve her iki provider promptu kare tuval kullanır. Eski taslaklardaki oran pattern için uygulanmaz; mural ve diğer modlar kendi oranını korur. Harici ChatGPT/Midjourney promptu tam piksel boyutunu teknik olarak garanti etmez: indirilen dosya ölçüsü kontrol edilmelidir. İsteğe bağlı uygulama içi OpenAI yolunda kare PNG sağlayıcı tuvalinden 1000 × 1000 PNG arşivlenir; dikdörtgen yanıt kabul edilmez. Bu boyut sabitlemesi seamless veya baskı onayı değildir.


### Midjourney devamlılık talimatları

Atölye ve analizden onaylanan promptlar aynı provider adaptörünü kullanır. Pattern: sağ/sol aynı Y, üst/alt aynı X, kenarda devam eden motifin karşı kenarda konum/yön/ölçek/çizgi uyumu, köşe/çapraz tekrar, zemin/ışık/doku/yoğunluk/aralık sürekliliği ve tek tile hedefi eklenir. Half-drop iki kolonlu, brick iki satırlı supertile olarak ifade edilir; bütün supertile karşılıklı kenarları eşleştirmelidir. `--tile` bir kez eklenir, hedef 1000×1000 / 1:1 korunur. Sürüm varsayımı veya gereksiz üretim sayısı parametresi eklenmez.

Seamless mural: yalnız yatay kenar devamlılığı; aynı ufuk/derinlik/renk/ışık ve tek masterdan panel kesimi hedeflenir, düşey gök/zemin tekrarına zorlanmaz. Normal mural far-left/far-right loop’a dönüştürülmez. Tekil motife tile talimatı eklenmez. Sonuçlar görsel olarak doğrulanmış sayılmaz; pattern için 3×3, yatay mural için yan yana kontrol gerekir. Boyut değişikliği/upscale sonrası tekrar kontrol edilmelidir. Referans: https://docs.midjourney.com/hc/en-us/articles/32197978340109-Tile .


Atölyede elle değiştirilen kriterler (teknik, palet, motif/destek, kontrast, yoğunluk vb.) otomatik kompozisyon önerisinden önceliklidir. Seçim değişince iki provider promptu anında yeniden hesaplanır; kompozisyon düğmesine yeniden basmak bu seçimleri sıfırlamaz. Eski taslaklarda önceki öneriyle farklar da korunur. Vektör seçimi pozitif prompttaki eski boyama tekniği/yüzey/stil kalıntılarıyla çeliştirilmez. Vektör görsel dilini istemek, üretilen bitmapin düzenlenebilir SVG olduğu anlamına gelmez.


### Koordinatlı seamless planlama gridi

Pattern tuvali 1000×1000 px. X/Y orijini sol üst; X sağa, Y aşağı; 0/1000 geometrik sınırlardır, piksel indisleri 0–999’dur. Varsayılan çizgiler 100px aralıklı X00–X10/Y00–Y10; 50px/200px seçenekleri de vardır. Her çizgi adını ve koordinatını taşır. Sol/sağ portalları aynı Y, üst/alt portalları aynı X üzerinden eşleştirilir; köşeler iki eksende devam eder. Portal seçimleri draft ve briefte saklanır, her iki prompta güncel olarak yansır. Analiz pattern promptları varsayılan gridi kullanır. Half-drop/brick için faz, supertile içinde çözülür; dış kenar çiftleri yine aynı koordinatlarla tarif edilir.

SVG şablonu ve JSON planı indirilebilir. SVG dış etiket payıyla1200×1200; iç tasarım alanı1000×1000’dır. Grid, rakamlar ve portal işaretlerinin tasarımda çizilmemesi istenir. Bu, gerçek görsel üzerinde zorunlu piksel yerleştirme motoru değildir; Midjourney’nin tam koordinat veya seam garantisi olduğu iddia edilmez. Sonuç3×3 tekrar/offset kontrolü gerektirir. Mural ve tekil motiflere kare tile gridi uygulanmaz.

Grid v2: promptlar yalnız seçilen motif portallarını değil, bütün karşı kenar düğümlerini isimleriyle eşler (örn. X00-Y02 = X10-Y02, X02-Y00 = X02-Y10). Düğümler arasındaki kenar boyunca kesintisiz biçim/teğet/renk/çizgi kalınlığı/doku uyumu da istenir; aynalama veya bağımsız benzer motif çizimi değil, ötelenmiş devam tarif edilir. Görsel grid arayüzde isteğe bağlı kapalı ayrıntıdır. Bu, modellerin tam piksel yerleştirmesini uygulayan bir renderer veya doğrulanmış kenar testi değildir.

### Ürün profili ve üretim kontrolleri
Listing sayfasındaki kapalı **Ürün/baskı ayarları** alanı üretici bağımsızdır; ölçü, bindirme, hedef PPI, malzeme, numune ve teslimat bilgileri kullanıcı tarafından tanımlanır. Başka bir firmanın değerleri varsayılan olarak kullanılmaz. Her kayıt yeni bir profil sürümüdür.

Tasarım ayrıntısındaki üretim hazırlığı seçilen dosyaya ve profil sürümüne bağlanır. Tekrar karosu için fiziksel tekrar ölçüsü, duvar masterı için fiziksel duvar ölçüsü kullanılır. 3×3 tekrar ve kaydırılmış birleşim önizlemeleri görsel inceleme içindir; otomatik seamless onayı değildir. Kullanıcının dosya inceleme onayı, gerçek sipariş masterının üretildiği anlamına gelmez. Master dışa aktarımı ve Python production worker bu eklemeyle çalıştırılmaz.

Listing taslaklarına doğrulanmış profil bilgileri, SSS, seçenekler ve dokuz görsellik hazırlık planı eklenir. Aynı SKU ve aynı dosya eşleşirse kayıtlı hazırlık bilgileri kullanılabilir. Görseller otomatik oluşturulmaz ve Etsy'ye otomatik yayın yapılmaz. Mevcut kayıtlar ve dört ana sekme korunur.

### Onaylı promptun görselini yükleme
Tasarımlar listesindeki kaynak promptu bulunan kayıtlarda **Onaylı promptun görselini yükle** alanını aç. SKU elle girilmez: prompt için ayrılmış tasarım koduyla eşleşir; henüz SKU kaydı olmayan tasarımda bu kodla SKU oluşturulur. PNG/TIFF dosyaları küçük resimle gösterilir; PSD yalnız arşivlenir.

Yüklenen orijinaller uygulamanın mevcut MinIO deposuna ek olarak `tasarimlar/<tasarım-kodu>/<tasarım-kodu>-<dosya-hash>.<uzantı>` yolunda korunur. Docker Compose bu klasörü Mac üzerindeki `outputs/qoop-os/tasarimlar` klasörüne bağlar. Yerel geliştirmede `QOOP_DESIGNS_DIR` ile yol değiştirilebilir. Farklı içerikler ayrı sürüm olarak saklanır; aynı içerik ikinci kez kaydedilmez. Klasöre Finder üzerinden dosya koymak otomatik içe aktarım yapmaz: prompt/SKU eşleştirmesi için uygulamadaki yükleme alanını kullan. Önceden MinIO'da saklanan dosyalar yerinde korunur; toplu kopyalama yapılmaz.

### eRank Top Listings
Listing → CSV bölümündeki **Top Listings** açılır alanı ilan CSV'lerini ayrı saklar; kelime alanı keyword CSV'leri içindir. Orijinal dosya byte'ları, tüm sütunlar, kaynak sorgusu ve satır sırası korunur. Aynı dosya+aynı metadata tekrar yüklenirse yeni kayıt açılmaz. İlan kimliği birden çok sorguda tek ilan sayılır; kaynak gözlemleri korunur. İlan yaşı mağaza yaşı değildir. Tahmini satış/gelir gerçek sipariş veya gelir değildir. Ülke, para birimi ve çekim tarihi kullanıcı doğrulamadıkça bilinmiyor kalır. Fiyat birimi bilinmediğinde fiyat bandı hesaplanmaz. Ülke/dönemi doğrulanmamış keywordler yalnız sözlük eşleşmesine katkı sağlar; sayısal listing sıralamasına veya trend hesabına girmez.

### Odaklı çalışma akışı
Dört ana çalışma alanı korunur. Atölye **Çalışmayı tanımla → Tasarımı düzenle → Prompt ve üretim** adımlarına ayrılır. Analizde **Görsel yükle / Raporlarım** ayrımı vardır; yükleme sonrası ilgili kayıt açılır. Tasarımlar galerisinde SKU/varyant araması ve görsel bekleyen/yüklenen filtreleri bulunur. Listing **Listing hazırla / Araştırma verileri / Ürün ayarları** görevlerine ayrılır. Araştırmada kelime raporu, kelime CSV yükleme ve ilan CSV’leri ayrı alanlardır.

Aynı sayfanın adımları arasında geçişte form ve dosya seçimi korunur. Tarayıcı yenilenince yerel metin taslakları geri gelebilir; dosyanın yeniden seçilmesi gerekir. Tasarımlar’dan **Listing hazırla** bağlantısı kayıtlı SKU/görseli ve varsa kaydedilmiş motif/renk/teknik seçimlerini taşır. Bağlantıya gitmek tek başına model çağrısı başlatmaz. Kullanıcı listing oluşturduğunda gerçek görsel analizi yapılır. Sunucu dosyanın SKU’ya ait olduğunu ve hash bütünlüğünü kontrol eder. Ürün türü görselden önerilir; kullanıcı değiştirebilir. Yeni listing taslağı açılır; otomatik Etsy yayını veya gezinme sırasında AI çağrısı yapılmaz.

### Düzenleme ve geri alınabilir silme
Tasarımlar kartındaki **Düzenle / sil** bölümünden ad/not düzenlenebilir veya kayıt silinenlere taşınabilir. **Silinenler** filtresinden geri alınır. SKU, dosyalar, kaynak prompt ve analiz bağlantıları silinmez. Atölye seçimleri kayıtlıysa **Atölyede yeniden düzenle** bu seçimleri açar; önceki yerel çalışma yedeklenir ve atölyeden geri alınabilir.

Tasarım ayrıntısında **Tasarım bilgileri → Üretim kaynakları → Promptu oku / yeniden düzenle** alanı prompt taslak sürümü oluşturur. İlk onaylı prompt değişmez; düzenleme taslağı yeni üretim veya baskı onayı sayılmaz. Promptlar da ayrı silinebilir ve aynı alandan geri alınabilir. Silinen tasarımlar varsayılan listelere ve yeni listing bağlamına alınmaz. Kalıcı dosya temizliği yapılmaz.

Arayüzde masaüstü düğmeler yaklaşık 34 px, form alanları 36 px, bölüm aralıkları 16 px ölçeğine göre düzenlenmiştir; küçük ekranda dokunma hedefleri genişletilir. Galeri küçük resimleri sıkıştırılmış WebP olarak sunulur; orijinal master değişmez.


### Görselden listing — 25 Ekim 2026

Listing formunda yalnız görsel yüklemek yeterlidir. SKU dosya adından alınır; motif, renk ve stil varsayılan olarak bu Mac’te çalışan yerel görsel modelinden okunur. Yerel CSV/eRank kayıtlarından en fazla 50 ilgili kelimeyle İngilizce başlık, 13 etiket ve Claude açıklama yapısı hazırlanır. Araştırma dayanağı ile görselden önerilen etiketler ayrılır; tarih/pazar/dönemi doğrulanmamış sayılar talep sıralaması sayılmaz. Tasarımda AI destekli üretim ve Photoshop düzenlemesi, mockuplarda AI kullanımı ayrı belirtilir. Eski taslaklar korunur.

Varsayılan model `qwen3-vl:4b-instruct`, yerel Ollama üzerinden çalışır; Claude veya OpenAI API bakiyesi gerekmez. Compose `analysis-worker` servisini başlatır. Claude yalnız işlem bazında seçilip açık onay verilirse kullanılabilir; yerel hata Claude’a yönlendirilmez. Teknik ürün bilgileri yalnız doğrulanmış profilden alınır. Önbellek ve kurallar: [Görselden listing akışı](docs/listing-vision-flow.md).

## Yerel görsel analizi — varsayılan

Listing ve tasarım analizi bu Mac’te Ollama `qwen3-vl:4b-instruct` kullanır. Model yaklaşık 3,3 GB disk alanı ister. Bu kurulumda çalışma dosyaları `~/Library/Application Support/Qoop/LocalAI`, otomatik başlatma kaydı `~/Library/LaunchAgents/com.qoop.local-ai.plist` içindedir. Mac oturumu açıldığında model servisi başlar; Docker açıkken Compose `analysis-worker` kuyruğu işler. Yeniden başlatma sonrası gerçek uçtan uca test ayrıca yapılmalıdır.

Başka Mac’e kurulumda Ollama kurup `ollama pull qwen3-vl:4b-instruct` çalıştırın ve Ollama’yı başlatın. Ardından proje klasöründe `docker compose up -d --build` kullanın. Docker worker `http://host.docker.internal:11434` üzerinden yalnız yerel modele bağlanır. Native yardımcı: `node scripts/start-local-ai.mjs`. Model servisi internete model çağrısı yapmaz; ilk indirme internet gerektirir.

Claude varsayılan değildir. İsteğe bağlı kullanım için ayrı Claude köprüsü ve işlem formunda açık onay gerekir. `npm run analysis:start` yalnız bu isteğe bağlı köprüyü başlatır; normal yerel analiz için gerekli değildir. Hata durumunda otomatik sağlayıcı değiştirme veya otomatik yeniden üretim yapılmaz. Değişmeyen yanıtlar önbellekten kullanılır. Python üretim worker sözleşmesi bu görsel analiz servisinden ayrıdır ve uygulanmamıştır.

### Karışık eRank CSV yükleme

Listing → Araştırma verileri → CSV yükle: kelime ve Top Listings dosyaları birlikte seçilebilir. En fazla 100 dosya, her biri en fazla 2 MB; tarayıcı her dosyayı ayrı istekle sırayla işler. İçerikteki sütunlar dosya türünü belirler. Önizleme zorunludur. Hatalı dosya diğer geçerli dosyaların kaydını engellemez; sonuçlar dosya bazında görünür. Aynı ölçümün farklı değerini eklemek açık sürüm onayı gerektirir. Bilinmeyen ülke/tarih/dönem uydurulmaz; doğrulanmış metadata ve özel sütun eşleştirme için gelişmiş alan korunmuştur. Aynı içerik ve ayarlar yeniden aktarılmaz. Özgün CSV baytları indirmeye açık olarak veritabanında saklanır.

### Analiz promptundan üretilen dosyalar

Tasarım analizi → Raporlarım → analiz kaydı → Onaylı prompttan üretilen görseller. ChatGPT ve Midjourney ayrı kartlardır. Kategori seçilerek her araç için ayrı onay/SKU oluşturulur; aynı analiz sürümü ve araç yeniden onaylandığında mevcut SKU kullanılır. Onaydan sonra kartın içinden PNG/TIFF/PSD yüklenebilir. PNG/TIFF küçük önizleme gösterir, PSD arşivlenir. Kaynak analiz, araca özel prompt, SKU ve dosyalar aynı tasarım kaydına bağlıdır. Daha önceki onaylar ve SKU’lar korunur. Görsel yüklemek veya onaylamak model çağrısı başlatmaz. Her iki araç için ayrı onay desteği `20261028140000_analysis_provider_approval` migration’ıyla sağlanır.

## LOGESSA marka ve açıklama standardı — 29 Ekim 2026

Görünür marka LOGESSA; masaüstü yerel bağlantısı “LOGESSA görsel analiz” adıyla /analysis açar. Kullanıcının yeni açıklaması `logessa-2026-10-29` profil sürümüdür: 20 × 15 in numune, Houston üretimi, 3–7 iş günü üretim ve 2–6 iş günü tahmini ABD gönderimi. Ölçü/malzeme/paket/iade/AI beyanları bu kullanıcı onaylı metinden alınır; motif ve renkler her tasarıma özeldir. Önceki profil sürümleri ve tasarım/SKU kimlikleri korunur.

Midjourney adaptörü düz, kenardan kenara dijital tasarım tarifini öne alır; ürün sunumu, fiziksel duvar ölçüsü ve panel kesim talimatları yalnız Midjourney metninden ayrılır. Motifler ve tekrar/koordinat kuralları korunur. `--raw` ve `--no mockup` yönlendirmesi vardır; gerçek Midjourney sonucu uygulama testlerinde üretilmemiştir.

### Listing görselleri ve numune — 29 Ekim 2026

Listing taslağını açıp “Görseller, numune ve üretim kontrolü” bölümünü genişletin. Kayıtlı orijinal dosya tekrar yüklenmeden kullanılır. Duvar ölçüsü, hedef PPI, görünen panel eni ve numune yönü değiştirilebilir. Duvar görünümü, ölçü tablosu, merkez detay, numune ve dijital renk paleti ayrı PNG olarak indirilir; her biri için düzenlenebilir İngilizce Etsy alt metni sunulur. Bağlı analiz önceki kaynak görsele aitse açıkça belirtilir; yeni görsel analiz edilmiş gibi gösterilmez.

Numune toplam ölçüsü mural için yatay 20 × 15 inç, seamless için dikey 15 × 20 inçtir. Alt 2 inç toplam ölçüye dahildir ve beyaz kalır; LOGESSA logosu sağdadır. Mural tümüyle sığdırılır, kırpılmaz/gerilmez; oran farkı ek boşluk bırakabilir. Desen karosu numune alanında tekrar edilir, birleşim uygunluğu ayrıca kontrol edilmelidir. Numune PNG 300 PPI metadata içerir; bu, kaynak çözünürlüğünün yeterli olduğunu veya baskı onayını kanıtlamaz.

Panel sınırları ve 120–180 cm göz hizası bandı teknik önizlemedir. Hedef PPI planlama varsayımıdır; baskıcının onayı gerekir. Oran farkı, efektif PPI ve gerekli büyütme gerçek kaynak boyutlarından hesaplanır; uygulama upscale/master üretmez. Eski taslakta yalnız küçük önizleme kaldıysa bu durum belirtilir; yeni doğrudan yüklemelerde orijinal de saklanır. Bu bölüm model/API çağrısı yapmaz; türetilmiş çıktılar sürümlü önbellekte tutulur.

### CSV kelime görünümü

`/listing/keywords` sayfası Listing içindeki “CSV kelime tablosu ve fırsatlar” bağlantısından açılır. Eski arşiv veya CSV ölçüm grubu seçilir; ülke/tanım/dönem/çekim tarihi farklı gruplar birleştirilmez. Kelime, otomatik sınıf, minimum arama ve arşiv ailesi filtreleri vardır. Tablo 50 kayıtlık sayfalarla gelir; ham CSV/model çağrısı kullanılmaz. Kaynak ve arşiv aileleri satırdan açılır. Fırsat kartları en az 150 aramalı, aynı ölçüm grubundaki kesin arama ve pozitif rekabet değerlerini kullanır. Eski doğrulanmamış arşivde sayılar görünür ancak oran hesaplanmaz. Otomatik sınıflar ve sınırlı ilgisiz ifade filtresi manuel kalite onayının yerini tutmaz. Yeni CSV dosyaları mevcut yükleme alanından eklenir.
