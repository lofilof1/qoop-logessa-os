Durum: tasarım önerisi; henüz uygulamaya eklenmedi.

# Yön değişikliği

Merkez arşiv/pazar olmaktan çıkıp **ders temelli, seçilebilir bir brief ve canlı şema** olur. Arşiv ikinci planda kalır, yalnızca bağlam sağlar ve önceki çalışma silinmez. Eski rakip özetlerinden estetik kuralı türetilmez. Qoop estetiği henüz onaylanmadığı için kurallar yalnızca derslerden ve senin onayından gelir.

# Önerilen yapı

**Yeni çalışma:** seamless pattern / mural / seamless mural / mevcut görseli geliştir.

| Tür | Seçimler (hepsinde "Diğer": metin veya sayısal değer) |
|---|---|
| Pattern | motif, rol, görsel teknik, palette, repeat (düz/halfdrop/brick/serbest), ölçü, yoğunluk, negatif alan, yön, oran |
| Mural | içeriğe göre şablon (aşağıda) |
| Seamless mural | genişleyen sahne, büyük modül veya A/B/C uyumlu sahneler |

**Mural şablonu (manzara örneği):** ufuk, derinlik katmanları, odak/akış. Ağaç ana öğe olarak boy ve yüzey yüksekliğiyle, göl mekânsal yüzey olarak kapladığı alanla, ördek destek öğe olarak yakın/uzak plandaki yansıtılmış boyutla tanımlanır. Bunlar ayrı ölçülerdir ve tek evrensel oran verilmez. Her kontrol birimlidir (cm, %, px) ve şema anında güncellenir.

**Uyarı motoru (yerel kurallar):** Örneğin "yüksek yoğunluk + geniş sakin alan" veya "ince pencere + tek büyük odak" için uyarı verir. Uyarı engel değil, bilgidir.

**Pattern notu:** Tileable repeat geometrik olarak periyodiktir. Rastgele dağılım da büyük tile'da tekrar eder. Arayüz bunu açıkça söyler.

**Seamless mural:** Kenar testi ve crop testi ayrı yapılır. Her rastgele kesitte eksiksiz kompozisyon garanti edilmez. Bu yüzden tam yükseklik, minimum en/satın alınabilir pencere, güvenli odak alanları, korunan kritik motifler ve onaylı kesit alternatifleri tanımlanır. Dar pencere gerekiyorsa basit crop yerine ayrı recomposition yapılır.

# Akış

Seçimler → şematik kompozisyon → prompt veya yerel edit planı → sonuç → hedefle karşılaştırılan kontrol → revizyon → onaylı master.

Kontrol iki katmandır. Teknik katman: piksel, fiziksel ölçüyle etkin ppi, kenar birleşimi, kesit. Öznel katman: kompozisyon ve anatomi. Her hata için nedeni ve nasıl düzeltileceği yazılır. AI çıktısı oranlara kesin uymaz, bu yüzden **hedef** ile **ölçülen/tahmini** değer ayrı gösterilir. Kabul kararı sende.

# Ders kuralı kaydı

Her kural şu alanları taşır: kaynak, kapsam, örnekler, öneri/zorunlu, ölçü birimi, sürüm. Marka yapısı: Qoop çekirdeği + koleksiyon varyasyonları.

# Maliyet disiplini

- Seçimler yerelde tekilleştirilmiş JSON'a kaydedilir.
- Aynı brief/prompt/kural için cache kullanılır; görsel hash + analiz sürümü cache'lenir.
- Modele yalnızca ilgili ders dilimleri gider. Slider başına çağrı yapılmaz; üret/düzenle için tek somut çağrı yapılır.
- Ham CSV veya bütün ders gönderilmez.

# Korunacak ilkeler ve kontrol gerekenleri

- **Korunacak:** hedef ≠ ölçülen, teknik ≠ öznel, kararı kullanıcı verir, yerel işlem öncelikli.
- **Kontrol gerekenler:** Yerel belgelerde ölçek, hiyerarşi, odak, sakin alan ve panel devamlılığı var, ama derslerin tamamı bulunmadı. `read_thread` yalnızca içerik referansı döndürdü, tam yanıt metinleri yok. Bu yüzden kuralların çoğu "taslak" statüsünde başlar. Qoop estetiği de onaylanmadı.

# Durum ve sonraki adım

Bu aşamada hiçbir özellik uygulanmadı, yukarıdakiler tasarım önerisidir. Sonraki somut parça **seçilebilir brief şeması (JSON) ve mural/manzara canlı şema prototipi** olur.

**Senden tek ihtiyaç:** Ders konuşmasının tam metni ya da exportu, bir defa. Mevcut sohbeti yeniden yazmana gerek yok; mevcut sohbetten dışa aktarma veya tam metni dosya olarak vermen yeterli. Ben bunu yerelde dilimleyip kural kayıtlarına çevirebilirim.
