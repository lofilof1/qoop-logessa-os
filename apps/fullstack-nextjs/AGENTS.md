# Qoop OS çalışma kuralları
- Orijinal Logessa/eRank dosyalarını koru. Araştırma referanslarını kendi üretilmiş tasarımları gibi içe aktarma.
- Önce data/knowledge/manifest.json ve docs/knowledge-efficiency.md oku. Değişmeyen kaynakları yeniden analiz etme.
- Veri işleme, sayım, arama, filtreleme, dedup, doğrulama ve kodlama yerelde yapılır. Ham dataset'i model bağlamına yükleme.
- Yazma işlerinde önce knowledge:ask cache'ini kullan. İlgili rolü seç: brand, prompt veya listing. Her görevde tüm ajanları çağırma.
- Kullanıcıya verilen son metinleri Claude ile yazdır; olguları ve üslubu denetle. Claude erişimi başarısızsa önce oturum/ağ sorununu gider; başarısız çağrıları otomatik tekrarlama.
- Veri tarihi ve tahminleri belirt. Eski kurallar Qoop estetiğinin onaylandığını göstermez. Görmediğin görseli görmüş gibi değerlendirme.
- Aynı istek/data/ajan/politika kombinasyonu için üretilmiş cevabı yeniden kullan. Yeni bağlam veya gerçek değişiklik yoksa yeni model çağrısı yapma.

- Ders kaynağı data/lessons/catalog.json ve pages.json içindedir. Yalnız ilgili sayfaları seç; tam PDF metnini her göreve gönderme. Kaynak örnekleri zorunlu baskı standardına dönüştürme. /studio yalnız planlama ve kayıt sürümüdür; üretim/analiz çalışıyormuş gibi söyleme.

## Kalıcı listing dil kuralı — kullanıcı kararı, 29 Ekim 2026
- Etsy müşteri metinleri yalnız İngilizce: title, tags, description, görsel alt metni ve müşteri metnindeki bütün bölüm başlıkları.
- Türkçe yalnız uygulama arayüzü, iç analiz, rationale ve warnings alanlarında kullanılabilir. İç analiz notları kapalı ve Etsy metninden ayrı gösterilir; Türkçe motif/renk/oda değerleri doğrudan tag veya müşteri açıklamasına eklenmez.
- src/lib/listing-language.ts ortak kontrolü üretim doğrulamasında uygulanır. Türkçe tespit edilen müşteri metni başarıyla tamamlanmış sonuç gibi kaydedilmez. Sağlayıcıya göre istisna yoktur; otomatik Claude geçişi veya sınırsız tekrar yapılmaz.
- Dil politikası değiştiğinde listing sürümü/önbellek kimliği değişir. Önceki metinler korunur; sessizce İngilizce onayı verilmez.

## Kalıcı listing başlığı kuralı — kullanıcı kararı, 29 Ekim 2026
- Bütün yeni veya yeniden oluşturulan Etsy listing başlıkları güçlü, profesyonel, satın alma isteği uyandıran İngilizce pazarlama dili kullanır. Kuru motif/renk listesi veya analiz cümlesi yazılmaz.
- Ayırt edici ve görselde doğrulanmış motif/palet/stil/atmosfer öne çıkarılır; ürün tipi başta veya erken yer alır. Doğal arama ifadesi korunur; en fazla 140 karakter, tercihen 15 kelimeden az.
- Her tasarıma aynı slogan yapıştırılmaz. Görsel atmosferi anlatan yarar kullanılabilir; satış garantisi, en çok satan, el yapımı veya doğrulanmamış premium/luxury/teknik kalite iddiaları eklenmez. Pazarlama gücü anahtar kelime yığını veya yanıltıcı üstünlük iddiası değildir.
- Eski onaylı başlıklar otomatik değiştirilmez; yeniden üretimde yeni sürüm kuralı uygulanır.
