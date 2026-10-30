# Görselden Etsy listing hazırlama

25 Ekim 2026. Dört ana çalışma alanı ve eski listing kayıtları korunur.

## Kullanım

Listing → görsel yükle → Listing taslağını oluştur. Motif, renk ve stil girilmesi gerekmez. MZ-0001-D, MZ0001-D, AD-0001-D gibi SKU'lar dosya adından okunur. Dosyada kod yoksa dosyanın kimliğinden sabit QOOP kodu üretilir. Bu kod tek başına tasarım/üretim kaydı yaratmaz. Tasarımlar sayfasından gelen kayıtlı görsel kendi SKU'suyla kullanılır.

1. Dosya içeriği doğrulanır, özgün hash ve küçük analiz kopyası oluşturulur.
2. Varsayılan yerel Qwen görsel modeli bu Mac’te görseli gerçekten okur: motifler, renk, kompozisyon, doku ve stil. Oda mockuplarında mobilyalar duvar tasarımının motifi sayılmaz.
3. Yerel araştırma kayıtları tekilleştirilir; en fazla 50 ilgili kelime adayı verilir. Ham CSV model bağlamına gönderilmez. Tarihi/pazarı/dönemi belirsiz sayılar talep sıralaması oluşturmaz. Sayısal kıyas ancak aynı dönem grubunda doğrulanmış US rolling12 kesin arama/rekabet sayılarıyla yapılır.
4. Yerel model bu okuma ve sınırlı kanıtla İngilizce başlık, 13 etiket ve açıklama oluşturur. Etiket başına araştırma kaynağı veya “görsel önerisi / veri yok” gösterilir.
5. Başlık <=140 karakter, 13 farklı etiket <=20 karakter ve ürün iddiaları doğrulanır. Sonuç taslaktır; Etsy'ye yayınlanmaz.

Görsel okuması ayrı önbellekte tutulur. Aynı dosya ve değişmeyen girdiler yeni çağrı oluşturmaz. Yeni CSV veya ürün bilgileri listing taslağını değiştirebilir; görsel okuması tekrar kullanılabilir. Hatalı iş otomatik tekrar edilmez. Kullanıcı “Yeniden dene” ile önbellekteki yanıtı tekrar işletebilir. Kapalı/arka plandaki sonuçlar sürekli sorgulanmaz.

## Açıklama

Korunan Etsy açıklama yapısı: ürünü ve tasarımı anlatan giriş → görünen detaylar → yalnız doğrulanmış ölçü / malzeme / numune → uygun oda önerileri → tasarım süreci ve mockup açıklamaları. Eski tedarikçi ölçüsü, mağaza adı, fiyat/teslimat garantisi taşınmaz.

Tasarım beyanı: “This design was developed using AI-assisted image generation, then digitally refined and edited in Adobe Photoshop.”

Mockup beyanı: “Listing room mockups use AI-generated imagery to illustrate the design; they are not photographs of the finished wallpaper.”

AI oranı uydurulmaz. Bu beyanlar kullanıcının bildirdiği iş akışına dayanır. Photoshop düzenlemesi görselin pikselinden doğrulanmış sayılmaz.

## Çalışma gereksinimi

Docker uygulaması, PostgreSQL ve MinIO yanında Compose `analysis-worker` çalışır. Mac’te Ollama `qwen3-vl:4b-instruct` açık olmalıdır. Bu kurulumda `com.qoop.local-ai` LaunchAgent otomatik başlatır. Claude hesabı veya OpenAI API bakiyesi varsayılan akışta kullanılmaz. Claude seçeneği yalnız işlem bazında açık onayla çalışır; yerel servis hatası Claude’a aktarılmaz. `npm run analysis:start` isteğe bağlı Claude köprüsüdür. Çevrimdışı servis başarılı gösterilmez. Bu servis Sprint 3 Python üretim worker’ı değildir.

## Resmi kaynaklar ve sınırlar

- [Etsy başlık rehberi](https://www.etsy.com/seller-handbook/article/1399426136697): okunabilir, açık ürün ifadesi; 15 kelimeden kısa olma bir öneridir.
- [Etiket rehberi](https://help.etsy.com/hc/en-gb/articles/360000336307-How-to-Use-Tags-to-Get-Found-in-Search): 13 etiket alanı, en fazla 20 karakter.
- [Açıklama rehberi](https://www.etsy.com/ca/seller-handbook/article/5-tips-for-writing-listing-descriptions/26330089019): önemli ürün bilgisini doğal biçimde başa almak.
- [Yaratıcılık standartları](https://www.etsy.com/legal/creativity/): AI destekli tasarım açıklanmalı.
- [Görsel politikası](https://www.etsy.com/legal/policy/listing-image-requirements/253962679005): AI mockup açıklaması tek başına yeterlilik sağlamaz; gerçek ürün fotoğrafı ve varsa üretim ortağına ilişkin istisna koşulları ayrıca değerlendirilir.

SEO sıralaması/satış garantisi verilmez. eRank CTR kendi ilan dönüşümü, tahmini satış gerçek sipariş sayısı değildir. Eksik ölçüm sıfır sayılmaz.

## PRO karar standardı — v4

Kalıcı ürün profilinde hedef pazar, İngilizce ilan dili, gerçek satış biçimi, marka üslubu ve kullanılmayacak ifadeler saklanır. Teknik onaydan bağımsız marka/pazar tercihleri analiz girdisine alınır. Kaynak önceliği: görünüm için gerçek görsel, teknik özellikler için doğrulanmış profil, arama kanıtı için araştırma verisi, tasarım süreci için kullanıcı beyanı. Görsel önerisi gerçek satış biçimi onayı değildir.

Sonuçlar CONFIRMED / UNKNOWN / ERROR kontrolleriyle değerlendirilir; eksik bilgi sıfır veya başarısızlık sayılmaz. Kontrol bekleyen taslak NEEDS_REVIEW olarak gösterilir. Müşteri metnindeki doldurulmamış köşeli parantezler ve marka ayarlarında yasaklanan ifadeler reddedilir. İlk görünüm kısa kalır; tarih/pazar/dönem, belirsizlikler, tüm kalite kontrolleri ve diğer uyarılar kapalı ayrıntılardadır. Eski kayıtlar değiştirilmez. Görsel okuma önbelleği korunur; yalnız değişen listing sözleşmesi yeniden metin üretimi gerektirir.

## Analiz kuyruğu durumu — 26 Ekim 2026

Yerel görsel incelemeleri Mac kaynaklarını paylaşmamak için tek tek işlenir. Tasarım analizi kaydı PENDING durumunda kendi sağlayıcısındaki sıra numarasını, RUNNING durumunda gerçek işlemin başladığını gösterir. Yerel modelin rapor/prompt çıktısı için daha geniş yanıt ve bağlam alanı kullanılır; rapor cümleleri kısa tutulur. Kesilmiş yanıt başarılı rapor sayılmaz. Claude seçilmiş kayıt yerel kuyruğa otomatik çevrilmez; kullanıcı kaydı açıkça yerel modele aktarabilir. Tamamlanmış sonuçlar korunur ve tekrar üretilmez.

## Kullanıcı açıklama standardı — 28 Ekim 2026

`qoop-2026-10-28` ürün profili, kullanıcının paylaştığı ticari metni esas alır. Bölüm sırası: giriş, Design details, Size, Material & installation, Samples, Ideas for your space, Production & shipping, Design process, Mockup images. Görsel dili giriş/detay/oda önerilerinde değişir; örnek manzara motifleri ortak şablona alınmaz. Mural ifadesi ürün türüne göre uyarlanır. Ortak metin `src/lib/listing-description-standard.ts`, onaylı profil kaynağı `data/product-standards/description-2026-10-28.json` içindedir. Profil bir veritabanı sürümü olarak saklanır; eski sürümler silinmez. Kayıtlı taslakların açıklama görünümü yeni standartla yerelde biçimlendirilir; kaynak sonuç, başlık ve etiketler yeniden üretilmez. Bu ticari açıklama profili hedef PPI veya belirli bir duvar için baskı onayı oluşturmaz.
