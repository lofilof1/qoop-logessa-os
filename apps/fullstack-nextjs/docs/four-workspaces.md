# Dört çalışma alanı

- `/studio`: seçimler dört grupta; iki sağlayıcı için ortak görsel hedeften ayrı komutlar. Seçim ve prompt hazırlama model çağırmaz. ChatGPT/Midjourney hesabında kullanıcı üretir.
- `/analysis`: küçük görsel, kısa özet, korunacak özellikler ve üç öncelik. Ayrıntılı kriterler açılır. Aynı düzeltilmiş görsel hedefi sağlayıcı sözdizimine dönüştürülür; modellerin aynı piksel sonucu vermesi beklenmez.
- `/listing`: görsel + SKU + isteğe bağlı tarif/teyitli ürün bilgileri. Mac'teki yerel Claude işçisi mevcut Etsy Listing Specialist rolünü kullanır. Görsel ve en fazla 60 küçük kelime kanıtı gönderilir. Kaynak tarihi ve model önerisi ayrılır. 13 benzersiz, 20 karakteri aşmayan etiket ve en fazla 140 karakter başlık doğrulanır. Etsy'ye yayınlama yoktur.
- `/designs`: kayıtlar korunur; prompt/iki sağlayıcı komutu, seçimler, üretim kaynağı ve eşleşen dosya hash'i üzerinden analizler açılır kutudadır. SKU ile listing bağlantısı gösterilir.

`/research`, `/import` ve kaynak veri silinmedi; ana menüden kaldırıldı. `/` atölyeye yönlenir.

## Üretildi kaydı
`POST /api/studio/confirm` açık produced=true gerektirir. Design + Sku + Source + StudioGeneration tek transaction ile yazılır. Aynı brief/sağlayıcı/kaynak/SKU tekrarında kayıt yeniden kullanılır. Boş SKU sunucuda oluşturulur; farklı brief aynı elle girilen kodla çakışırsa transaction geri alınır. Dosya ayrıca tasarım kaydına yüklenir; işaretleme dış serviste gerçek üretimi doğrulamaz, kullanıcının beğendiği sonuç beyanıdır. Midjourney kaynak verisi mevcut Source/import modeline yazılır, ayrı veri kopyası oluşturulmaz.

## eRank güncelleme
Listing içindeki CSV yükleme Keyword, Keywords, Term, Tag, Etiket, Kelime, Anahtar Kelime veya Search Term sütunlarını tanır. Virgül/noktalı virgül/tab ayracı ve tırnaklı satırlar desteklenir. En fazla 2 MB, 10000 farklı terim. Orijinal dosyalara dokunulmaz; mevcut terimler korunur. Eşleşen terimlerin araştırma verisi yenilenir; yeni terimler eklenir. Kaynak güncellenme tarihi kaydedilir. Model bağlamına yalnız seçilen terimler, kategori, tarih ve sayılar girer. Aynı seçili kanıt, görsel ve girdiler aynı işi kullanır; geçmiş taslaklar kendiliğinden yeniden yazılmaz.

## Çalıştırma
`npx prisma migrate deploy`, `docker compose build app`, `docker compose up -d --no-deps app`.
Mac işçisi değiştiyse etkin işi bitirdikten sonra yalnız `.runtime/analysis-worker.pid` sürecini durdurup `npm run analysis:start` ile yeniden aç. Docker içinde Claude oturumu çalıştırılmaz. Worker çalışmazsa işler kuyrukta kalır; arayüz bunu bildirir. Başarısız iş otomatik tekrar edilmez, açık yeniden deneme düğmesi vardır. Sonuç ham yanıt önbelleğine alınır; biçim düzeltmesi tekrar model kullanımını gerektirmez.

## Sınırlar
Görselde görünmeyen özellik veya teyit edilmemiş malzeme iddiası üretilemez. Kelime verisi tarihli araştırmadır; canlı talep kanıtı değildir. Promptlar baskı çözünürlüğü veya seamless doğruluğu garantisi vermez. Bu sürüm yerel Qoop içindir; eski Gemini Canvas dışa aktarımları kendiliğinden güncellenmez.

## Yerel listing motoru (23 Ekim 2026)
Yeni listing istekleri `/api/listing` içinde anında ve model çağrısı olmadan hazırlanır. Görsel yalnız arşiv/önizleme için işlenir; `imageRead=false`. Ana motif/sahne zorunlu, renk ve tarz isteğe bağlıdır. Yaygın terimler yerel sözlükten çevrilir. Anahtar kelimeler önce tüm konu terimlerinin kullanıcı tarifiyle uyumuna, sonra varsa arama/rekabet sayılarına göre sıralanır. Teyit edilmemiş malzeme/satış iddiaları ve uyumsuz motifler alınmaz. 13 tagin veri kaynağı ile tariften türetilenleri ayrılır; hacim kanıtı yokken varmış gibi yazılmaz. Açıklama kurallı şablondur, görsel anlama veya üretken dil modeli değildir. Önceki Claude taslakları korunur ve arayüzde eski model taslağı olarak etiketlenir; yeniden deneme uç noktası onları Claude'a göndermez. Analiz işçisi eski listing kuyruk işlerini almaz; görsel analiz işlevi ayrı kalır. CSV verileri yerel PostgreSQL'de tutulur ve yükleme alanı açık gösterilir.

## Analiz prompt onayı ve düzenleme SKU'su
Analiz geçmişi `0001`, `0002` gibi numaralı, varsayılan kapalı satırlardır. Kart bileşeni yalnız satır açılınca yüklenir; kapalı geçmiş için durum sorgulaması yapılmaz. Sayfa son 20 kaydı gösterir; numaralar toplam kayıt sayısına göre hesaplanır.
Başarılı analiz kartındaki prompt onayı, kategori ve sağlayıcı seçimiyle `POST /api/analysis/[id]/approve` üzerinden kaydedilir. Mevcut kategori kodları korunur (MZ: manzara/orman, BT: botanik/çiçek). `MZ-0001-D` biçiminde kategoriye özel sıra ve düzenleme eki üretilir. PostgreSQL transaction/advisory lock, kalıcı kategori sayacı ve analiz+rapor benzersiz anahtarı tekrar basmalarında çoğalmayı engeller. Mevcut tasarım/SKU numaraları da dikkate alınır; önceki kodlar değiştirilmez.
Onay anındaki rapor, iki sağlayıcı promptu, kaynak görsel hash'i, ölçüler ve notlar değişmez snapshot olarak saklanır. Design/Sku/Source ve onay aynı transaction içindedir. Prompt onayı görselin üretildiği veya baskıya uygun olduğu anlamına gelmez. Yeni dosya onayla açılmış tasarım kaydına yüklenir. Tasarım ayrıntısında kaynak analiz bağlantısı görünür. Yeni rapor sürümü varsa eski onay korunur; güncel olmayan rapor onay isteği reddedilir. Onay veya SKU oluşturma işlemi model çağırmaz.

## Sürdürülebilirlik bakımı
Geçmiş listeleri artık rapor metinlerini ilk yanıtta taşımaz: analiz ayrıntısı GET /api/analysis/[id], listing özeti GET /api/listing?summary=1&page=N, listing ayrıntısı GET /api/listing/[id]. Eski GET /api/listing yanıtı uyumluluk için korunur; arayüz özeti kullanır. Analiz/listing/tasarımlar 20/20/30 kayıtla sayfalıdır. Açılmış analiz bileşeni kapanınca korunur, böylece yazılan not kaybolmaz; kapalı/tamamlanmış veya görünmeyen sekmedeki inceleme durum sorgulamaz. Yerel servis boşta 2–8 saniye bekler, 10 saniyede hazır durumu bildirir. Süren işler kesilmeden yenilenir.
Aynı dosya ve alanlarla analiz yükleme, aynı tasarım/hash master yükleme tekrarında mevcut kayıt kullanılır. Eski mükerrer arşivler birleştirilmez veya silinmez. Değişmeyen CSV satırları JSONB anahtar sırasından bağımsız karşılaştırılır ve tekrar yazılmaz. Hash aramalarına iki non-unique indeks eklendi; mevcut veri korunur.
Küçük form taslakları (atölye, listing metin alanları, analiz notları) tarayıcıda debounced saklanır. Orijinal dosya, API anahtarı ve dosya seçimi buraya yazılmaz. Bu koruma sunucu yedeği değildir; tarayıcı verisi temizlenirse taslak silinir.
`npm run system:audit` salt okunur DB/depo anahtar kontrolüdür. Sonuç .runtime/system-audit.json içinde, ölçüm .runtime/efficiency-measurement.json içindedir. Eksik/sahipsiz nesneler yalnız raporlanır, otomatik silinmez. Yanıt cache'i ve orijinal kaynaklar saklanır; büyüklükleri küçükken silmek model tekrarına yol açar.


## Yerel eRank takip listesi

Listing > eRank kelime takibi: 52 araştırma ifadesi (16 P1, 20 P2, 16 P3). `data/knowledge/keyword-watchlist.json` Claude listing ve marka uzmanlarıyla bir kez incelenmiş başlangıç listesidir; sonraki kullanım model çağırmaz. Arşiv tarihi 2026-10-16 ölçüm tarihi değildir. Kullanıcı eRank ortalama arama/tıklama/rekabet/CTR, kontrol tarihi, pazar ve veri dönemi notunu girer. Boş bilinmiyor; 0 gerçek sıfır; <20 bastırılmış değerdir. Aynı tarih/pazar için düzeltme yeni sürüm olarak eklenir; önceki kayıt korunur. Aynı ölçüm tekrar gönderilirse atlanır. Aktif terimlerin son US gözlemleri yerel listing sıralamasına girer; farklı pazarlar karıştırılmaz. Mevcut listing taslakları otomatik değiştirilmez. Başlangıç önceliği tasarımla ilgiden daha önemli değildir; performans garantisi değildir. CSV indir görünen filtreyi dışarı verir; mevcut CSV yükleyicisi genel kelime havuzunu günceller, takip ölçümü alanına CSV yazmaz.

Kurulum: `npm run db:deploy` ardından `npm run keywords:seed`. Yeni kurulumda `npm run db:seed` de takip listesini ekler. Seed mevcut öncelik/durum/ölçümleri değiştirmez. Veriler PostgreSQL içindedir; Docker veritabanı volume yedeğine dahildir. Orijinal Logessa dosyaları salt okunur korunur.


## İsteğe bağlı kompozisyon tamamlama

Atölye > Ana motifi ben seçeyim, gerisini Qoop tamamlasın. Ana motif ve çalışma türünden yerel kompozisyon profili seçer; palette/teknikte kullanıcı kilidi, oran kilidi ve önceki seçime dönüş vardır. Oran varsayılan olarak korunur; kullanıcı kilidi kapatırsa pattern 3:4, tekil motif 1:1, mural 4:3 önerilir. Çalışma adı, motif, ek talepler, duvar/tekrar ölçüleri, PPI ve kesit boyları korunur. Eşlik eden seçimler kullanıcı isteğiyle tek seferde değiştirilir, detaylar açılıp düzenlenebilir. Özel bilinmeyen motif için göl/ördek/ağaç eklenmez. Edit, yalnız belirtilen sorunla ilgili sınırlı öneri yapar; kaynak görseli görmüş sayılmaz.

`composeStudio` saf ve deterministiktir; API/model çağrısı yapmaz. Kurallar ilgili derslerin 3,19,22,38. sayfalarıyla prompt uzmanı üzerinden bir kez incelenmiştir; bunlar zorunlu oran veya onaylı marka estetiği değildir. `creativePlan` yerel taslakta ve üretildi onayıyla brief kaydında saklanır. Seçimlerle eşleşmeyen eski açıklama/talimat prompta eklenmez. Ayrı ChatGPT/Midjourney adaptörleri aynı sanat yönünü taşır; sadece pattern MJ --tile alır. Seamless muralde onaylı kesit ve sonradan görsel kontrol hedeflenir, rastgele kesitte garanti verilmez. Tekil motifte çevre/ufuk yüzdeleri istenmez; manuel motif seti akışı korunur. Seçenek prompt üretir; görsel otomatik üretilmiş veya baskıya hazır sayılmaz.
