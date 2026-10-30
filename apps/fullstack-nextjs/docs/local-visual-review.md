# Görselden rapora ve düzeltilmiş prompta

Qoop/analysis akışı: dosyayı seç, Yükle ve analiz et'e bas. Dosya adı otomatik başlık olur; tasarım türü varsayılan olarak Görsele göre değerlendir seçilidir; özel talep ve fiziksel ölçü isteğe bağlıdır. Mac'teki Claude Pro oturumu, küçültülmüş gerçek görseli ve 4 ilgili PDF sayfasını salt okunur uzman olarak inceler; ham dataset ve sırlar gönderilmez. Çıktı: altı ders kriteri raporu, korunacaklar, üç düzeltme ve İngilizce düzeltilmiş prompt. Ayrı API bakiyesi gerekmez, Claude Pro kotası harcanır. Aynı görsel, ölçüt ve ders sürümü hash ile önbelleğe alınır; otomatik model tekrarı yoktur. Korunacak ilke: AI üretimi ile teknik doğrulama ayrıdır; seamless ve 4K ifadeleri kanıt değildir. Yerel piksel/PPI hesabı gerçek ölçümdür; yoğunluk ve renk alanı görsel tahmindir. Otomatik seam ve baskı onayı yoktur. Qoop estetiği henüz onaylanmadı; referanslar kopyalanmamalıdır. Bu servis aktif Node görsel inceleme servisidir, Sprint 3 Python baskı workerı değildir. Mac yeniden başlarsa Qoop-Analizi-Baslat.command açılabilir.

## Başlatma

Mac üzerinde `npm run analysis:start`. Yerel servis Claude oturumu ve bu projenin `.env` dosyasıyla çalışır; Docker içinde Claude oturumu aranmaz. Mac yeniden başlatıldığında `outputs/Qoop-Analizi-Baslat.command` kullanılabilir.

## Kayıt ve güvenilirlik

Model çıktısı doğrulamadan önce `.runtime/analysis-response-cache` içine yazılır; bu klasör Git ve Docker imajına alınmaz. Başarısız işlem otomatik tekrarlanmaz. Manuel notlar model raporundan ayrı kalır. Servis hazır değilse ekran bunu bildirir; yükleme analiz tamamlandı sayılmaz.

Bu değişiklik yerel Qoop uygulamasındadır. Önceki bağımsız Canvas paketi bu Mac servisini içermez.
