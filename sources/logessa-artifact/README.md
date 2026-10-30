# Logessa Wallpaper System — kaynak kod

Tarih: 30 Ekim 2026 · Canlı sayfa sürümü: 1793350063-0589
Canlı adres: https://claude.ai/artifact/1Ute5aNG7CU4vXYMXHwdSK

## İçerik
- `index.html` — tüm uygulama (HTML + CSS + JS tek dosyada)
- `lib/xlsx.mini.min.js` — Excel okuma/yazma kitaplığı (SheetJS, Sipariş Takibi için)
- `img/logo.webp` — Logessa logosu
- `img/<tema>/<n>.webp` — 8 odalı tema setlerinin oda görselleri
  (std Standart, fc French Country, jp/jp2 Japandi, da Dark Academia, ml Modern Luxury, bh Boho, ws Western)

## Nasıl açılır
1. ZIP'i bir klasöre aç.
2. O klasörde yerel sunucu başlat: `python3 -m http.server 8765`
3. Tarayıcıda `http://localhost:8765/index.html` aç.

Not: Dosyayı çift tıklayarak (file://) açmak görselleri ve kitaplığı yüklemeyebilir; sunucu ile aç.
Yerelde Claude platform özellikleri yoktur, bu yüzden şunlar çalışmaz:
kayıt (db), görsel deposu (assets), yapay zekâ kontrol/revizyon/çeviri (sample), kullanıcı bilgisi (user).
Arayüz, mockup render'ı ve indirmeler gibi tarayıcı içi işler çalışır.

## Platform yetenekleri (yayında verilmesi gerekenler)
assets, db, downloads, sample {images:true}, user.

db koleksiyonları (hepsi okuma/yazma: owner):
patterns, abtests, sales, mfsets, orders, expenses, prompts (kullanılmıyor), ads, listings, infos

## Bu pakette OLMAYANLAR (bilerek)
- db içeriği: siparişler, giderler, ilanlar, reklam kayıtları, desen kitaplığı, satışlar.
- Çok kareli mockup setleri (AD, VK, MC, MK, GO, CO, BO, Set1–Set10): bunların tanımı db `mfsets`
  koleksiyonunda, görselleri assets deposunda (`/_blob/<id>`) durur; koda gömülü değildir.
- Bilgi görselleri (db `infos` + assets).

## Set verisi nasıl taşınır
Yeni bir artifact'a taşırken:
1. Görselleri (≤2400 px, JPG q92) yeni artifact'ın assets deposuna yükle.
2. Her set için db `mfsets/<id>` belgesi oluştur. Kare alanları:
   `{id, name, w, h, close, geo?, hue?}`
   - `geo: {t:[x0,y0,x1,y1], b:[...]}` oransal üst/alt duvar çizgileri (açılı kareler)
   - `hue: [h0, h1]` yeşil alan ton filtresi
   Görsel adresleri yeni assets kimlikleriyle güncellenmeli.
3. Aynı Claude hesabında kalınacaksa en kolayı: Artifact aracıyla `from_url` + `asset_ids`
   ile assets'i sunucu tarafında kopyalamak.

## Güvenlik kontrolü
Kod tarandı: API anahtarı, şifre, token, e-posta, telefon veya müşteri verisi yok.
Dış bağlantılar yalnızca Google Fonts ve sezon takviminde kaynak gösterilen trend makaleleri.
