# Araştırma ve kullanım tasarrufu

Kaynak: Qoop Etsy v32, 16 Ekim 2026 yerel kopyası. Canlı eşitleme yapılmaz. Orijinal Logessa ve eRank klasörleri salt okunur kalır.

## Ayıklama

- 270 CSV incelendi; byte olarak 172 farklı içerik bulundu. Farklı içerik aynı kaydın başka görünümü olabileceği için 172 bağımsız veri seti sayılmaz.
- Ana kaynak: stil-arsivi CSV'leri + ilgili özgün items/promptlar JSON kayıtları. Eski 84 analiz tarihli destek belgesi olarak tutulur; 84 yeni tasarım yaratılmaz.
- Arşivde hariç işaretli veya duvar kâğıdı dışındaki 10 kayıt ana referans listesinden çıkarılır. Aynı listing kimliğindeki 6 ek arşiv kaydı birleştirilir; farklı analizleri additionalEvidence içinde korunur.
- 118 pazar adayının 57'si arşivdeki kayıtla eşleşir. Toplam 202 tekil referans kalır.
- 484 alakasız/dijital kelime çıkarılır. 15.913 farklı ilgili kelime saklanır; 9.368 wallpaper/mural kelimesi odaklı görünümde yer alır. Renk/motif gibi tamamlayıcı kelimeler silinmez.
- 10 tasarım promptu kullanım/sonuç durumuyla korunur. 24 aile kodu vardır; bazıları boş veya aday ailedir. Bunlar Qoop kimliğinin onaylandığı anlamına gelmez.
- Tahmini satış, kaynak fiyatı ve tarih aynen korunur. Görseller yeniden analiz edilmez. Aktarım hatasız görsel veya baskıya uygunluk onayı değildir.

## Model çağrısı olmadan yapılanlar

Dosya tarama, hash/kimlik eşleştirme, alan temizleme, filtreleme, arama, sayfalama, veri aktarımı, aynı aktarımı atlama ve kaynak-tasarım bağlama yerelde yapılır. Sayfa gezinmesi AI kullanımı oluşturmaz.

## Claude ve ajanlar

```sh
npm run knowledge:context -- "botanical wallpaper" BT
npm run knowledge:ask -- "Görev" BT "botanical wallpaper" brand
```

Son parametre: `brand`, `prompt`, `listing`. Bunlar kullanıcının mevcut Brand Guardian, Image Prompt Engineer ve Etsy Listing Specialist tanımlarını kullanır. Her görevde tek ilgili uzman seçilir. Tam ekip otomatik çağrılmaz. Claude Code ve hesap oturumu Mac'te gerekir; Docker imajında Claude bulunmaz. Codex kısıtlı ortamında oturum görünmezse doğrulanmış erişim yöntemi kullanılır; başarılı yanıt gelmeden iş tamamlandı sayılmaz.

Seçim en fazla 5 referans özeti, 15 ilgili kelime, 3 eski prompt başlığıdır. Tam prompt metni veya görsel ancak o görev için gerekiyorsa ayrıca ve açıkça eklenmelidir; mevcut otomatik paket piksel analizi yapmaz. Ham CSV'ler veya 157 görsel ajanlara topluca gönderilmez.

`knowledge:ask` yanıtı görev + seçilen kanıt + kaynak sürümü + ajan tanımı + model + politika hash'iyle önbelleğe alır. Aynı giriş tekrar geldiğinde Claude çağrılmaz. Bir görev eşzamanlı iki kez çalıştırılamaz. Başarısız yanıt başarılı sonuç olarak saklanmaz; sarmalayıcı otomatik yeniden deneme yapmaz. Claude'un kendi bağlantı tekrar davranışı ayrı olabilir. 90 saniye süre sınırı ve 3 tur sınırı vardır. Tekrarlanacak aynı görevi farklı sözcüklerle yazmak başka cache anahtarı üretir; standart görev metnini koruyun.

Yeni yanıtlarda gerçek CLI usage alanları ve maliyet tahmini kayıt altına alınır; bunlar abonelik fatura tutarı olarak yorumlanmaz. Cache klasörü Docker'a kopyalanmaz ve Git'e girmez. İncelenen kaynak değiştiğinde cache anahtarı değişir. Hiç kanıt bulunamazsa çağrı yapılmaz. Elle iptal edilmiş bir işten kalan .lock kaydı incelenmeden kaldırılmaz.

## Yenileme ve doğrulama

```sh
python3 scripts/curate-knowledge.py
npm run knowledge:import
npm run knowledge:verify
```

Curator yalnızca kaynak klasörleri okur, kendi data/knowledge ve public/research alanlarını üretir. Farklı kaynak yolu QOOP_LEGACY_ROOT ile verilebilir. Aynı dataset hash'i yeniden aktarılmaz. Yeni kaynak kopyası mevcut kayıtları günceller; kaynaktan sonradan kaybolan kayıtları otomatik silmez. Kaynakların eski sürümünü geri yükleme/silme ayrı onaylı bir işlemdir.

Aktarımlar transaction içinde yapılır. Yerel tasarımlar, yüklenen master dosyaları ve kaynak-tasarım bağlantıları yeniden aktarımda silinmez. Bu sürüm eski Claude artifact'ına geri yazmaz.

## Araştırma kanıtı kuralları
Ortak politika `src/lib/research-policy.ts` içindedir. Yorum artışı ve araç satış tahminleri gerçek siparişe dönüştürülmez. eRank CTR kendi ilan CTR/dönüşümü yerine geçmez. Yeni mağaza örnekleri giriş kolaylığı kanıtı değildir. 20 mağaza/50 ilan pilot hedefi, 0–16 puan ise doğrulanmış başarı veya yeterlilik eşiği değildir. Eksik veri `null`/bilinmiyor olarak korunur, sıfır puan verilmez.

Keyword raporu gerçek sipariş, kategoriye giriş kararı veya başarı olasılığı hesaplamaz. Rekabeti eksik adaylar ayrı gösterilir ve sayısal sıralamaya katılmaz. Politika değişince rapor ve listing sürümü değiştirilerek eski önbelleğin yeni sonuç diye kullanılması engellenir. Tarihî listing taslakları silinmez; yeni üretimler yeni kuralları kullanır. Mağaza/yorum veri analizi henüz mevcut keyword içe aktarımının parçası değildir.
