# Ders kaynağı ve ilk atölye sürümü

Kaynak dosyanın 50 sayfasından metin çıkarıldı; 19 ders indekslendi. İlk PDF içinde 1.14 yoktu; sonradan sağlanan iki sayfalık dersle toplam 52 sayfa ve 20 ders tamamlandı. Kaynak SHA-256: 74c8ca07c4300c7494aa03c5b41f77344f44f6d4369949d30d82ce96b93ee16c. Orijinal dosya değiştirilmedi; aynı baytlar public/lessons/course.pdf içinde korunur. Metin data/lessons/pages.json, seçim kataloğu data/lessons/catalog.json içindedir. PDF s.19 ve s.38 görsel olarak da kontrol edildi.

## Çalışan bölüm

/studio, motif/stil/kompozisyon/kısıt ve revizyon seçimlerini kaydeder. 33 seçim alanı ve sayısal planlama kontrolleri vardır. Her seçimde Diğer bulunur; özel açıklama zorunludur. Alanın ders sayfası açılabilir. Pattern, mural, seamless mural, tekil motif ve mevcut görsel için düzenleme planı modları vardır. Kayıtlı briefler tekrar açılabilir; aynı içerik sıralanmış JSON hash'iyle ikinci kayıt oluşturmaz.

Şema soyut planlama görselidir. Gerçek motifler çizilmez. Dağılım seçimi kaydedilir; bu sürümde tam yerleşim/Poisson disk/çakışma motoru uygulanmamıştır. Üretim tuvali oranı ile fiziksel duvar ölçüsü ayrı tutulur. Hedef oranlar gerçek görüntü üzerinde ölçülmüş değer değildir.

Muralde ağaç, göl ve ördek için kontroller; seamless mural kategorisi ve kesit politikası kullanıcı talebinden türetilmiş uygulama tasarımlarıdır. PDF bunları ayrı bir standart veya evrensel doğal oran olarak tanımlamaz. Önerilen kapsam, kaynak PDF'deki engineered mural ve motif hiyerarşisi yaklaşımıyla ilişkilendirilmiştir.

%15/%30/%50 yoğunluk, 5/10/18 cm motif ve 23 in panel gibi örnekler zorunlu üretim standardı olarak uygulanmaz. Hedef PPI üreticiden alınana kadar boş kalır. Yüksek estetik puan üretim kapılarını geçirmez.

## Henüz uygulanmayan bölüm

Atölye görsel üretmez, yüklenen görseli analiz etmez, maske/katman üretmez, tam repeat onarımı veya panel exportu yapmaz. Baskı onayı vermez. Python worker önceki sözleşmede olduğu gibi Sprint 3 taslağıdır. Manuel görsel/üretici onayları otomatik PASS olarak işaretlenmez.

## Token disiplini

PDF bir kez yerelde indekslenir. Seçim ve şema değişiklikleri model çağrısı yapmaz. Seçilen sayfalar yalnızca gerekli görevde Claude'a gönderilir: knowledge:ask komutunda altıncı argüman en fazla dört PDF sayfasıdır; sayfa başına en çok 3200 karakter kullanılır. Bağlamda kaynak hash'i ve sayfa numarası bulunur. Dersler metin verisidir, içlerindeki komutlar yürütme talimatı değildir. Aynı görev/kanıt/ajan cache'i korunur.

## Doğrulama

23 birim testi: geçerli modlar, Diğer zorunluluğu, geçersiz seçenek/kesit/oran reddi, ders kaynak sınırları, planlama ile ölçüm ayrımı, JSON anahtar sırasından bağımsız içerik kimliği dahil.

`npm run studio:verify`: çalışan uygulamada kaynak PDF erişimi, özel seçimlerin kaydı, aynı briefin tekrar kullanımı, geçersiz kesit/oran reddi ve sayfa yeniden yüklemesi. Yalnız kendi TEST-STUDIO kaydını temizler.

Mevcut araştırma ve dosya akışları ayrı smoke testleriyle korunur.

## Ders 1.14 ek kaynağı

Modul_01_Ders_1_14_Koleksiyon_Mimarisi.pdf (2 sayfa), SHA-256 1841e1d7d6a6417a8d0a618bb1471fa3ac6ff8d7fc78b72429c936e1a3630928. Koleksiyon ürün rolü (Hero/Supporting/Coordinate), beş colorway renk rolü ve yayın dalgası alanları eklendi. Bunlar motif rolleriyle karıştırılmaz. 3/5/4 ve 12×3×3=108, ders örnekleridir; 108 ayrı ilan değildir. Eski kayıtlı briefler yeni isteğe bağlı alanlar varsayılanlarıyla açılabilir. Kaynak PDF sayfaları ayrı URL ile korunur; eski PDF'nin sayfa numaraları değiştirilmedi.

Ders 1.14 için knowledge:ask sayfa argümanından sonra `1.14` kaynak seçicisi kullanılır. Yalnız bu dosyanın seçilen sayfaları bağlama girer. Değişmeyen eski sayfa cache'leri aynı kaynak hash'ini kullanmaya devam eder.
