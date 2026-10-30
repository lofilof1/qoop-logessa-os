## Kurulum kaydı: Görsel üretim (OpenAI API)

**Durum:** Arayüz eklendi; gerçek üretim doğrulanmadı, çünkü API anahtarı yok.

- **Eklenenler:** Atölyede "Seçimlerden görsel üret" alanı, anahtar bağlantı alanı, seçime göre hazır prompt, "Görsel üret", ayrı ücretli "Yeni varyasyon üret", önizleme, PNG indirme, promptla arşivleme.
- **Model:** gpt-image-2, orta kalite. Oranlar 16 px katlarında korunur; desteklenmeyen özel oran reddedilir.
- **Maliyet güvenliği:** Aynı istekte üretilmiş sonuç kullanılır. Bağlantı koparsa ücretli istek otomatik tekrarlanmaz. ChatGPT aboneliğinden ayrı API bakiyesi gerekir.
- **Test:** 29 test ve Docker build geçti.
- **Sınır:** Mevcut görselde piksel düzenleme yok; edit modu yalnız planlama. Mural/Pattern için yeni görsel üretilir.
- **Kontrol:** Çıktı seam veya baskı onayı değildir; tile, 3×3 test ve efektif çözünürlük ayrıca doğrulanır.

OpenAI API: https://developers.openai.com/api/docs/guides/image-generation
