# Dünya Atlası: Tasarım geçmişi

Bu dosya **davranış tanımlamaz.** Programın güncel davranışı yalnızca [dunya-atlasi-tasarim.md](dunya-atlasi-tasarim.md) belgesindedir. Burada şunlar tutulur: kaynak belgeler, sürümlerin özeti, her değişikliğin gerekçesi ve kaynaklar arasındaki çelişkilerin nasıl çözüldüğü. Bir kuralı uygulamak için bu dosyayı okumak gerekmez; "bu kural neden böyle?" sorusu için okunur.

Güncelleme yöntemi tasarım belgesinin §0.2 bölümündedir.

---

## 1. Kaynak belgeler

Kaynak belgelerin kopyaları projenin paylaşılan klasöründe, `tasarim/girdiler/` altındadır. Üçüncü kişilerin içeriği oldukları için herkese açık GitHub deposuna konmazlar. yazar.io videolarının ses dökümleri de ([video-sesleri.md](video-sesleri.md)) aynı nedenle yalnızca proje klasöründedir.

| Kısaltma | Belge | Getirdikleri |
|---|---|---|
| G | yazar.io görsel ve video incelemesi (29 görsel, 14 video) | [tasarim.md](tasarim.md); soru kütüphanesi, görünüm, harita, kültür ve dil fikirleri |
| S | Video ses dökümleri | Mevsimin toplumsal etkisi, sahipsiz sınır bölgeleri, felaketin kalıcı izleri, "önce ihtiyacın olanı kur" |
| B1 | İleri mimari ve özellik dokümanı (`girdiler/ileri-mimari.md`) | Bileşenler, hiyerarşik miras, gömme, harita hizalama |
| B2 | Tasarım geliştirme önerileri (`girdiler/gelistirme-onerileri.md`) | |
| B3 | Ayrıntılı inceleme ve 17 öneri (`girdiler/ayrintili-inceleme-17-oneri.md`) | |
| B4 | Kapsamlı tasarım fikirleri, 24 fikir (`girdiler/kapsamli-fikirler-24.md`) | |
| B5 | Mimari analiz ve 12 hesap motoru (`girdiler/mimari-analiz-12-motor.md`) | Hesap araçları (§15), olay çapaları, işlem günlüğü |
| B6 | Derin inceleme: 18 düzeltme, 17 yeni fikir (`girdiler/derin-inceleme-yeni-fikirler.md`) | Ortak kurallar, F01–F17 |
| B7 | Teknik denetim (`girdiler/surum3-teknik-denetim.md`) | 7 teknik risk, F18–F22, ilk şema |
| B8 | Teknik denetimin eleştirisi (`girdiler/surum3-elestirisi.md`) | M01–M18, F23–F35, 22 kabul senaryosu |
| B9 | Sürüm 4 incelemesi (`girdiler/surum4-incelemesi.md`) | Belge düzeni eleştirisi, V4-01…V4-16, F36–F47, 26 kabul senaryosu |
| B10 | Sürüm 5 eleştirisi (`dunya-atlasi-elestiri-surum5.md`; bu projede `uploads/hearth/f1cb20d5-…`) | Madde 1.1–6.2: belge içi tutarsızlıklar, model kararları, eşitleme ve platform riskleri, Türkçe yazma |
| B11 | Sürüm 5 analizi (`analiz/dunya-atlasi-analiz.md`) | B10'un metne karşı doğrulanması, N1–N12, 11 karar sorusu |
| K | Kullanıcının 18 Ekim cevapları (proje sohbeti) | K11–K23 |

---

## 2. Sürümler

| Sürüm | Tarih | Özet |
|---|---|---|
| 1–2 | 18 Ekim | yazar.io incelemesi (G) ve B1–B4'ten ilk bütünleşik tasarım |
| 3 | 18 Ekim | B5 ve B6: hesap araçları, ortak kurallar, F01–F17, çelişkiler 21–38 |
| 4 | 18 Ekim | Kullanıcı kararları (GitHub, görünüm, cihazlar), B7 ve B8: platform bölümü, eşitleme protokolü, F18–F35, sözleşmeler, çelişkiler 39–52 |
| 5 | 18 Ekim | Belge yeniden kuruldu: tasarım belgesi yalnızca güncel davranışı anlatır; geçmiş bu dosyaya taşındı. B9 işlendi. |
| **6** | **18 Ekim** | **Kullanıcı kararları (K11–K23), B10 ve B11 işlendi:** terimler, zaman modeli, sonuç zarfı, bilinmeyen türleri tablosu, soru kuralları, eşitlemede parça dosyaları, gizli depo ve Cloudflare, Windows'tan başlayan sıra. |

---

## 3. Sürüm 5 değişiklik kaydı

### 3.1 Belge düzeni

**Sorun (B9 §1, §3, §10; kullanıcının vurguladığı nokta):** Sürüm 4, yeni eleştiri geldikçe eski cümlenin yanına düzeltme ekleyerek büyümüştü. Eski hüküm kaldırılmadığı için bir bölümü tek başına okuyan geliştirici ya da ajan yanlış hükmü uygulayabiliyordu. Örnek: §19.3 eşitleme çatışmasını "yalnızca iki cihaz çevrimdışıyken" diye özetliyordu, §10 ise daha karmaşık çatışmaları kabul ediyordu.

**Çözüm (K10):**
- Tasarım belgesi yalnızca güncel davranışı içerir; ⚖️ işaretleri, "eleştiri şunu dedi" cümleleri, M- ve V4- numaraları ve çelişki tablosu çıkarıldı.
- Her davranışın tek tanım yeri bir konu dizininde (§0.4) yazılıdır; diğer bölümler bağlantı verir.
- Karar durumu tek yerde: kullanıcı kararları ve açık kararlar §1'de, fikirlerin durumu §16'da. "Öneri / Kullanıcı kararı / Tasarım / Doğrulandı" ayrımı tanımlandı (§0.1).
- Güncelleme kuralı yazıldı (§0.2): eski cümle yerinde değiştirilir, anışlar düzeltilir, gerekçe bu dosyaya yazılır.
- Bölümler yeniden numaralandı: eski §15 (çelişkiler) bu dosyaya, eski §16 (açık kararlar) §1.2'ye, eski §17 → §15, §18 → §16, §19 → §17, §20 → §18. Bölge/krallık ayrımı, süreçler (§3.10), inceleme kuyruğu (§9.3) ve eşitleme alt bölümleri yeni.

### 3.2 İçerik değişiklikleri

| Kaynak | Konu | Sürüm 5'teki karşılığı |
|---|---|---|
| B9 §3 | §19.3 "tek çatışma iki cihaz çevrimdışıyken" | Çatışma, değişikliklerin birbirini görmeden yapılmasıyla tanımlandı; platform bölümü eşitlemeyi anlatmaz, §10'a bağlanır (§10.3, §17) |
| B9 §3 | §19.3 "iş silinmesi imkânsız" | Kurulum başına dosya yalnızca yazma yarışını kaldırır; anlam çatışmaları §10.3'te (§10.2) |
| B9 §3 | §3.3 "değişen tek şey öğrenme sırası" | Tanıtım, gönderme ve hazırlık–karşılık bağları da etkilenebilir (§3.3) |
| B9 §3 | Bölge / krallık aynı tür satırında | Bölge mekân, krallık siyasi varlık; ayrı türler (§3.7, §4.1, §4.2) |
| B9 §3, V4-06 | F27 "yarım tören kimseyi kral yapmaz" | Sonuç ilgili kurumun kuralına bağlı; süreç kuralları (§3.10) |
| B9 §3, V4-05 | §5.6 "ikisi girilir, üçüncüsü hesaplanır" | Gözlem, net fark ve gerçekleşmiş olay ayrı; gözlem ile süren durum ayrı (§5.6, §3.5) |
| B9 §3, V4-13 | §5.6a ile §9.2 arasındaki gerilim | İnceleme yalnızca belirli dayanak değişince açılır; açma ve kapama koşulları (§9.3) |
| B9 §3, V4-02 | "Bütün cihazlar" tanımsız; silme ile çöp kutusu | Etkin kurulum, kullanım dışı bırakma, çatışma paketi, açık geri yükleme (§10.5, §10.6) |
| B9 §3, V4-16 | "Düşük kontrast" | WCAG 2.2 AA (4,5:1 ve 3:1); narin ≠ silik (§12.1) |
| B9 §3 | §16 ile §18 karar durumları | Tek durum kaynağı (§1, §16) |
| V4-01 | Çatışmanın tanımı ve birleştirme ayrıntısı | Değer türüne göre birleştirme tablosu; uzun metinde paragraf düzeyi; çatışmada gizli seçim yok (§10.3, §2.2 kural 15) |
| V4-03 | Tek adres ≠ tek sürüm | Dört sürüm, anlaşılmayan verinin korunması, yazıyı kesmeyen güncelleme (§10.7) |
| V4-04 | İşlem bütünlüğü | İşlem grupları (§10.4) |
| V4-07 | Ayrı ayrı mümkün, birlikte değil | §2.2 kural 14, ortak varsayımlar sözleşmesi (§18), F37 önerisi |
| V4-08 | Çözüm bulunamaması ≠ imkânsızlık | §2.2 kural 13; F03 tanımı (§15-13) |
| V4-09 | DEĞİL ve belirsizlik | Sorgu ve olumsuzluk sözleşmesi; eksiksizlik beyanının kapsamı (§18) |
| V4-10 | Nicelik ve alan anlamı | Nicelik sözleşmesi (§18); sahte kesinlik yasağı (§2.2 kural 16) |
| V4-11 | Birden çok varsayılan kaynağı | Varsayılan değerlerin tek tanımı; bilinmeyen türlerine göre davranış tablosu (§3.7) |
| V4-12 | Bağlam bileşimi, okur kimlikleri, "bölüme kadar" | §5.2 bağlam birleşimi; §11.2 okur kimlikleri; §11.3 okuma tercihi ile teslim sınırı |
| V4-14 | Ölçek ile rota bilgisi | Üç harita kipi; koşullar varış anında (§8.4); F39 önerisi |
| V4-15 | Aynı köken yalıtım değil; açık depo; gönderilmemiş iş | Wiki ayrı kökende (§11.4, A3); örnekler uydurma (§0.3, §17.3); "yalnızca bu cihazda" göstergesi (§10.8) |
| V4-16 | Giriş yöntemleri | Basılı tutmanın alternatifi, sürükleme alternatifi, kalem kipleri, cihaza özel düzen (§12.2, §12.3, §5.9) |
| B9 §5 | "iPhone'da uygulamalar arka planda eşitleyemez" | "Bu PWA için kapalıyken düzenli eşitleme garanti edilmez" (§17.2) |
| B9 §5 | "claude.ai sayfaları Google'a bağlanamaz" | Kaldırıldı; bağımsız PWA'nın gerekçesi veri denetimi ve çalışma davranışı (§17.1) |
| B9 §5 | GitHub Pages ve açık depo | Ücretsiz planda doğru; depo ile site görünürlüğü ayrı (§17.3) |
| B9 §5 | Prototip verisi JSON ile taşınır | Aktarım sınanmadan kayıpsız sayılmaz (A6) |
| B9 §6 | F36–F47 | §16.2'ye **Öneri** olarak eklendi; hangilerinin alınacağı A13 |
| B9 §7 | Üç birleşik örnek | §13.6 A, B, C |
| B9 §9 | 26 kabul senaryosu | §13'e konularına göre dağıtıldı; önceki senaryolarla birleştirildi |
| B9 §10 | Sekiz yeni sözleşme ve özellik kullanım sözleşmesi | §18.1, §18.2 (rota örneğiyle) |
| Kullanıcı | Depo oluşturuldu | K7: `Darvolinnn/dunya-atlasi`; eski açık karar 15 kapandı |

---

## 4. Sürüm 6 değişiklik kaydı

Bölüm numaraları Sürüm 6'ya aittir. Bölüm numaralarında değişiklik yoktur; yeni bölümler: §0.5, §1.3, §2.3, §3.11, §3.12, §6.1, §10.12, §13.7, §14.1–§14.3, §17.4, Ek A. §0.2'deki kural gereği eleştiri madde numaraları yalnızca burada geçer.

| Kaynak | Konu | Sürüm 6'daki karşılığı |
|---|---|---|
| K | Kullanıcının 19 soruya cevabı | K11–K23 eklendi; K7 (gizli depo, Cloudflare Pages ve Access) ve K9 (açık onay olmadan kodlama yok) güncellendi; A1 → K15, A2 → K21; A3, A6, A13 yeniden yazıldı |
| B10 1.1 | Tasarım Öneri'ye dayanıyordu | F37 ve F40 tasarıma alındı (K23; §3.11, §3.8). F36 ve F45'e dayanan senaryolar §13.7'ye taşındı (eski Z16 → Ö1) |
| B10 1.2 | Davranış `tasarim.md`'ye başvuruyordu | Soru listeleri Ek A'ya taşındı; §12.3'teki başvuru kaldırıldı. `tasarim.md` yalnızca kaynak kaydı olarak kalır |
| B10 1.3 | Kaynak bağımsızlığı kuralı iki yerdeydi | Tek tanım §3.9; F08 ve F28 bağlantı verir |
| B10 1.4 | Bilinmeyenin türleri üç yerde farklıydı | §3.6'da tek tablo; "'Bilinmiyor' girilmiş" satırı kaldırıldı (arayüz seçeneği iki türe ayrılır); sorguda beşinci grup "konu dışı"; açık beyan örtük çıkarımı yener |
| B10 1.5 | Varsayılanda tür ekseni eksikti | §3.7 |
| B10 1.6 | Sonuç durumları dört sözlükteydi | §2.3 sonuç zarfı; §9.1 ve §15 bağlantı verir |
| B10 1.7 | Soru sormanın tek tanımı yoktu | §6.1 |
| B10 1.8 | §1 dışında kalan açık kararlar | §1.3 TK1–TK8. Eleştirinin önerdiği "T" yerine "TK" kullanıldı, çünkü T1–T14 kabul senaryolarının adıdır |
| B10 1.9, B11 N1 | Terim çakışmaları | §0.5 terimler. Teknik kimlik → **kod**; "dünya" (evrenin anlamında) → **evren** (K22); karar kaydı/defteri → **gerekçe** kaydı/defteri; karakterin karar geçmişi → **seçim geçmişi**; F19 kimlik satırı → **ayırt etme satırı**; kayıt durumları → **eşitleme durumları**; otomatik kayıt → otomatik kaydetme |
| B10 2.1 | Zaman modeli | §3.4 yeniden yazıldı (K12): iki biçimde saklama, hassasiyet ve gün bölümleri, üç değerli karşılaştırma, takvim değişikliği, zaman akışları. §9.1'deki Fey kuralı zaman akışına taşındı. §15-1'e kısıt ağı notu |
| B10 2.2 | Tek ilkel ve varsayılan yorum | K13 (§3.6). §18 İddia sözleşmesi tarihli, kaynaklı ve inanca açık değerlerin ortak yapısı oldu; metin, medya, düzen ve şablonlar dışarıda (B11 §4: tam birleştirme alınmadı) |
| B10 2.3 | Okur da bir bilen | §3.6 |
| B10 2.4 | Sahnenin örtük olayı | K14; §3.3, §5.6. Çelişki 21'deki "gizli zaman çapası yok" kuralı korunur: sahne olayı görünürdür |
| B10 2.5 | Harita uzayı | §8.1, §8.5 |
| B10 2.6 | Şema değişikliğinin eşitlenmesi | §10.3 tablo satırı; §9.5; §18 şema sürümü; E14 |
| B10 2.7 | F06, F16, F26 | F06 → §3.12 ve §18 Kod ve kimlik; F16'nın formül dili → TK8; F26 bekliyor |
| B10 2.8 | Çokluk sınırı, "iki yerde" denetimi | §3.2 çokluk kuralı; §9.1 fiziksel kapsama |
| B10 3.1 | Drive'da dosyaya ekleme yok | K15; §10.2 değişmez parça dosyaları, işlem grubu tek parçada, yoklama |
| B10 3.2 | Google oturumu | TK3. §10.8'deki "eşitlemek için dokun" zaten eleştirinin (a) seçeneğiydi; sunucu (b) alınmadı |
| B10 3.3 | Drive izin kapsamı | TK4; §10.2, §10.10, §10.11 |
| B10 3.4 | Köken yalnızca wikiye uygulanmıştı | §17.4 yazar uygulamasını da kapsar; K7 ile Cloudflare Pages'te projeye ait adres |
| B10 3.5 | iPhone depolaması | §10.9 |
| B10 3.6, B11 N6 | Metin birleştirme | §10.1 iki katman (kendi işlem günlüğü + metin CRDT'si), §10.2 temizlik, §10.3, TK2. Çelişki 9 ve 25 ile uyumlu |
| B10 3.7 | Medya | §10.12, TK5 |
| B10 4.1, B11 N3 | Yayın kontrolleri tanımsızdı; T7 mutlak vaat veriyordu | §11.2 sızıntı taraması, görsel yayın izni; T7 yeniden yazıldı; Y3 |
| B10 4.2 | Paket kodları | §11.2 |
| B10 4.3 | A3 seçenekleri | A3 yeniden yazıldı; TK7 |
| B10 5.1–5.5, B11 N7 | Türkçe yazma deneyimi | §5.1 Bağla düğmesi, Türkçe ek modülü, okunuş alanı, iki tür ad değişikliği, yazım denetimi; §5.8 `/` tetikleme; §18 arama ve sıralama; T9–T11 |
| B10 5.6 | Dokunma hedefi, renk | §12.1 |
| B10 6, B11 N2, N9, N10 | Süreç ve sıra | K11, K16, K17; §14 yeniden yazıldı (1a yerel, 1b Drive, cihaz sırası, iki haftalık kullanım kapısı); T8–T14 günlük kullanım senaryoları; §17.3 ajan talimat dosyası |
| B11 N4, N5 | Tek yazar, birden çok evren | K18; §10.1 |
| B11 N11 | GitHub hesabı | İki hesap da kullanıcının (K7) |
| Kullanıcı kararı (18 Ekim, kodlama başladıktan sonra) | Deponun görünürlüğü | Depo gizli yerine herkese açık oldu (K7). Cloudflare Pages'in seçilme gerekçesi artık gizli depo değil; kendine ait köken, Cloudflare Access ve HTTP başlıkları (§14) |
| Kodlama (19 Ekim) | F16'nın formülsüz kısmı | §18.2 kullanım sözleşmesi §16.1 sonuna yazıldı: seçmeli kural hukuk kuralıdır (§15-11); atölye örnek durumları, beklentiyle ve önceki tanımla karşılaştırmayı ve örnekleriyle kopyalamayı ekler. Formül kısmı TK8 bekliyor |
| Kullanıcı kararı (19 Ekim) | TK8 kural ve formül dili | Kullanıcı taslağı birimli sayılarla birlikte onayladı. Sözleşme §18.1 "Kural ve formül dili" bölümüne yazıldı: hukuk kuralının "kimlere" kısmı; ilişki, şablon alanı, tarih, birimli sayı ve yaş; üç değerli sonuç; hatalı formül kaydedilmez, sonradan bozulan "hesaplanamadı" der; dil sürümü. Şablona birimli sayı alanı türü eklendi |
| Güvenilirlik eleştirisi (19 Ekim) | Yedek doğrulaması, metin kaybı | §10.10: doğrulanamayan yedek eskileri silmez, aynı günün yedeğinin üzerine yazılmaz, eksik görseller söylenir. §10.7: "yerel taslak" tanımlandı (kurtarma taslağı, açılışta kurtar / vazgeç). Eleştirinin geri kalanı için analiz: proje klasöründe `analiz/guvenilirlik-plani-analizi.md`; arayüz önerilerinin çoğu yeni fikir sayıldı (K11). Tablet ve iPhone kullanıcı kararıyla süresiz ertelendi; uygulama kurulumu ve sürdürülebilir yükleme onlarla bekliyor |
| Kullanıcı kararı (19 Ekim) | Kullanıcı arayüzü beğenmedi ve yazma işinin nerede olduğunu sordu | K24: yazı merkezde, sadeleştirme ve yeni görünüş birlikte. §5.10'a sol gezinti çubuğu, Yaz ekranı (eser ağacı, ortada metin, sağda dar bağlam paneli) ve kayıt sayfasında katlanan bölümler yazıldı. Kullanıcı üç taslaktan "A · Üç sütun"u ve onun krem renklerini, yazı tiplerini seçti. Yeni özellik değil, mevcut düzenlerin yerleşimi |
| Kullanıcı kararı (19 Ekim) | Kullanıcı programın site gibi durduğunu söyledi; Windows için gerçek uygulama, tablet için APK istedi; iPhone'u plandan çıkardı | K3, K7, K16, K17 iPhone'suz yeniden yazıldı. TK6 karara bağlandı: Tauri 2 (analiz: proje klasöründe `analiz/uygulama-paketleme.md`). §17.1 iki cihaz ve kurulum dosyası, §17.2 (iPhone'a özel durumlar) kaldırıldı, §17.3'te Cloudflare yerine GitHub sürüm sayfası, §17.4'te Windows uygulamasının kökeni. §10.9, §14.3, §12.3 cihaz tablosu ve E17 iPhone'suz. Tabletin süresiz ertelenmesi kalktı: tablet Windows onayından sonra APK olarak gelir |
| Kullanıcı kararı (19 Ekim) | Kullanıcı çoğu sayfanın ne işe yaradığını anlamadığını ve Türkçenin garip olduğunu söyledi | K25: her sayfaya "?" ile açılan rehber (taslaktan B seçeneği: sağdan yan panel); hitap "siz" seçildi ve bütün metinler bu hitapla, doğal Türkçeyle yeniden yazıldı (§12.4). |
| Dış inceleme (19 Ekim) | Boş sahnede bağlam paneli kalabalık; kayıt, eşitleme ve yedeğin durumu tek bakışta anlaşılmıyor | Taslaktan B seçildi: boş sahnede panel kapalı başlar, "Bağlam ekle" ile açılır, seçim hatırlanır; boş durum tek cümle, okur bilgisi kayıt yokken katlı (§5.5). Gezinti altında katlı durum özeti: başlıkta en zayıf halka, açılınca cihaz / Drive / yedek satırları, eski yedekte sarı satır (§10.8). |
| Kullanıcı kararı (19 Ekim) | Ölçüm: gerçekçi metin ağırlıklı evrende baştan kurma 40.800 işlemde 319 sn sürüyordu (her metin değişikliğinde belge baştan okunup paketleniyordu); bir seri yüz binlerce işlem eder. Deney: metni alan başına toplu uygulamak 21.800 işlemde 154 sn → 6,4 sn, aynı metin | §10.1'e baştan kurmanın kısa sürmesi, metnin toplu uygulanması ve bellekte yalnız son kullanılan metinlerin tutulması yazıldı; hedef dakikalar ve tablette 4 GB altı. Anlık görüntüden kurma ve yeni cihaza anlık görüntü gönderme sonraki adımlar olarak DEVIR'de, tasarıma alınmadı. |
| Kullanıcı kararı (19 Ekim) | Program güncellemesinde baştan kurma beklensin mi, arka planda mı yapılsın, tablolar yerinde mi dönüştürülsün? | Beklenir, ilerleme şeridi gösterilir (§10.7); yerinde dönüştürme ileriye bırakıldı. Anlık görüntü için tablette fazladan disk alanı kabul edildi (DEVIR §3.3-2). |
| Kullanıcı isteği (19 Ekim) | Evrenler sayfasında evren silinebilsin, onay sorulsun | §10.1: evren yalnızca bu cihazdan kaldırılır (Drive ve öbür cihazlar etkilenmez); onay kaybolacak olanı söyler, yedeksiz yalnız-bu-cihaz evreninde iki kez sorulur. Her yerden silme güvenlik için tanımlanmadı. |
| Kullanıcı kararı (19 Ekim) | İki cihaz ayrı yazıp eşitlenince bütün evren baştan kuruluyordu (63.400 işlemde 21 sn) | §10.1 anlık görüntü: her 5.000 işlemde iki yuvalı görüntü; geç gelen işlemde görüntüden kurma (aynı ölçümde 0,05 sn, görüntü başına ~9 MB). |
| Kullanıcı kararı (19 Ekim) | Rehberli arayüz (dış öneri): başlangıç akışı | İki taslaktan B seçildi: Yaz sayfasında "İlk adımlar" listesi (K26, §5.10). Sol menü yapısı K24'teki gibi kalır. A ("Nereden başlamak istersiniz?" kartları) alınmadı. |
| Tutarlılık düzeltmesi (19 Ekim) | Belge başlığı | "Aşama: tasarım. Program kodu yazılmadı" eskimişti; kodlama K9 onayıyla başlamış ve §14.1 aşamaları kodlanmıştı. Başlık "Aşama: kodlama" oldu (kullanıcı onayı). |
| Kullanıcı kararı (19 Ekim) | Durum şeridi rengi | Eşitleme ve hazırlanma şeridiyle "zayıf durum" satırındaki sarı fazla göze batıyordu; yerine soluk deve tüyü (açık temada #e9dcc6 zemin, koyu temada #3d3122) seçildi. |
| Kullanıcı kararı (19 Ekim) | Menü adları | Kullanıcı "Masa" gibi adları anlamsız buldu; önerilen tablo seçildi: Masa → Genel bakış, İnceleme → Uyarılar, Görünümler → Grafikler, Çalışma masaları → Konu dosyaları, Açık meseleler → Karar bekleyenler, Bahsedilen ama yazılmamış → Eksik kayıtlar, Geçmiş → Değişiklik geçmişi, Sürümler → Kayıtlı anlar (§5.10). Kayıt türü adları (açık mesele) ve değişiklik/kullanım/koşul masası araç adları değişmedi. |
| Kullanıcı kararı (19 Ekim) | Rehberli yazarlık ve roman serisi (K27) | Kullanıcı roman yazma yöntemini bilmediğini, programın yol göstermesini istedi; iki brif gönderdi (istek ve ilk sürümün eleştirisi). Öneriler `analiz/` altında; kullanıcı D1–D13 için önerilen varsayılanların hepsini seçti, sıra önce rehber ve sorular. İlk işlenen: eser, sahne ve kurgu hattı soru setleri (Ek A). |
| K27 uygulaması (19 Ekim) | Yazarlık rehberi programın içinde (§12.4) | 24 konu yan panelde; sayfa rehberinden, soru gruplarından ve komut paletinden açılır. İçerik analiz belgesinden üretildi. |
| K27 uygulaması (19 Ekim) | İlk adımlarda başlangıç yolları (§5.10) | Dört yol (sahne, hikâye fikri, karakter, dünya); "Geç" adımı yapılmış saymaz; dayanaklar kayıtlı veriden. Seri yolu seri kaydıyla gelecek. |
| K27 uygulaması (19 Ekim) | Seri (§3.3, §4.6, §5.10) | Yeni kayıt türü; eser anlatı ağacında serinin altında, sıra önerilen okuma sırası. Silme altındakilere dokunmaz; geri gelince arada taşınan eser yerinde kalır. Ek seri üyeliği ve seri okuma yolları sonraya. |
| K27 uygulaması (19 Ekim) | Alternatifler (§3.6, §9.1) | `alternatif` ilişkisi (aynı türden kayıtlar), kesinleştirmede öbürlerini vazgeçirme sorusu, iki kesin alternatif için uyarı. Ayrı plan katmanı kurulmadı; karar durumları yetiyor. |
| K27 uygulaması (19 Ekim) | Çalışma durumu ve kitap sonunda açık kalanlar (§4.6) | Eser ve sahne için ayrı, karar durumundan bağımsız çalışma durumu. Kitap sonu listesi kurgu hattı ipucu sayılarına değil montajdaki sahne niyetlerine dayanır; kurgu hattı ipucu rolleri tek tek ipucunu ayırt etmediği için tarihsel doğru sonuç veremezdi. |
| K27 uygulaması (20 Ekim) | Olay örgüsü masası (§7) | Kullanıcı iki resimli taslaktan A'yı (tablo: sütunlar sahne, satırlar iz) seçti; B (bölüm sütunlarında sahne kartları) seçilmedi. Dönüm noktası için yeni veri yerine var olan etiket kullanıldı. Taşıma etkisi yalnızca neyin yer değiştirdiğini söyler (K1). |
| K27 uygulaması (20 Ekim) | Sonraya bırakılanlar: ek kitap, okuma yolları, olası finaller, karakter yolunda sahne bağı, soru örnekleri, seri düzeyinde masa (§3.3, §7, Ek A) | Kullanıcı "sonraya bırakılan küçük eklemeleri de ekle" dedi. Okuma yolu yeni tablo yerine evren anahtarında bütün liste olarak tutulur (tek yazar, son yazan geçerli); bu yüzden izdüşüm sürümü değişmedi. Olası final kavram modelindeki gibi soru değil olaydır. |
| K26 Aşama C (20 Ekim) | Kayıt sayfasında boş alanların gizlenmesi (§7) | İki taslaktan A seçildi: boş alanlar "+ ad" düğmeleri olur. B (boşlar tek katlı satırda) seçilmedi. Başka kayıttan varsayılan gelen alan dolu sayılır, çünkü gösterdiği bilgi gizlenmemeli. Sahne ve olayda evren tarihi asıl bilgidir, gizlenmez. |
| K26 "Yap" (20 Ekim) | İlk adımlarda her adım işin yerine götürür; eser oluşunca sahne kutusu açılır; sıradaki adım satırı (§5.10) | Kullanıcı, eseri oluşturunca bir sonraki işin (sahne eklemek) yerine geçilmesini ve bunun bütün adımlarda olmasını istedi. Liste yalnız Yaz sayfasında durduğu için öteki sayfalarda tek satırlık sıradaki adım eklendi; kendiliğinden yönlendirme yalnız eser → sahnede, öbürleri kullanıcının "Yap"ına bağlı (yazarken sayfa değişmesin). |
| K27 uygulaması (19 Ekim) | Şimdi kartı ve "Çalışıyorum" seçimi (§5.9, §7) | Etkin çalışma evrene yazılan ayrı bir değer (`evren_etkin_calisma` işlemi; çatışma izlenmez, günlükte sonra gelen geçerli). Devam notu "Kaldığınız yer"de kaldığı için kartta tekrarlanmadı. |
| K27 uygulaması (19 Ekim) | Karakterin kitaptaki yolu (§4.6, Ek A) | Soru taşıyan `eser_odagi` ilişkisi (kayıt kodu yerine ilişki kodu soru cevaplarının sahibi olabilir). Ayrı tür açılmadı; kayıt listesi kalabalıklaşmasın diye. Sahne/olay bağlantısı ilk sürümde yok (ilişkiye "yeni kayıtla cevapla" kapalı). |
| Alınmayanlar | — | B10 6.2'deki eser için `.docx` dışa aktarımı yeni bir fikir sayıldı (K11). F26'nın ayrıntısı ve 2.2'nin tam birleştirmesi bekliyor. B10 6.2 lisans önerisi yerine K19 |

---

## 5. Kaynaklar arasındaki çelişkiler ve çözümleri (Sürüm 1–4)

Bu tablo Sürüm 4'ten olduğu gibi taşındı. Sürüm 6 terim değişikliklerinden (§4) önce yazıldığı için "kimlik" burada teknik kod anlamında da geçer. **Tablodaki bölüm numaraları Sürüm 4'e aittir;** güncel yerler için tasarım belgesinin konu dizinine (§0.4) bakın. Sürüm 4 numaralarıyla Sürüm 5 arasındaki eşleme: §17 → §15, §18 → §16, §19 → §17, §20 → §18, §16 → §1.2, §5.6a → §5.7, §9.4–9.5 → §9.5–9.7.


| # | Konu | Kaynaklarda | Önerilen çözüm |
|---|---|---|---|
| 1 | **Durumun zamanı** | İleri mimari: `Unvan: Çırak (Bölüm 1–4)` | Aralıklar **evren zamanına** bağlanır. Yan panel durumu açık sahnenin evren tarihine göre gösterir (§3.3, §3.5). Bölüm numarası, geri dönüşlü anlatımda yanlış sonuç verir. |
| 2 | **Sahne / olay / bölüm** | İlk tasarımda yalnızca "bölüm" türü vardı | Eser, bölüm, sahne ve olay ayrı kavramlardır (§3.3). |
| 3 | **Harita hizalama** | İleri mimari: 2 noktayla afin dönüşüm | 2 nokta yalnızca taşıma, döndürme ve tek oranlı ölçek için yeterli. Genel afin dönüşüm için 3 nokta gerekir. Her ikisi de sunulur (§8). |
| 4 | **Bileşen mi, ayrı kayıt mı** | İleri mimari: tapınak = mekân + topluluk + inanç bileşenleri tek kayıtta | Bağımsız yaşayabilen varlıklar ayrı kayıt olur, bileşenler aynı varlığın yönlerini taşır (§3.1). |
| 5 | **Hiyerarşik miras** | İleri mimari: Oda→…→Krallık zinciri, kurallar otomatik miras | Fiziksel kapsama, siyasi bağlılık ve kültür ayrı ilişkilerdir. Miras yalnızca seçili alanlarda olur, kaynağı gösterilir ve "bilinmiyor" ile engellenir (§3.7). |
| 6 | **Yeni kayıt sözdizimi** | İleri mimari: `[[Ad::Tür\|özet]]`, yani `\|` iki anlamda | Ana akış seçim kutusudur. Kısayol `[[Ad::Tür::özet]]` olur; `\|` yalnızca görünen metin içindir (§5.1). |
| 7 | **Gömme** | Yalnızca canlı gömme vardı | "İzle" ve "sabitle" modları eklenir (§5.2). |
| 8 | **Tutarlılık** | "Aynı tarihte iki yer = hata" | Üç sonuç düzeyi, dayanak gösterme, gerekçeli istisna (§9.1). |
| 9 | **Eşitleme** | CRDT ile otomatik birleştirme yeter | Birleştirmeden sonra denetimler yeniden çalışır. Aynı alandaki çakışmada iki değer de saklanır (§10). |
| 10 | **Bakış açısı filtresi** | Gerçeği gizle | Gizlemenin yanında o grubun inandığı alternatifi gösterir (§3.6). |
| 11 | **İlişki karşılığı** | İlk tasarım: karşılık her zaman otomatik | Karşılıklı, farklı adlı karşılık ve tek yönlü ilişkiler ayrılır (§3.2). |
| 12 | **Eşya zinciri** | Yeni sahip atanınca eskisi düşer | Sahibi, taşıyanı ve konumu ayrıdır; taşıyan değişince sahip değişmez (§3.8). |
| 13 | **"Önce hikâye" ve sihirbaz** | İlk tasarım: ilke ve başlangıç sihirbazı | İsteğe bağlı ve atlanabilir; başlangıç noktası serbest (§6). |
| 14 | **Doluluk göstergesi** | İlk tasarım: Dünya Pusulası doluluğu | Kaldırıldı. Yerine kullanıcının "önemli" diye işaretlediği açık sorular gelir (§6). |
| 15 | **Karakter geçmişi** | İlk tasarım: olaylara bağlı yapılandırılmış "izler" | Önce serbest metin yazılır, istenen parçası sonra olaylara bağlanır (§2). |
| 16 | **Haritanın gerekçesi** | İlk tasarım: "farkımız harita" | Gerekçe kullanıcının ihtiyacıdır. Harita küçük kapsamla erken başlar (§1, §8). |
| 17 | **Deneme dalı** | Otomatik birleştirilen dallar | Önce adlandırılmış sürümler ve bağımsız kopya; otomatik birleştirme sonra gelir (§9.5). |
| 18 | **Para dönüşümü** | Sabit katsayı | Bölgeye ve döneme göre değişebilen oranlar (§4.4). |
| 19 | **Mesafe** | Her haritadan mesafe hesabı | Yalnızca ölçeği tanımlanmış haritalardan (§8). |
| 20 | **Platform** ❓ | Mevcut prototip claude.ai içinde çalışıyor ve claude.ai'nin kendi eşitlemesini kullanıyor | Drive eşitlemesi ve çevrimdışı çalışma için program **kendi adresinde çalışan bir web uygulaması** olmalı. claude.ai sayfaları Google'a bağlanamaz. Bkz. §16-1. |
| 21 | **Durum sınırı tarihe mi olaya mı** | 12 motor belgesi: hiçbir durum tarihe bağlanmaz, her şey olaya bağlanır, olay yoksa gizli çapa olayı oluşur | Sınır olaya bağlanabilir ve bağlandığında kendiliğinden kayar; ama tarihe ya da yaklaşık tarihe de bağlanabilir. Gizli çapa yok, dayanak görünür (§3.5). Bunun adı "event sourcing" değildir. |
| 22 | **Bilgi zamanı** | 12 motor: evren zamanı + sahne sırası (iki eksen, "bitemporal") | Dört zaman: olay tarihi, öğrenme tarihi, okura sunulma sırası, düzenleme tarihi; ayrıca eser, baskı ve dal (§3.5). |
| 23 | **Örnek veri hatası** | 12 motor JSON'u: "kralın katili" sorusuna halkın cevabı "kalp krizi" | Ölüm nedeni, fail ve kasıt ayrı iddialardır (§3.6). |
| 24 | **Tapınak: tek kayıt mı üç kayıt mı** | 12 motor: tek kayıt, sonra tek tıkla bölünür; bütün ilişkiler kendiliğinden doğru yere gider | Üç kimlik tek sayfada birlikte düzenlenir. Sonradan bölmede belirsiz ilişkiler kullanıcıya sorulur (§3.1). |
| 25 | **CRDT yerine işlem günlüğü** | 12 motor: işlem günlüğü ve mezar taşı yönlendirmesi sorunu çözer | Yönlendirme benimsendi; ama ters birleştirme, bölme ile eşzamanlı ilişki ekleme gibi durumlar inceleme ister. Gereksinimler §10'da. |
| 26 | **Kural önceliği** | 12 motor: evrensel → bölgesel → kurumsal → tekil, en alttaki kazanır | Kapsamlı kurallar benimsendi; çatışma ise sonuç olarak gösterilebilir (§9.1). |
| 27 | **Zaman çarpanı** | 12 motor: `Zaman_Akış_Katsayısı = 0.1` | Oranın yönü yazıyla belirtilir; geçiş tarihleri ve kişinin yaşadığı süre ayrı tutulur (§9.1). |
| 28 | **Dirilen türler** | 12 motor: dirilebilen türde ölüm sonrası katılım uyarısı kapanır | Ölüm, bedensiz dönem, dirilme ayrı olaylardır; dirilme olayı yoksa uyarı verilir (§9.1). |
| 29 | **Türkçe çözümleyici** | 12 motor: 2 ms altında hatasız kimlik seçimi | Kök adayı bulur, öneri yapar, belirsizlikte sorar. Hız vaadi yok (§5.1). |
| 30 | **Miras ekseni** | 12 motor: şehir enlem/boylamı bölgeden alır; işgalle para ve hukuk o gün değişir | Eksenler benimsendi ama yalnızca varsayılan olarak; koordinat kendine aittir; işgal para ve mahkemeyi kendiliğinden değiştirmez (§3.7). |
| 31 | **Gömme ve sızıntı** | 12 motor: bağlamlı gömme wiki'de gizli cümleleri kendiliğinden süzer | Bağlamlı gömme benimsendi; yayın için cümle ya da blok açıkça işaretlenir (§5.2). |
| 32 | **Sahne silinince envanter** | 12 motor: 4. sahne silinirse sonraki bakiyeler kendiliğinden güncellenir | Değişimler olaylara bağlanır; sahne silmek harcamayı geri almaz (§9.4, §17-12). |
| 33 | **Haber yayılımı** | 12 motor: "Köydeki halk bunu BİLEMEZ"; örnekte gün hesabı tutarsız (10+12 ≠ 14) | "En erken ulaşabilir" dili kullanılır; teslim ve inanma ayrıdır (§17-3). |
| 34 | **Gökyüzü ve ses** | 12 motor: aynı evre = tutulma, üç dolunay = gündüz, 40 dB = anlaşılır | Takvim döngüsü ile fiziksel model ayrı seçenekler; evrensel eşik yok (§17-6, §17-7). |
| 35 | **Kalıtım** | 12 motor: göz rengi uyuşmazlığı gizli ebeveyn ipucu | Yalnızca yazarın tanımladığı tek kurallı özelliklerde hesap; biyoloji, hukuk ve veraset ayrı (§17-8). |
| 36 | **Ekonomik şok** | 12 motor: kömür kesilince fırınlar hemen durur, kriz tetiklenir | Grafik yalnızca etkilenebilecekleri gösterir; süre için stok ve tüketim gerekir (§17-5). |
| 37 | **Daldan aktarım** | 12 motor: bağlar otomatik budanır, "temiz" karakter aktarılır | Bağımlılıklar önizlenir, sessiz budama yok (§9.5). |
| 38 | **Ses değişimi örneği** | 12 motor: "iki ünlü arası k → g" ile Velkaran → Felgaran | `Velkaran`'daki k iki ünlü arasında değil; kural zinciri her adımı göstermeli ve örnekler kurallarla tutmalı (§17-4). |
| 39 | **Birleşik sayfada bağlantı** | Teknik denetim: alan türüne göre otomatik hedef, `[[Ad#Bina]]` sözdizimi | Aday daraltılır, sessizce seçilmez; seçicide seçenekler; `#` blok bağlantısına ayrılmış kalır (§3.1). |
| 40 | **İşaretli metin silinince** | Teknik denetim: 10 saniyelik bildirimle "evren kaydını da kaldır" | Metni silmek dünya kaydını silmez; karar kalıcı listede ve önizlemeyle (§5.6a). |
| 41 | **Performans vaatleri** | Teknik denetim: "2–5 sn donar", "60 FPS garanti" | Ölçüm olmadan sayı yazılmaz; hedef olarak kalır. Hesap arka planda, sonuç sürümü belli (§17). |
| 42 | **Yeniden hesabı ne tetikler** | Teknik denetim: dayanak ağının tersi yeter | Yeni eklenen veri (yeni yol) eski sonucun dayanağında yoktur; ilgili sorgular yine yeniden değerlendirilir (§17). |
| 43 | **Günlük sıfırlama** | Teknik denetim: sıkıştırmada bütün cihaz günlükleri sıfırlanır, en çok 4–5 dosya | Veri kaybettirebilir; temizlik yalnızca doğrulanmış kontrol noktasına kadar (§10). |
| 44 | **Google oturumu** | Teknik denetim: "her saat giriş, nedeni ITP" | Yazma kesilmez; "eşitlemek için dokun" ile yenilenir. Kesin oturum modeli kodlamada seçilir (§10, §19). |
| 45 | **Belge–inanç köprüsü** | Teknik denetim: belge değişince inanç da güncellensin | İnanç okunan sürüme bağlı; düzeltme, evren içi değişiklik ve yeni öğrenme ayrı (§3.6). |
| 46 | **Fetih geçişi** | Ana tasarım (S3): resmî para siyasi üstten varsayılan + fetihte değişmez; teknik denetim: "eski kuralı geçmiş iz olarak koru" | İç çelişki kabul edildi; alan bazlı dört seçenek (§3.7). |
| 47 | **Yayın güvenliği** | Teknik denetim: arındırılmış alt-grafikle sızıntı "matematiksel olarak imkânsız" | Ayrı paket benimsendi; mutlak vaat kaldırıldı; yayın iddialardan kurulur (§11). |
| 48 | **İlişki yönü** | Ana tasarım (S3): "borçludur" tek yönlü | Yön, ters okunuş, karşılıklılık ve çokluk ayrı özellikler (§3.2). |
| 49 | **Sahipliğin düşmesi** | Ana tasarım (S3): yeni sahip gelince eskisi düşer | Yalnızca tek sahipli işaretli eşyalarda (§3.8). |
| 50 | **Gömme kipleri** | Ana tasarım (S3): "iki mod" deyip üç saymak | Dört bağımsız bağlam (§5.2). |
| 51 | **Yayımlanmış eser kilidi** | Teknik denetim F18: okura sunulan alanı kilitle | Alan değil iddia korunur; 430'da prens olanın 440'ta kral olması çelişki değildir (§18-F18). |
| 52 | **"Kesinleştirilmiş plan"** | Teknik denetim §5: 14 kararı kesinleşmiş sayıyor | Kararlar yalnızca kullanıcı onaylayınca kesinleşir; öneri ile karar ayrı tutulur (§16). |



Sürüm 5'te bu tablodaki bazı çözümler değişti: 20 numaralı satırdaki "claude.ai sayfaları Google'a bağlanamaz" gerekçesi yanlış bulunup kaldırıldı (bkz. §3.2). Güncel davranış her zaman tasarım belgesindedir.
