# Kaynak paket kontrolü

ZIP bütünlüğü ve dosya SHA-256 envanteri kontrol edildi. ZIP çıkarılıp mevcut makinedeki kurulu bağımlılıklar kullanılarak TypeScript ve test kontrolü yapıldı. Bu npm ci ile yeni bağımlılık indirme testi veya temiz Docker/PostgreSQL/MinIO smoke testi değildir.

Özel 16 Ekim araştırma snapshot dosyaları paylaşılmadığı için yalnız o sabit arşivin içeriğini doğrulayan iki test kaynak paketinde açıkça atlanır. Diğer 183 test ve tip kontrolü çalıştırılır. Çalışan asıl projedeki testlere veya verilere dokunulmamıştır.
