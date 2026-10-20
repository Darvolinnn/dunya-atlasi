# Birleşik karar listesi ve iş planı: kullanım kolaylığı ve yazar.io'dan alınacaklar

**Durum: öneri, karar bekliyor (K11).** Bu belge davranış tanımlamaz; davranışın tek kaynağı `tasarim/dunya-atlasi-tasarim.md`'dir. Son güncelleme: 20 Ekim 2026.

## 0. Devralan ajan için

### 0.1 Bu belge ne?
Dört kaynağın birleşimi ve seçilen her madde için **ne yapılacağının** ayrıntısı:
- **KD**: `analiz/kullanici-deneyimi-arastirmasi.md` §3 (benzer programlar ve ilkeler; numarasıyla, ör. KD-3).
- **Y**: `analiz/yazar-io-karsilastirma.md`. §1–7 açık sayfalardan; §8 ve §9 içeriden gezme; §10 arayüz incelemesi; §11 ek inceleme (bağlama, arama, notlar, alanlar, silme). Kullanıcı yazar.io'ya kendi Google hesabıyla girdi; incelemeyi kullanıcının Chrome eklentisi yaptı, raporları kullanıcı sohbete yapıştırdı.

### 0.2 Kullanıcı henüz seçim yapmadı
Kullanıcıya liste (B1–B13, C1–C10, D1–D3, E1) sunuldu; seçim bekleniyor. **Seçilmeyen hiçbir madde kodlanmaz.** Kullanıcı "B1, C1…" gibi numaralarla seçecek. "Benim önerim" sütunu önceki ajanın görüşüdür, karar değildir.

### 0.3 Seçilen bir madde için iş akışı (sırayla)
1. **Tasarıma işle.** Maddenin "Tasarımda nereye" satırındaki bölüme davranışı yaz. §0'daki güncelleme kurallarına uy; konu dizinini (§0.4) ve `tasarim/tasarim-gecmisi.md`'ye gerekçe satırını ekle. Yeni kural numarası gerekiyorsa (K28…) §1'e yaz.
2. **Ekranı değiştiriyorsa önce taslak göster.** Kullanıcı resimli taslak ister (önceki işlerde "taslak A / B" diye iki seçenek sunuldu, kullanıcı seçti). Taslağı Playwright ile uydurma veriden ekran görüntüsü alarak ya da basit HTML çizerek göster; ekran görüntüsü **depoya girmez**.
3. **Kodla.** Her veritabanı yazımı `EvrenVt.islemYap()` üzerinden; yeni istek `veri/api.ts` + `calisan/vt.ts` `IZINLI` + `calisan/hizmet.ts`; yeni işlem türü `alan/islem-metni.ts` + `calisan/izdusum.ts` `UYGULAYICILAR`. Arayüz metni "siz" hitabıyla, programlama terimi yok.
4. **Sına.** `uygulama/` içinde `npm run denetle`, `npm test`; ekranı değiştiren işte tarayıcı akışı (`e2e/`). Ayrıntı `DEVIR.md` §5.
5. **PR aç, CI yeşilse birleştir;** ekranı değiştiren işte birleştirmeden önce kullanıcıya ekran görüntüsü gösterip onay al.
6. **`DEVIR.md`'yi güncelle ve kullanıcıya yapılanları sade Türkçeyle anlat** (kullanıcının kalıcı isteği).

### 0.4 Değişmez sınırlar
- K1: programda yapay zekâ yok, serbest metinden anlam çıkarılmaz.
- §12.1: "yazar.io'nun kimliği kopyalanmaz." Renk, yazı tipi, kâğıt dokusu gibi görsel kimlik alınmaz; yalnız işleyiş fikirleri alınır.
- Depo herkese açık: örnekler uydurma (*Hatıra İmparatorluğu*, Lale, Deniz, Orhun, Hafıza Divanı); ekran görüntüsü ve gerçek içerik yok.
- Tablet ve telefon düzenleri kullanıcı kararıyla ertelendi.

## A. Zaten var, korunacak (karar gerekmez)

Kodda ve tasarımda denetlendi:
- Ctrl+K komut paleti; boşken son açılan kayıtlar; arama ad, çekimli biçimden kök, lakap, önceki ad, okunuş, özet ve **metin içinde** (`hizmet.ts` `ara`, `metinde`), Türkçe harfsiz yazımla (`alan/turkce.ts` `katla`).
- Bağlantının üzerine gelince kayıt özeti kartı (`arayuz/Calisma.tsx` `ozetAc`); yazar.io'da yok.
- Aynı adlı kayıtları ayırt etme satırı (tür · özet; `Calisma.tsx` `ayirtEtme`, F19). yazar.io'da iki aynı ad ayırt edilemiyor.
- Türkçe ek modülü ve çekimli biçimden kök bulma (`alan/turkce-ek.ts`, §5.1).
- Ad düzeltmesinde metindeki bütün görünen ifadelerin ek uyumuyla önizlenip onayla değişmesi (`hizmet.ts` `adDegistir`, §5.1). yazar.io'da metin eski adla kalıyor.
- Kayıt sayfasında "Bu kayda bağlananlar" (istek `baglananlar`).
- Her şeyin kendiliğinden kaydedilmesi ve "Kaydedildi · saat" göstergesi (`MetinEditoru.tsx`); kaydetmeden çıkış uyarısı gerekmez.
- Kayıt sayfasında boş alanların gizlenmesi (Aşama C).
- İlk adımlar, "Yap" düğmeleri, yazarlık rehberi, her soruda Örnek.
- Bütün kayıtlar için çöp kutusu, sürüm geçmişi, Değişiklik geçmişi, Kayıtlı anlar; yazar.io'da karakter/mekân/olay kalıcı siliniyor.
- Açık ve koyu tema; WCAG 2.2 AA kuralı tasarımda (§12.1).
- Markdown/JSON içe aktarma (önce rapor, ayrı evrene yazar; `calisan/ice-aktarim.ts`); Markdown, EPUB, yazdırılabilir çıktı (`arayuz/Cikti.tsx`).
- Uyarıların yazma ekranında değil ayrı sayfada olması (KD-15, §5.10).

## B. Küçük çaba

Özet tablo; ayrıntılar aşağıda.

| No | Öneri | Kaynak | Benim önerim |
|---|---|---|---|
| B1 | Yazma ekranında sessiz kelime sayacı | KD-1 | Al |
| B2 | Odak kipi | KD-2 | Al |
| B3 | Silmede onay yerine "Geri al" şeridi | KD-3, Y §10 | Sizin kararınız |
| B4 | Boş sayfaların gözden geçirilmesi, "+ Yeni" kartı | KD-4, Y §10 | Al |
| B5 | Son yedeğin görünmesi | KD-5 | Al |
| B6 | Kısayolların görünmesi | KD-6, Y §11 | Al |
| B7 | Yol satırı, son açılanlar, menüde bulunulan bölüm | KD-7, Y §10 | Al |
| B8 | Palet sonucunda bulunan metin parçası | Y §10, §11 | Al |
| B9 | Bağlananların "andıkları / ananlar" diye ayrılması | Y §10 | Al |
| B10 | Tür başına sabit renk | Y §10; §12.1 zaten istiyor | Al |
| B11 | Okunurluk (karşıtlık) denetimi | Y §10; §12.1 zaten istiyor | Al |
| B12 | Sayfa yardımından yazarlık rehberine bağ | KD-14 | Al |
| B13 | `[[` yanında `@` ile bağlantı | Y §10, §11 | Sizin kararınız |

### B1. Yazma ekranında sessiz kelime sayacı
- **Ne:** Metnin altında, "Kaydedildi" göstergesinin yanında soluk tek satır: "Bu sahne 1.240 kelime · bugün +312". Hedef, renk ve uyarı yok.
- **Nasıl:** Sahne kelime sayısı editör belgesinden sayılır. "Bugün yazılan" için gün başındaki sayı cihazda (localStorage, evren+sahne+tarih anahtarıyla) tutulur; eşitlenmez, veritabanına yazılmaz. Yalnız metin içeriği sayılır (bağlantı görünen metni dahil).
- **Dokunulacak yerler:** `arayuz/MetinEditoru.tsx` (durum satırı, ~620. satır `kayitli`), gerekirse `arayuz/YazEkrani.tsx`.
- **Tasarımda nereye:** §5.10 Yaz düzeni maddesi.
- **Kabul:** Yazınca sayı artar; gün değişince "bugün" sıfırlanır; sahne değişince o sahnenin sayısı görünür; sınama: kelime sayma işlevi için birim sınaması (Türkçe kesme işaretli kelimeler tek sayılır).

### B2. Odak kipi
- **Ne:** Yaz ekranında düğme ve kısayol (öneri: `Ctrl+Shift+F`; F11 tarayıcının). Sol gezinti, eser ağacı, bağlam paneli ve "sıradaki adım" satırı gizlenir; metin ortada kalır. Esc ya da aynı düğme geri döndürür. Seçim cihazda hatırlanır.
- **Nasıl:** Kabuğa bir sınıf (`odak-kipi`) eklenir; CSS ile paneller gizlenir. Veritabanına yazılmaz.
- **Dokunulacak yerler:** `arayuz/Kabuk.tsx`, `arayuz/YazEkrani.tsx`, `arayuz/stil.css`, palete komut (`Calisma.tsx` komutlar listesi).
- **Tasarımda nereye:** §5.10; kısayol §12.2.
- **Kabul:** Kısayol, düğme ve palet komutu çalışır; Esc çıkar; e2e akışı.

### B3. Silmede onay sorusu yerine "Geri al" şeridi (kullanıcı kararı gerekir)
- **Ne:** Çöp kutusuna giden işlerde (kayıt, sahne, ilişki, harita işareti, olası finali listeden çıkarma…) iş hemen yapılır; altta birkaç saniye "Çöp kutusuna taşındı · Geri al" şeridi görünür. Onay sorusu yalnız geri dönüşü olmayan işlerde kalır (evreni bu cihazdan kaldırmak, çöp kutusunu boşaltmak, yedeği üzerine yazmak).
- **Neden kararı gerekir:** 20 Ekim'de bütün silmelere onay sorusu eklendi (`1966ff0`). Bu madde o kararı değiştirir.
- **Nasıl:** `arayuz/onay.ts` bugün `window.confirm`; yerine ortak bir `geriAlinabilir(yap, geriAl, ileti)` yardımcısı ve kabukta tek bir şerit bileşeni. Geri alma, işlemin tersini yeni bir işlem olarak yapar (§10.8 "geri almanın türleri"); çöp kutusundan geri getirme isteği zaten var.
- **Dokunulacak yerler:** `arayuz/onay.ts` ve onu çağıran yaklaşık 50 yer (`grep -rn "onayla(" uygulama/src/arayuz`); her çağrı "geri dönüşü var mı" diye tek tek sınıflanır.
- **Tasarımda nereye:** §10.8 ve §2.1 ("her işlem geri alınabilir").
- **Kabul:** Silinen kayıt "Geri al" ile aynı yerine döner; şerit kapandıktan sonra çöp kutusundan da döner; geri dönüşü olmayan işler hâlâ sorar; e2e akışı.

### B4. Boş sayfalar ve "+ Yeni" kartı
- **Ne:** Her sayfanın boş hâlinde: bir cümlede ne işe yaradığı, tek bir ilk adım düğmesi, yazarlık rehberinde ilgili konuya bağ. Başlık "henüz yok" değil "ilk … ekleyin". Kart biçimli listelerin sonunda kesik çizgili "+ Yeni …" kartı.
- **Nasıl:** Önce bütün sayfaların boş hâllerini dökümle (`arayuz/` altında boş liste dallarını ara: `length === 0`, "Henüz"). Metinleri tek tabloda topla, kullanıcıya göster, sonra uygula.
- **Dokunulacak yerler:** Haritalar, Takvim, Grafikler, Kayıtlar, Konu dosyaları, Karar bekleyenler, Şablonlar, Eksik kayıtlar, Çöp kutusu vb. sayfaların boş dalları.
- **Tasarımda nereye:** §12.4 (sayfa rehberi ve dil).
- **Kabul:** Yeni bir evrende her sayfa açıldığında bir cümle + bir düğme görünür; düğme işi yapar.

### B5. Son yedeğin görünmesi
- **Ne:** Durum özetinin kapalı başlığında da son doğrulanmış yedeğin zamanı ("Son yedek: dün 21:04 · doğrulandı"); Genel bakışta da aynı satır. Bir haftadan eskiyse "Şimdi yedekle" düğmesi.
- **Durum:** §10.8 yedek 7 günden eskiyse satırın sarı olmasını zaten tanımlar; istek `sonYedek` var (`arayuz/Esitleme.tsx`). İş, bilginin kapalı başlıkta ve Genel bakışta görünmesi.
- **Dokunulacak yerler:** `arayuz/Esitleme.tsx`, `arayuz/Masa.tsx`.
- **Tasarımda nereye:** §10.8.
- **Kabul:** Yedek alınınca satır güncellenir; 7 günü geçen yedekte düğme çıkar.

### B6. Kısayolların görünmesi
- **Ne:** Palette her komutun yanında kısayolu; düğme ipuçlarında (title) kısayol; "Kısayollar" listesi (palette "kısayol" yazınca da bulunur, `?` tuşu metin dışındayken açar). Türkçe klavye notu: `[` = AltGr+8.
- **Dokunulacak yerler:** `arayuz/Calisma.tsx` (`Oge` tipine `kisayol`), yeni küçük bir liste bileşeni, `SayfaYardimi.tsx`.
- **Tasarımda nereye:** §5.8 ve §12.2.
- **Kabul:** Bütün tanımlı kısayollar listede; liste koddaki kısayollarla aynı kaynaktan üretilir (tek tablo), elle ayrıca yazılmaz.

### B7. "Neredeyim" çizgisi, son açılanlar, menüde bulunulan bölüm
- **Ne:** (a) Yaz ekranında metnin üstünde tıklanabilir yol satırı: Seri › Eser › Bölüm › Sahne. (b) Palet boşken son açılanlar: **zaten var**. (c) Bir kayıt sayfasındayken sol menüde ilgili bölüm (ör. Kayıtlar) seçili kalsın; yazar.io'da kayboluyor.
- **Dokunulacak yerler:** `arayuz/YazEkrani.tsx` (yapı bilgisi `yapilar` zaten okunuyor), `arayuz/Kabuk.tsx` (menü vurgusu adres eşleşmesi).
- **Tasarımda nereye:** §5.10.
- **Kabul:** Her sahnede yol satırı doğru; kayıt, harita ve görünüm sayfalarında menüde bir öğe seçili.

### B8. Palet sonucunda bulunan metin parçası
- **Ne:** Kayıt adıyla değil metninden ya da lakabından bulunduysa, sonuç satırının altında soluk bir satır: metindeyse aranan kelime kalın olarak çevresi; lakap/önceki ad/okunuşsa "lakabı: …".
- **Durum:** `ara` isteği `nereden` ve `parca` alanlarını zaten döndürüyor (`veri/api.ts` `AramaSonucu`); palet yalnız `ayirtEtme` gösteriyor (`Calisma.tsx` ~458. satır). **Yalnız arayüz işi.**
- **Ek (isteğe bağlı):** sonuçları türe göre gruplamak (yazar.io'da beğenildi).
- **Kabul:** Metin içinde geçen bir kelimeyle arayınca parça görünür; e2e.

### B9. "Bu kaydın andıkları" ve "Bu kaydı ananlar"
- **Ne:** Kayıt sayfasında bugünkü "Bu kayda bağlananlar" bölümü ("ananlar") korunur; yanına bu kaydın metninde bağlantı verdiği kayıtlar ("andıkları") eklenir. İlişkiler (Iliskiler bölümü) bunlardan ayrı kalır.
- **Nasıl:** Yeni istek (ör. `andiklari`): kaydın metnindeki bağlantı işaretlerinden hedefleri toplar (bağlantı tablosu bugün `baglananlar` için ters yönde okunuyor; aynı tablo düz yönde okunur).
- **Dokunulacak yerler:** `calisan/hizmet.ts`, `veri/api.ts`, `calisan/vt.ts` `IZINLI`, `arayuz/KayitEkrani.tsx` (~434. satır).
- **Tasarımda nereye:** §3 bağlantı modeli ve §7 kayıt sayfası.
- **Kabul:** A'nın metninde B'ye bağlantı varsa A'da "andıkları: B", B'de "ananlar: A"; sınama.

### B10. Tür başına sabit renk
- **Ne:** Her tür grubuna (insanlar, yerler, kültür, işleyiş, zaman, anlatı) soluk bir renk; tür rozeti, ağdaki düğüm, listeler ve palet aynı rengi kullanır. Renk tek başına bilgi taşımaz; kısa ad (Kr, Me…) kalır.
- **Durum:** §12.1 "türler için soluk renkli küçük sekmeler" diyor; bugün bütün `tur-rozeti`ler aynı renkte (`stil.css` ~95. satır). Kural var, uygulama eksik.
- **Nasıl:** `alan/turler.ts` gruplarına renk anahtarı; `stil.css`'te açık ve koyu tema için grup başına iki değişken (zemin, yazı), ikisi de en az 4,5:1.
- **Kabul:** Bütün rozetlerde grup rengi; karşıtlık sınaması (B11 ile).

### B11. Okunurluk denetimi
- **Ne:** Bütün yazı renkleri açık ve koyu temada en az 4,5:1 (büyük yazı 3:1); odak çerçevesi belirgin; 12 pikselden küçük italik açıklama yok. Tasarım kuralı §12.1'de zaten var; iş bir kez ölçmek ve düzeltmek.
- **Nasıl:** `stil.css` renk değişkenlerinin karşıtlığını hesaplayan küçük bir sınama (vitest) yazılır; bundan sonra yeni renk eklenince de çalışır.
- **Kabul:** Sınama yeşil; e2e'de Tab ile odak görünür.

### B12. Sayfa yardımından yazarlık rehberine bağ
- **Ne:** Her sayfanın yardım düğmesinde ("Bu sayfa ne işe yarar") altta "Bu iş neden yapılır?" ve yazarlık rehberinde ilgili konu.
- **Nasıl:** Sayfa → rehber konu numarası eşleme tablosu; `yazarlikRehberiAc(no)` zaten var.
- **Dokunulacak yerler:** `arayuz/SayfaYardimi.tsx`, `arayuz/rehber-metinleri.ts`.
- **Tasarımda nereye:** §12.4.
- **Kabul:** Eşlemesi olan her sayfada bağ çalışır.

### B13. `@` ile de bağlantı açmak (kullanıcı kararı gerekir)
- **Ne:** `[[` gibi `@` da aynı seçim kutusunu açar. Türkçe klavyede `[` AltGr+8 ile yazılıyor; `@` (AltGr+Q) da AltGr ister ama tek tuştur.
- **Dikkat:** E-posta adresi ya da "@" içeren metin yazarken kutu açılmamalı: yalnız kelime başında (önünde boşluk ya da satır başı) açılsın; Esc kapatır ve `@` düz kalır.
- **Dokunulacak yerler:** `arayuz/baglanti-eklentisi.ts`.
- **Tasarımda nereye:** §5.1 ("`[[` tek yol değildir").
- **Kabul:** "x@y" yazınca kutu açılmaz; " @Lal" yazınca açılır.

## C. Orta çaba

| No | Öneri | Kaynak | Benim önerim |
|---|---|---|---|
| C1 | Notlara tür ve durum, duruma göre süzme | Y §8, §11 | Al |
| C2 | Yeni evrende tür seçimi, ilgisiz bölümler gizli | Y §8, §9 | Al |
| C3 | İsteğe bağlı, suçlatmayan yazma hedefi | KD-8 | Sizin kararınız |
| C4 | Boş sahnede başlama yardımı | KD-9 | Al |
| C5 | Haftalık yazı / dünya kurma dengesi satırı | KD-10 | Sizin kararınız |
| C6 | İleri araçların zamanı gelince bir kez tanıtılması | KD-11, Y §9–10 | Al |
| C7 | Kayıt sayfasında önce 3 soru | KD-12 | Al |
| C8 | Alıntılar kayıt türü | Y §5-4 | Sizin kararınız |
| C9 | Hazır kayıt türlerinin gözden geçirilmesi | Y §5-5 | Sizin kararınız |
| C10 | Soy ağacında özel bağlar | Y §8 | Sizin kararınız |

### C1. Notlara tür ve durum
- **Ne:** Not kaydına iki sabit alan: **tür** (sahne fikri, diyalog, dünya kuralı, karakter fikri, araştırma, **çelişki/kontrol**, diğer) ve **durum** (fikir → geliştiriliyor → kontrol edilecek → kullanıldı; ayrıca arşivlendi). Not listesinde türe ve **duruma** göre süzme ve sayılar (yazar.io'da duruma göre süzme yok). Durum, karttaki rozete tıklanarak doğrudan değişir (yazar.io'da Düzenle → Kaydet gerekiyor).
- **Dikkat:** Bu "kayıt karar durumu" (fikir · kesinleşmiş · vazgeçilmiş, §3) ile karışmamalı; ad farklı olmalı (öneri: "Notun durumu"). "Çelişki/kontrol" notu Karar bekleyenler sayfasında da listelenir; **ikinci bir mesele listesi açılmaz**.
- **Nasıl:** `alan/sablon.ts` varsayılan şablonlarına `not: { alanlar: [tür, durum (sabit: true)] }` — `acik_mesele` örneğindeki gibi (`MESELE_DURUMLARI`). Şablonu değiştirilmiş eski evrenlerde kendiliğinden eklenmez (P2'deki kural; `test/anlati-sorulari.test.ts` örneği).
- **Dokunulacak yerler:** `alan/sablon.ts`, not listesi ekranı (`arayuz/KayitListesi.tsx` ya da Karar bekleyenler), `arayuz/HizliNot.tsx` (hızlı notta tür seçimi isteğe bağlı).
- **Tasarımda nereye:** §4.6 (not kaydı), §6 (açık meseleler ile ilişkisi).
- **Kabul:** Durum tıklanarak değişir; süzme sayıları doğru; çelişki notları Karar bekleyenlerde görünür; sınama.

### C2. Yeni evrende tür seçimi
- **Ne:** Yeni evren oluştururken isteğe bağlı "Ne yazıyorsunuz?" seçimi: fantastik, bilimkurgu, tarihî, gerçekçi/çağdaş, polisiye/gizem, diğer. Seçime göre bazı kayıt türleri ve sayfalar "Diğer" altına katlanır (ör. gerçekçide büyü sistemi, canlı türü, para birimi). Hiçbir şey silinmez; ayardan sonra değiştirilebilir. Metin: "Gizlediğiniz bölümlerin kayıtları silinmez, yalnızca menüden kalkar."
- **Nasıl:** Evren ayarına `tur_secimi` (evren anahtarı, işlemle yazılır, eşitlenir). Görünürlük tablosu `alan/` altında saf bir eşleme olarak tutulur.
- **Dokunulacak yerler:** `arayuz/EvrenlerEkrani.tsx` (oluşturma), `arayuz/Kabuk.tsx` (menü), yeni kayıt tür seçimi (`Calisma.tsx`), `alan/islem-metni.ts` (yeni işlem türü gerekirse).
- **Tasarımda nereye:** §4 giriş ve §5.10 (gezinti).
- **Kabul:** Gerçekçi seçilince büyü türleri yeni kayıt listesinde "Diğer türler" altında; ayardan açılınca geri gelir; iki cihazda aynı.

### C3. İsteğe bağlı yazma hedefi (kullanıcı kararı gerekir)
- **Ne:** Eser sayfasında isteğe bağlı hedef: kelime, sahne sayısı ya da süre; isterseniz son tarih ve yazmayacağınız günler. Günlük pay kendiliğinden hesaplanır, kaçan gün ertesine yayılır. Seri sayacı ve kırmızı uyarı yok; hedef açılmadıkça hiçbir şey görünmez.
- **Gerekir:** B1'in sayımı; günlük yazılanın eşitlenmesi istenirse yeni bir işlem türü (cihazlar arası toplam).
- **Tasarımda nereye:** §5.10 ve eser kaydı (§4.6).

### C4. Boş sahnede başlama yardımı
- **Ne:** Yeni ve boş bir sahne açılınca metin alanında soluk, yazınca kaybolan yardım: önceki sahnenin son paragrafı ("Önceki sahne şöyle bitti: …") ve sahne planının ilk üç sorusu (tek tıkla planı açar). Hiçbiri metne yazılmaz.
- **Nasıl:** Önceki sahne, eser yapısındaki sıradan bulunur (`yapilar`/`anlati` sırası). Son paragraf metin belgesinden okunur.
- **Dokunulacak yerler:** `arayuz/YazEkrani.tsx`, `arayuz/MetinEditoru.tsx` (yer tutucu), `arayuz/Sablon.tsx` `SahnePlani`.
- **Tasarımda nereye:** §5.10 ve §5.5.
- **Kabul:** İlk sahnede yalnız plan soruları; ikinci sahnede önceki sahnenin sonu; bir harf yazınca kaybolur.

### C5. Yazı ve dünya kurma dengesi (kullanıcı kararı gerekir)
- **Ne:** Genel bakışta haftalık satır: "Bu hafta: 4 sahnede 2.300 kelime · 11 kayıt düzenlendi". İki haftadır sahne yazılmadıysa bir kez, kapatılabilir not ve rehberde ilgili konu. Yalnız sayım (K1 ile uyumlu).
- **Nasıl:** İşlem günlüğünden haftalık sayım (metin işlemleri ile kayıt işlemleri ayrı).
- **Tasarımda nereye:** §5.9 (Genel bakış / Şimdi).

### C6. İleri araçların zamanı gelince tanıtılması
- **Ne:** İlk adımlar bittikten sonra, bir araç ilk kez anlamlı olduğunda tek satır, bir kez: "Eserinizde 10 sahne oldu. Olay örgüsü masasında hepsini bir arada görebilirsiniz · Göster · Bir daha gösterme". Örnekler: 10 sahne → Olay örgüsü; ikinci karakter → İlişki ağı; ilk tarih → Zaman çizelgesi; ilk mekân → Haritalar; ikinci eser → Seri.
- **Dikkat:** yazar.io'nun her sayfada değişen, kapatılamayan ipucu satırının tersi: aynı anda en çok bir tanıtım, yalnız Yaz dışında, kapatılınca bir daha çıkmaz. Koşullar kaydedilmiş veriden okunur (İlk adımlardaki gibi; K1).
- **Nasıl:** `arayuz/IlkAdimlar.tsx`'teki `SiradakiAdim` satırı ve `useIlkAdimlar` altyapısı genişletilir; "gösterildi" bilgisi cihazda.
- **Tasarımda nereye:** §5.10 İlk adımlar maddesinin devamı.
- **Kabul:** Koşul oluşunca bir kez çıkar; "Bir daha gösterme" sonrası çıkmaz; e2e.

### C7. Kayıt sayfasında önce üç soru
- **Ne:** Her türün en önemli üç sorusu açık; öbürleri "Daha fazla soru (12)" altında. Hangi üçünün öne çıkacağı şablonda seçilir (varsayılan: setin ilk üçü).
- **Dokunulacak yerler:** `alan/sablon.ts` (`Soru.one?: boolean` ya da sıra), `arayuz/Sablon.tsx` `SablonAlanlari`, Şablonlar ekranı.
- **Tasarımda nereye:** §6 ve Ek A.
- **Kabul:** Cevaplanmış soru her zaman görünür (gizlenmez); yalnız boş ve öne çıkmayanlar katlanır.

### C8. Alıntılar kayıt türü (kullanıcı kararı gerekir)
- **Ne:** Söz, şarkı, kehanet, yazıt için kısa kayıt: metin, kimin söylediği (ilişki), hangi sahnede geçtiği (ilişki), türü. Kehanet ise kurgu hattı ipucu takibine bağlanabilir.
- **Not:** yazar.io'nun "Alıntılar"ı paylaşım görseli üreten bir araç; burada önerilen şey o değil.
- **Nasıl:** `alan/turler.ts`'e tür (`alinti`), `alan/sablon.ts`'e alanlar; ilişki türleri `alan/iliski-turleri.ts`.
- **Tasarımda nereye:** §4.3 ya da §4.6; K11 nedeniyle önce §16'ya Öneri satırı.

### C9. Hazır kayıt türlerinin gözden geçirilmesi (kullanıcı kararı gerekir)
- **Durum:** Programda eşya, inanç/mezhep, canlı türü/bitki, büyü sistemi, büyü uygulaması **zaten var** (`alan/turler.ts`). Eksik görünen: ırk/halk (canlı türünden ayrı), yetenek. Bunların çoğunun soru seti yok (`alan/sablon.ts` yalnız karakter, mekân, şehir, siyasi, topluluk, büyü, kültür, dil ve anlatı türlerinde soru taşıyor).
- **Ne:** Soru seti olmayan türlere (eşya, inanç, canlı, teknoloji…) 4–6 soru ve her soruya Örnek (`alan/soru-ornekleri.ts`, Hatıra İmparatorluğu'ndan).
- **Tasarımda nereye:** Ek A.

### C10. Soy ağacında özel bağlar (kullanıcı kararı gerekir)
- **Ne:** Soy ağacında aile bağlarının yanında isteğe bağlı olarak düşman, sevgili, vasi gibi ilişkilerin farklı çizgiyle gösterilmesi (açılıp kapanır).
- **Önce denetle:** `arayuz/Soy.tsx` ve `calisan/soy.ts` hangi ilişkileri çiziyor; ilişki ağında zaten görünüyorsa iş yalnız soy ağacına katman eklemek.

## D. Büyük çaba

| No | Öneri | Kaynak | Benim önerim |
|---|---|---|---|
| D1 | Uydurma örnek evren | Y §5-1, §8; KD-13 | Al (önce içerik) |
| D2 | Okur için spoiler'sız çıktı | Y §5-6, §8, §11 | Sonraya |
| D3 | Word'den içe aktarma | Y §5-8 | Sonraya |

### D1. Uydurma örnek evren
- **Ne:** Evrenler sayfasında "Örnek evreni aç": *Hatıra İmparatorluğu* serisinden 2 eser, birkaç bölüm ve sahne (kısa metinler), 10–15 kayıt (Lale, Deniz, Orhun, Hafıza Divanı, arşiv…), ilişkiler, bir takvim, olası finaller, okuma yolu, kurgu hattı ve okurun bilgisi. Ayrı bir evren olarak açılır, kullanıcının evrenine karışmaz; istenince kaldırılır.
- **Nasıl:** İçerik `analiz/yazarlik-ve-roman-serisi-calisma-rehberi.md`'deki örnek seriden yazılır. Program içine JSON paketi olarak gömülür ve var olan içe aktarma yoluyla (`calisan/ice-aktarim.ts`) yeni evrene yazılır. Depo herkese açık; içerik tamamen uydurma olmalı.
- **Sıra:** önce içerik taslağı kullanıcıya gösterilir, sonra kod.
- **Tasarımda nereye:** §5.10 (ilk adımlar) ve §10.11 (içe aktarma).

### D2. Okur için spoiler'sız çıktı
- **Ne:** "Şu kitaba kadar okurun bildikleri" süzgeciyle seçilen kayıtların tek dosyalık sayfası (sunucuya yayımlama değil, dosya). Program okurun neyi ne zaman öğrendiğini bildiği için yazar.io'nun wikisinden güçlü olur (yazar.io'da spoiler gizleme yok).
- **Tasarımda nereye:** §11 (paylaşım ve yayın).

### D3. Word'den içe aktarma
- **Ne:** .docx ya da düz metin bölümlerini başlıklarına göre bölüm ve sahnelere bölerek almak. Markdown/JSON içe aktarma zaten var; .docx okuma eklenmeli (zip içindeki XML; `alan/zip.ts` var).
- **Tasarımda nereye:** §10.11.

## E. Tasarım kuralıyla çelişebilecek (kullanıcı kararı gerekir)

### E1. Bağlanmamış adlar için "bağla?" önerisi
- **yazar.io'da (Y §11):** Kaydederken adla kendiliğinden bağlıyor; ekli biçimleri tanıyor; büyük-küçük harfe duyarlı; aynı adlı iki kayıtta sessizce en yeniye bağlıyor; kapatma ayarı yok; yazar bağlantıyı silip adı yeniden yazınca tekrar bağlıyor.
- **Önerilen biçim:** Kendiliğinden bağlama **yok**. Kayıt ya da sahne sayfasında katlı tek satır: "Bu metinde bağlantısız geçen 3 ad var · Göster". Açılınca her biri için "Bağla" / "Bu sefer değil" / "Bu adı hiç önerme". Eşleşme yalnız kayıt adı, lakap ve önceki adların Türkçe ekli biçimlerine (var olan `kokAdaylari`) **birebir** bakar; büyük-küçük harf ve Türkçe harfler `katla` ile. Aynı adlı iki kayıt varsa ayırt etme satırıyla seçim ister. Yazarken açılan öneri yok (yazmayı bölmesin, §5.10).
- **K1 sorusu:** K1 "serbest metinden anlam çıkarılmaz" der. Bu öneri anlam çıkarmaz, yalnız ad eşleştirir; ama metni tarayan bir özelliktir. Kullanıcı bunu K1'e uygun bulursa tasarıma §5.1'e girer; bulmazsa F listesine "alınmayacak" olarak yazılır.

## F. Alınmayacaklar

- Elle kaydetme, kaydetmeden çıkış uyarısı, uzun formda ekrandan kaybolan Kaydet düğmesi.
- Adla **kendiliğinden** bağlama ve yazar sildikten sonra yeniden bağlama (Y §11); aynı adlı kayıtta sessizce birini seçme.
- Ad değişince metindeki bağlantının eski adla kalması (bizde önizlemeli düzeltme var).
- Alan silerken değerin onaysız gitmesi (Y §11). Bizde bir alan silinince değeri ya geri alınabilir olmalı ya da sorulmalı; B3 kararıyla birlikte ele alınır.
- Kalıcı kayıt silme (bizde her şey çöp kutusuna gider).
- Her sayfada değişen, kapatılamayan ipucu satırı; rastgele özlü söz kutusu gibi süsler.
- "Sen" ve "siz" karışık hitap (program "siz" der).
- Ne olduğunu söylemeyen menü adları ("Wiki"nin ayarlara gitmesi gibi).
- Soluk, düşük karşıtlıklı yazılar; 9–12 piksellik italik açıklamalar.
- Kısa tanımda her kelimenin büyük harfle başlaması; düzeltilmiş hatanın yazısının ekranda kalması.
- Serbest metin tarih (programda gerçek takvimler var).
- Verinin şirket sunucusunda tutulması; herkese açık yazar profili.
- yazar.io'nun görsel kimliği (renkler, yazı tipleri, kâğıt dokusu; §12.1).
- Yapay zekâ (K1); rozet, puan, seri sayacı gibi oyunlaştırma; açılışta zorunlu tanıtım turu.
- Tablet ve telefon özel düzenleri (kullanıcı kararıyla ertelendi).
