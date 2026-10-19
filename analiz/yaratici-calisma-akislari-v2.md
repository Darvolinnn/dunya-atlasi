# Yaratıcı çalışma akışları (v2)

> **Belge türü:** Tasarım önerisinin kabul senaryoları; bağlayıcı değil.
>
> Kavramların tek tanımı [veri ve kavram modeli](roman-serisi-veri-ve-kavram-modeli.md) ("Model §n"), ekranlar [ürün tasarımı v2](rehberli-yazarlik-urun-tasarimi-v2.md) ("Tasarım §n"). Etiketler: **[main]** `main`'de var · **[#5]** yalnız açık birleştirme isteği #5'te · **[öneri]**.
>
> Her akışta: **Önkoşul · Eylemler ve sonuç · Saklanan · Geri alma · İki cihaz · Olumsuz · Kabul.** Örnekler *Hatıra İmparatorluğu*'ndandır (uydurma).

---

## A. Başlangıç

### A1 — Sahneden başlayan yazar

- **Önkoşul:** Yeni evren; İlk adımlar görünür [#5]; yol varsayılan "Bir sahneyle".
- **Eylemler ve sonuç:**
  1. "Eser oluştur" → **ad alanı boşken düğme pasiftir** [main: `YazEkrani.tsx:187`]. Yazar ad yazar: "Unutulanlar". Adım ✓.
  2. "Sahne ekle" → sahne açılır [main]. Adım ✓.
  3. Metinde "Lale"yi seçip **Bağla** → yeni karakter, *fikir* durumunda [main]. Adım ✓.
  4. Bağlam panelinde mekân: "Başkent arşivi" [main]. Adım ✓; liste kapanır.
- **Saklanan:** eser, sahne, metin, karakter, mekân, `sahne_yeri` ilişkisi. Hepsi işlem günlüğünde.
- **Geri alma:** Her adım bugünkü geri almayla geri alınır; geri alınan adım ✓ olmaktan çıkar (dayanak yok).
- **İki cihaz:** Adım durumları veriden okunur; iki cihazda aynı.
- **Olumsuz:** Sahne planı paneli (Tasarım §4) açılmadıysa hiçbir soru, sayı ya da renk görünmez.
- **Kabul:** Rehbere dokunmayan yazar sahneye en çok 3 eylemde ulaşır (eser adı, oluştur, sahne ekle).

### A2 — Hikâye fikriyle başlayan yazar

- **Önkoşul:** Yeni evren; yol "Bir hikâye fikriyle" [öneri].
- **Eylemler ve sonuç:**
  1. "Fikri not alın" → hızlı not [main]: *"Kardeşini arayan bir arşiv memuru, devletin bir isyanı halkın belleğinden sildiğini keşfeder."* Adım ✓ (boş olmayan not).
  2. "Bu nottan eser oluştur" → eser "Unutulanlar"; not ↔ eser `nottan` bağı [main]. Adım ✓.
  3. Eser sayfasında `cekirdek` soruları [öneri]. Yazar 1. soruya cevap yazar; "Nottan al" ile notun metnini alıntılar. Cevabın yanında "Kaynak: not" yazar. Adım ✓.
  4. İlk sahne. Adım ✓.
- **Saklanan:** not, eser, bağ, `cekirdek.1` cevabı.
- **Olumsuz:** `baslangic.1` ("Temel fikir: evreni farklı kılan kural") **doldurulmaz, değişmez** (Model §1). Not metni değişince çekirdek cevabı değişmez (alıntı tek seferliktir).
- **Kabul:** Eser açmadan fikir kaydı mümkün; nottan esere geçişte not kaybolmaz.

### A3 — Dünyadan başlayan yazar

- **Önkoşul:** Yeni evren; yol "Bir dünyayla" [öneri].
- **Eylemler ve sonuç:**
  1. "Dünyanın kuralı": Dünya Pusulası 4. soru cevaplanır **ya da** bir `evren_kurali` kaydı açılır [main]. Adım ✓.
  2. "Güç ve bedeli" (Pusula 3) → yazar "Geç" der. Adım **◦ geçildi**, onay işareti yok.
  3. "Bir yer": `sehir` kaydı "Başkent" [main]. Adım ✓ (mekân, şehir ya da siyasi varlık sayılır, Model §2.1).
  4. Yazar aylarca yalnız kayıt kurar.
- **Olumsuz:** Hiçbir yerde "henüz eseriniz yok" yazmaz. Şimdi kartı eser önermez; son düzenlenen kaydı gösterir.
- **Kabul:** Rota, yolculuk ya da eşya kaydı "bir yer" adımını ✓ yapmaz.

### A4 — Karakterden başlayan yazar

- **Önkoşul:** Yeni evren; yol "Bir karakterle" [öneri].
- **Eylemler ve sonuç:**
  1. Karakter "Lale" [main]. Adım ✓.
  2. "En çok ne istiyor?" cevaplanır [main]. Adım ✓.
  3. "Karşıt güç": yazar karakter sayfasında "Karşıt karakter" setini ekler ama **cevap yazmaz.** Adım ✓ **olmaz** (Model §2.1). Yazar Orhun'u oluşturup Lale ile `dusman` ilişkisi kurar → adım ✓.
  4. Lale'nin *bulunuyor* rolüyle katıldığı sahne. Adım ✓.
- **Kabul:** Boş soru seti eklemek adımı tamamlamaz; ilişki ya da `karsit.1` cevabı tamamlar.

### A5 — Seri planıyla başlayan yazar

- **Önkoşul:** Yeni evren; `seri` türü kodlanmış (P4) [öneri].
- **Eylemler ve sonuç:**
  1. "Seri oluştur": "Hatıra İmparatorluğu". Adım ✓.
  2. Seri sayfasında `seri.1`: "Bellek bir kaynağa dönüşünce özgürlük mümkün mü?" Adım ✓.
  3. "Seriye ilk kitap": eser "Unutulanlar" ağaçta serinin altında. Adım ✓.
  4. İlk sahne. Liste kapanır.
- **Olumsuz:** Seri yolu seçilip eser seriye konmadan açılırsa 3. adım ✓ olmaz; ama yazmaya izin verilir.

### A6 — Rehberi istemeyen yazar

- **Eylemler ve sonuç:** İlk adımlar "Gizle" [#5]; Masa'da "Başlamak için" "Atla" [main]; Şimdi kartında "Rehber önerilerini kapat" [öneri].
- **Saklanan:** Gizle ve kapat cihazda; "Atla" üç soruyu `sonra` yapar (evren, eşitlenir).
- **Olumsuz:** "Atla" ile ertelenen başlangıç soruları Şimdi kartında **hiç** önerilmez (Model §2 kural 3). Hiçbir rehber kendiliğinden açılmaz.
- **Kabul:** "Gizle", "Atla" ve "kapat" yeni kayıt oluşturmaz; yazma ekranı rehbersiz olarak #5'teki hâliyle aynıdır.

### A7 — Yolunu değiştiren yazar

- **Eylemler ve sonuç:** "Seri planıyla" başlar → iki adım ✓ → "Bir dünyayla"ya geçer → harita, şehir → "Bir sahneyle"ye döner.
- **Kabul:** Yol değişikliği işlem günlüğüne işlem yazmaz. Her yolda zaten yapılmış adımlar ✓ gelir; hiçbir kayıt taşınmaz, silinmez.

### A8 — Var olan çalışmayı aktaran yazar

- **Eylemler ve sonuç:** Yedekten ya da başka programdan evren aktarılır [main].
- **Kabul:** İlk adımlar, veride eser ve sahne zaten olduğu için görünmez [#5]. "Başlamak için" soruları kayıt sayısı 5'ten fazlaysa görünmez [main].

## B. Planlama

### B1 — Planlayan yazar: dönüm noktalarından sahneye

- **Önkoşul:** Eser "Unutulanlar"; olay örgüsü masası (P6) [öneri].
- **Eylemler ve sonuç:**
  1. Masada "Boş sahne ekle" ile sekiz metinsiz sahne; her birine "dönüm noktası" etiketi [main: etiket].
  2. Orta noktadaki sahne için "Bu olayı anlatan sahne" → yeni olay "Lale annesinin anısının silindiğini öğrenir", *fikir* [main: `anlatir`].
  3. Kurgu hattı satırı ekler; sahneleri hatta bağlar [main].
  4. Orta nokta sahnesini Bl.4'ten Bl.3'e taşır → etki özeti: "Okurun 'Silinmiş isyan' sorusunu öğrendiği sahne öne alındı" [main: `yerlestir`].
- **Saklanan:** sahneler, etiketler, olay, ilişkiler, yeni konum.
- **Geri alma:** Taşıma tek işlem grubudur.
- **Olumsuz:** Taşıma olayın evren tarihini değiştirmez. *Fikir* olay tutarlılık denetiminde yalnız sessiz grupta görünür (K13).
- **Kabul:** Masa yeni kayıt kopyası oluşturmaz; aynı sahne kayıt listesinde, Yaz ağacında ve masada tektir.

### B2 — Keşfederek yazan: planı sonradan çıkarmak

- **Eylemler ve sonuç:** Yazar İlk adımları gizler, 30 sahne yazar. Sonra masayı açar: sütunlar zaten yazılmış sahnelerdir. Okur soruları ekler, sahnelere niyet işaretler [main: montaj], iki kurgu hattı bağlar.
- **Kabul:** Plan sonradan kurulunca hiçbir sahnenin metni, sırası ya da tarihi değişmez.

### B3 — Alternatif final

- **Önkoşul:** Seri; `alternatif` ilişkisi (P5) [öneri].
- **Eylemler ve sonuç:**
  1. Olay A "Anı vergisi kaldırılır" ve olay B "Vergi halka devredilir", ikisi *fikir*; `alternatif` ile bağlı. Seri sayfasında "Olası finaller (2 · seçilmedi)".
  2. A'ya I. kitapta bir ipucu sahnesi bağlanır (montaj niyeti).
  3. II. kitapta yazar B'yi kesinleştirir → önizleme: "Diğer 1 alternatif de vazgeçilsin mi? (Önerilir)" → Evet. Gerekçe kaydı açılır.
- **Saklanan:** iki karar değişikliği, gerekçe, `gerekce_konusu` bağları.
- **Olumsuz:** A silinmez. A'ya bağlı ipucu sahnesi ve niyeti **silinmez**; montajda "vazgeçilen alternatife bağlı" satırı. Kesinleştirme **öbürünü kendiliğinden** vazgeçilmiş yapmaz; yalnız önizleme sorar.
- **İki cihaz:** Bir cihaz A'yı, öbürü B'yi kesinleştirirse iki karar da uygulanır; alternatif kümesinde iki kesin üye → inceleme kuyruğunda "İki alternatif birden kesinleşmiş" satırı [öneri].
- **Kabul:** "Olası final" tek bir soruya iki cevap olarak yazılmaz (Model §6).

### B4 — Karakterin kitaplar boyunca yolu

- **Önkoşul:** Seri, üç eser; `eser_odagi` (P7) [öneri].
- **Eylemler ve sonuç:** Lale ↔ I, Lale ↔ II `eser_odagi`. Her birinde `karakter_kitapta` soruları; I'de 5. soru ("en zor karar") "şişeyi çalmak" sahnesine bağlanır. Seri sayfasında matris.
- **Olumsuz:** II'nin cevabı I'nin hücresini değiştirmez. Lale'nin evren kaydı tektir; durum geçmişi bu cevaplardan etkilenmez.
- **Kabul:** Bir eserde iki odak karakter olabilir; "ana karakter" alanı yoktur.

### B5 — Kitap sonunda açık olanlar

- **Önkoşul:** I ve II yazılmış; okur soruları ve niyetler işaretli [main: montaj]; P9 [öneri].
- **Eylemler ve sonuç:** I'in sayfasında "Kitap sonunda açık olanlar": "Silinmiş isyanın nedeni — açık · 2 ipucu, 1 yanıltmaca · Bugün bildiğimize göre: II, 7. sahnede açıklanıyor."
- **Olumsuz:** III yazılınca I'in "kitap sonunda" sütunu değişmez; yalnız "bugün bildiğimize göre" sütunu güncellenir. Serbest metne bakılmaz.
- **Kabul:** Eşdeğerlik sınaması: III'e açıklayıcı sahne eklemek I'in sütununu değiştirmez.

### B6 — Yan eser ve bağımsız novella

- **Eylemler ve sonuç:** Ağaçta en üstte yeni eser "İlk Vergi" (Orhun'un gençliği) [main]. `[[Orhun]]` mevcut kayda bağlanır [main].
- **Olumsuz:** Seriye bağlanmaz; "seriye ekleyin" önerisi yok. Evren kronolojisinde serinin başında olması okuma sırasını değiştirmez.
- **Kabul:** Orhun'un sayfasında geri-atıflar dört eseri gösterir; kopya kayıt yok.

## C. Seri yaşam döngüsü

### C1 — Eseri seriden çıkarmak

- **Eylemler ve sonuç:** "Hatırlayanlar" ağaçta en üste sürüklenir → `anlati_yerlestir` [öneri: eser için].
- **Olumsuz:** Sahneler, metin, olaylar, okur modeli değişmez. Seri sayfasının "kitap sonunda açık" hesabı o eser olmadan yeniden yapılır.
- **Geri alma:** Tek işlem grubu.

### C2 — Seriyi silip geri getirmek, arada taşıma

- **Önkoşul:** Seri "Hatıra İmparatorluğu"; altında I, II, III.
- **Eylemler ve sonuç:**
  1. Seri silinir. Önizleme: "3 eser en üst düzeye çıkacak; hiçbir eser, sahne ya da metin silinmeyecek." Eserlerin ağaç satırına **dokunulmaz** (Model §3.4).
  2. Yazar II'yi başka bir seriye ("Kıyı Hikâyeleri") taşır.
  3. Seri çöp kutusundan geri yüklenir. Önizleme: "2 eser yeniden bu serinin altına girecek. *Hatırlayanlar* arada başka seriye taşındığı için orada kalacak."
- **Sonuç:** I ve III serinin altında; II "Kıyı Hikâyeleri"nde.
- **İki cihaz:** Cihaz A seriyi silerken cihaz B bir eseri seriye koyarsa: eser silinmiş serinin altındadır, en üstte görünür; seri geri gelince altına girer. Silme–düzenleme çatışması bugünkü kuralla listelenir [tasarım §10.6].
- **Kabul:** Geri yükleme hiçbir eserin konumunu **yazmaz**; yalnız seri kaydının silindi işaretini kaldırır.

### C3 — Eski evrende seri

- **Önkoşul:** Seri türü gelmeden önce kurulmuş, üç eserli evren.
- **Eylemler ve sonuç:** Program güncellenir; evren açılır; ağaç aynı. Yazar seri oluşturup eserleri altına taşır.
- **Kabul:** Dönüşüm yok. Eski sürümle açılan evrende eserler kaybolmaz (Model §10; sınama yazılacak).

## D. Yayım, sürüm, iki cihaz

### D1 — Yayımlanmış ilk kitap, değişen seri planı

- **Önkoşul:** I yayımlandı; sabit başvuru sürümü var [main].
- **Eylemler ve sonuç:** II'de Orhun'un geçmişi farklı açıklanmak istenir; ilgili olay değiştirilir.
- **Sonuç:** Sabit sürüm değişmez. Yayımlanmış eserle çelişen değişiklik sorulur [main: F18, `calisan/yayim.ts`].
- **Kabul:** Seri planındaki değişiklik (alternatif, karar) yayımlanmış metne dokunmaz.

### D2 — Aynı kayıt iki cihazda

- **Eylemler ve sonuç:** Masaüstünde `seri.1` cevabı, dizüstünde aynı anda başka cevap.
- **Sonuç:** Alan çatışması [main §10.3]; ikisi de korunur, yazar seçer.
- **Kabul:** İçerik kaybı yok (iki cihaz sınaması, `test/` altında P2 ve P4 için).

### D3 — Çevrimdışı

- **Eylemler ve sonuç:** Not, sahne, soru cevapları, yol seçimi çevrimdışı.
- **Kabul:** Hepsi yerelde kaydedilir; rehber metni açılır; bağlantı gelince yol seçimi dışındakiler eşitlenir.

## E. Geri dönüş

### E1 — Aylar sonra dönen yazar

- **Önkoşul:** Etkin çalışma "Unutulanlar"; devam notu var [main].
- **Eylemler ve sonuç:** Masa → Şimdi kartı (Tasarım §3): son sahne, not, "Sahneye dön". Altında önemli mesele.
- **Olumsuz:** Yazar arada III'e not eklediyse etkin çalışma **değişmez** (Model §5 kural 1).
- **Kabul:** Kartın her satırı gerekçe taşır; serbest metinden çıkarım yoktur.

### E2 — Etkin çalışma yok

- **Eylemler ve sonuç:** Etkin çalışma boş; devam notu yok.
- **Sonuç:** Kart son düzenlenenleri gösterir, gerekçesiz. İlk adımlar gizlendiyse "Nereden başlamak istersiniz?" çıkmaz.

## F. Erişilebilirlik ve büyük evren

### F1 — Yalnız klavye

- **Eylemler ve sonuç:** İlk adımlarda yol seçimi ok tuşlarıyla, adımlar Tab ile; rehber paneli Esc ile kapanır, odak açan düğmeye döner [main: `SayfaYardimi`, `useLayoutEffect`]. Masada sütun taşıma klavyeyle de yapılır (seç → Alt+← / Alt+→) [öneri].
- **Kabul:** Tarayıcı sınamasında yalnız klavyeyle uçtan uca.

### F2 — Büyük evren

- **Önkoşul:** 3 seri, 12 eser, 1.500 sahne, 60 bin işlem (sahte, `test/_olcum` yöntemi).
- **Kabul:**
  - Masa açılışı bugünküne göre en çok +50 ms (Şimdi kartı, İlk adımlar).
  - Olay örgüsü masası 150 sahnelik bir eserde 1 sn altında açılır.
  - Kitap sonunda açık olanlar yalnız seçilen eserin sahneleri üzerinden hesaplanır.

## G. Stres listesi

Brifin istediği ek durumlar ve onları karşılayan akış:

| Durum | Akış |
|---|---|
| Aynı kayıt iki cihazda | D2, B3 (iki cihaz) |
| Arayüz yolu değişir, veri korunur | A7 |
| Eski evrene seri eklenir | C3 |
| Yayımlanmış kitap sabit, seri planı değişir | D1 |
| Alternatiften vazgeçilir, ipuçları silinmez | B3 |
| Eser seriden çıkar; seri silinip geri gelir | C1, C2 |
| 60 bin işlemli evrende yönlendirme maliyeti | F2 |
| Aylarca eser olmadan dünya kurma | A3 |
| Bütün rehberi gizleme | A6 |
