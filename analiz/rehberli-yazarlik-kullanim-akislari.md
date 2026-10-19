# Rehberli yazarlık: kullanım akışları

> **Belge türü:** Tasarım önerisinin kabul senaryoları. Onaylanmış davranış değildir. Öneri numaraları (Ö1–Ö12) ve karar numaraları (D1–D11) [ürün tasarımı](rehberli-yazarlik-urun-tasarimi.md) belgesindendir.
>
> Her akış: **başlangıç → seçim → ekranda → kaydedilen → geri dönüş / iptal → belirsizlik ve hata → sınama.** İlk on akış somut ekran metni taşır. Örnekler *Hatıra İmparatorluğu*'ndandır (uydurma).
>
> İşaretler: **[var]** bugün kodda · **[Ö…]** öneri, henüz yok.

---

## Akış 01 — Sıfırdan fantastik roman serisi

**Başlangıç:** Evrenler sayfası; hiç evren yok ya da yeni bir evren.

1. **Evren oluştur** [var]. Ad: "Hatıra İmparatorluğu". Evren açılır, Yaz sayfası gelir.
2. **İlk adımlar** [var] görünür. Yol satırında **"Seri planıyla"** seçilir [Ö2].
   > **İlk adımlar** · Nasıl başlamak istersiniz? (•) Seri planıyla
   > 1. **Hikâyenizin çekirdeği** — Kimin başına ne gelebilir? İki üç cümle yeter; ayrıntı şimdi gerekmiyor. `[Yaz]` · Örnek göster · Neden?
   > 2. Serinin büyük sorusu
   > 3. İlk kitabı oluşturun
   > 4. İlk sahneyi ekleyin
3. "Yaz"a basılır. Satırın altında "Temel fikir" sorusu yerinde açılır [var: Masa'daki `SoruSatir`; Ö2 onu buraya da koyar]. Kullanıcı yazar: *"Anıların vergi olarak toplandığı bir imparatorlukta bir arşiv memuru kayıp kardeşini ararken silinmiş bir isyanı keşfeder."* → **Kaydet**. Adım 1 işaretlenir.
4. Adım 2: "Yeni seri" düğmesi [Ö7]. Seri adı: "Hatıra İmparatorluğu". Seri kaydının "Serinin büyük planı" soruları açılır [Ö4]. Yazar yalnız ilk soruyu cevaplar: *"Bellek bir kaynağa dönüşünce özgürlük mümkün mü?"* Kalanlar boş kalır.
5. Adım 3: Eser ağacında serinin altında "Yeni eser": *Unutulanlar* [var + Ö7]. Eser sayfasında "Bu kitabın görevi" soruları görünür [Ö4]; yazar şimdilik atlar.
6. Adım 4: "Yeni sahne" [var]. Sahne açılır; yazar yazmaya başlar. İlk adımlar kaybolur.

**Kaydedilen:** Evren; `baslangic.1` cevabı; seri kaydı ve `seri.1` cevabı; eser (seri altında); sahne ve metni. Hepsi işlem günlüğünde.

**Geri dönüş / iptal:** Her adımda "Gizle" listeyi kapatır, kayıtlar kalır. Seri kaydı silinirse eser en üste çıkar.

**Belirsizlik:** Yazar adım 2'de büyük soruyu bilmiyor → "Sonra" der; adım geçilmiş sayılır, soru Masa'da "sonraya bırakılanlar"da durur [var: soru durumu].

**Sınama:**
- Dört adım bitince liste görünmez (yeniden açınca da).
- "Sonra" denen soru Masa'daki "Şimdi" kartında [Ö6] öncelik 4 ile görünür.
- **Olumsuz:** Seri yolu seçilip seri oluşturulmadan doğrudan eser açılırsa adım 3 yapılmış sayılmaz (eser seriye bağlı değil). Ama liste kullanıcıyı engellemez, yazmaya izin verir.

---

## Akış 02 — Sahneden başlayan yazar

**Başlangıç:** Yeni evren, İlk adımlar varsayılan yolda ("Bir sahneyle") [var].

1. "Eser oluştur" → ad sorulur: "Adsız eser" kabul edilir [var].
2. "Sahne ekle" → sahne açılır [var]. Yazar doğrudan yazar:
   > *Vergi günü arşivin kapısında kuyruk sokağa taşıyordu. Lale mühür defterini açtı ve kardeşinin adını üçüncü kez aradı.*
3. "Lale" adını seçip **Bağla** → seçim kutusu → "Yeni kayıt: Lale · Karakter" [var]. Kayıt *fikir* durumunda doğar ve "Bahsedilen ama yazılmamış"a düşer.
4. Bağlam panelinde "Bağlam ekle" → mekân: yeni kayıt "Başkent arşivi" [var]. İlk adımlar biter.
5. Yazar plan istemiyor; sahne planı bölümü [Ö5] katlı kalır, hiç açılmaz.

**Kaydedilen:** Eser, sahne, metin, iki fikir kayıt, sahne–mekân ilişkisi.

**Geri dönüş:** Planı sonra kurmak: Masa'da "Hikâye çekirdeği" [Ö4], ya da sahne planı.

**Sınama:**
- Rehberle hiç etkileşmeyen yazar, bugünkü kadar tıklamayla sahneye ulaşır (en çok 3 tıklama).
- **Olumsuz:** Sahne planı bölümü açılmadıysa hiçbir soru, sayı ya da uyarı görünmez.

---

## Akış 03 — Haritadan başlayan yazar

**Başlangıç:** Yeni evren. Yol: **"Bir dünyayla"** [Ö2].

> 1. **Dünyanızın kuralı** — Hangi kural kırılırsa her şey değişir? `[Yaz]` · Örnek göster
> 2. Güç kimde ve bedeli ne?
> 3. Bir yer oluşturun
> 4. O yerde geçen bir sahne ya da bir not

1. Kural yazılır (Pusula 4) [var: soru]. Bedel yazılır (Pusula 3).
2. "Bir yer oluşturun" → Haritalar sayfasına gider, harita yüklenir, şehir işaretlenir [var].
3. Kültür, kurum kayıtları açılır [var]. Keşif soruları (F31) bir çatışma adayı gösterir: "Kâtip loncası ile liman tüccarları arasında bir anlaşmazlık mümkün" [var: yapılandırılmış ilişkilerden].
4. Dördüncü adım: yer kaydına bağlı bir not. Liste biter.

**Kaydedilen:** Soru cevapları, harita, kayıtlar, not.

**Sınama:**
- **Olumsuz:** Hiçbir yerde "henüz eseriniz yok" ya da "romana geçin" metni görünmez.
- Yazar hiç eser açmadan aylarca çalışabilir; Masa'daki "Şimdi" kartı [Ö6] son düzenlenen kaydı gösterir, sahne istemez.

---

## Akış 04 — Tek karakterden roman

**Başlangıç:** Yeni evren. Yol: **"Bir karakterle"** [Ö2].

1. "Karakter oluştur" → Lale. Karakter sayfasında "Karakter: temel altı soru" [var].
2. Adım 2: **"En çok ne istiyor?"** [var] → *"Kayıp kardeşi Deniz'in dosyasını bulmak."* Yanındaki "Örnek" [Ö3]:
   > Örnek: "Kayıp kardeşinin dosyasını bulmak." Somut bir hedef; "mutlu olmak" gibi bir his değil.
3. Adım 3: **Karşıt güç.** "Bu kayda soru seti ekle → Karşıt karakter" [var] Orhun için; ya da Lale ile Orhun arasında "Düşmanı" ilişkisi [var].
4. Adım 4: Lale'nin "bulunuyor" rolüyle katıldığı bir sahne [var]. Eser ve seri sonradan.

**Sınama:**
- Karşıt güç bir kurum olabilir (Hafıza Divanı, topluluk kaydı); adım 3 bir `karsit` seti **ya da** karakterin herhangi bir kayıtla `dusman` / `rakip` ilişkisiyle yapılmış sayılır.
- **Olumsuz:** Karakter sorularının cevapsız kalması hiçbir yerde eksiklik göstermez.

---

## Akış 05 — Keşfederek yazan kullanıcı

**Başlangıç:** Yeni evren; yazar İlk adımlar'ı **"Gizle"**ler.

1. Arka arkaya on sahne yazar; köşeli parantezle boşluk bırakır: "[şehrin adı]".
2. Sonra Görünümler › Kurgu hatları'nda iki hat açar [var], sahneleri "Hattı ilerletir" ile bağlar.
3. Eser sayfasında "Dönüm noktaları" setini ekler [Ö4] ve geriye dönük doldurur.
4. Revizyon: sürüm alır [var], açık meseleleri "revizyon: yapı" etiketiyle toplar [var; Ö10 yalnız rehber].

**Sınama:**
- Gizlenen İlk adımlar bir daha görünmez (yalnız Masa'daki "İlk adımları göster" bağlantısıyla [Ö2]).
- **Olumsuz:** Plan sonradan kurulunca sahnelerin evren tarihi ya da sırası değişmez.

---

## Akış 06 — Planlayıcı kullanıcı

**Başlangıç:** Seri ve eser var (Akış 01'in sonu).

1. Seri sayfasında [Ö7] "Büyük plan" açılır; dört soru cevaplanır; **Olası final** iki kez: A ve B.
   > **Olası final** — Henüz kesin bir son seçmediyseniz birkaç olasılığı not edebilirsiniz.
2. Her final için bir **olay kaydı**, karar durumu *fikir* [var] (Akış 12).
3. Eser sayfasında "Dönüm noktaları" [Ö4]: sekiz soru. Her cevap "Bu soruyu yeni bir kayıtla cevapla" ile bir **sahne** olur [var: soru → kayıt]; sahne metinsiz ağaçta durur.
4. Kurgu hatları açılır, metinsiz sahneler hatlara bağlanır.
5. Sonra yazar sahne sahne yazar.

**Sınama:**
- Metinsiz sahne geçerli bir sahnedir; boş metin uyarı üretmez.
- **Olumsuz:** *Fikir* durumundaki final olayları tutarlılık denetiminde yalnız sessiz grupta görünür (K13), inceleme kuyruğunu doldurmaz.

---

## Akış 07 — Aynı evrende bağımsız eser

**Başlangıç:** Evrende *Hatıra İmparatorluğu* serisi ve üç eseri var.

1. Eser ağacında en üst düzeyde "Yeni eser": *Kâtibin Kızı* (bağımsız novella) [var].
2. Metinde `[[Orhun]]` yazılır; mevcut karakter kaydına bağlanır [var]. Kopya oluşmaz.
3. Eser seriye bağlanmaz; hiçbir yerde "seriye ekleyin" önerisi çıkmaz.

**Sınama:**
- Orhun'un kayıt sayfasında geri-atıflar dört eseri de gösterir [var].
- **Olumsuz:** Serisiz eser seri sayfasında görünmez; kendi sayfasında "seriye kalanlar" [Ö9] yine çalışır.

---

## Akış 08 — Çok kitaplı seri ve yan roman

**Başlangıç:** Seri, üç kitap ve bağımsız novella *İlk Vergi* (Orhun'un gençliği; kronolojide en başta).

1. *İlk Vergi* bağımsız kalır ya da seriye sona eklenir (önerilen okuma sırası). Bu karar evren kronolojisini etkilemez [Ö7].
2. Bölüm × kayıt matrisi [var] ve okur modeli [var] eser başına çalışır: *İlk Vergi*'nin okuru Orhun'un ailesini bilir; *Unutulanlar*'ın okuru bilmez.
3. Seri boyunca okuma yolu (önce *İlk Vergi*) ihtiyacı doğarsa [Ö8, sonraya].

**Sınama:**
- *İlk Vergi*'yi seride sona ya da başa taşımak hiçbir sahnenin evren tarihini değiştirmez.
- **Olumsuz:** "Okur bunu biliyor mu?" sorusu eser seçilmeden cevaplanmaz [var].

---

## Akış 09 — Yarım bırakılmış projeye dönüş

**Başlangıç:** Yazar üç ay önce son kez çalıştı. Kaldığı yerde not var: *"Arşivcinin neden yardım ettiğini netleştir."*

1. Evren açılır → Yaz. Kullanıcı Masa'ya geçer (ya da D9 ile Masa'nın açılışta gösterilmesi istenirse doğrudan).
2. **"Şimdi" kartı** [Ö6]:
   > **Şimdi**
   > *Unutulanlar* › 3. bölüm › Arşivde karşılaşma
   > Devam notunuz: "Arşivcinin neden yardım ettiğini netleştir."
   > `[Sahneye dön]` · Notu düzenle
   > *Son oturumda kendinize bu notu bıraktınız.*
   > Ayrıca: Önemli mesele "Orhun annesini tanıyor muydu?" ›
3. "Sahneye dön" → sahne, imleç ve yan paneldeki kayıtlar geri gelir [var: kaldığınız yer].
4. Çıkarken yeni not: *"Lale yardım istemeden önce kendini suçlamalı."* [var].

**Sınama:**
- Not başka cihazda yazıldıysa kart "Masaüstü cihazında" bilgisini taşır [var].
- **Olumsuz:** Not yoksa kart sıradaki dayanağa geçer; boş bir "not bırakmadınız" uyarısı çıkmaz.

---

## Akış 10 — Rehberi istemeyen kullanıcı

**Başlangıç:** Yeni evren.

1. İlk adımlarda **"Gizle"** [var].
2. Masa'da "Başlamak için" bölümünde **"Atla"** [var]: üç soru "sonra" olur.
3. Kullanıcı hiçbir rehber bölümü açmaz.

**Sınama:**
- Bir daha hiçbir rehber kendiliğinden açılmaz. "Şimdi" kartı [Ö6] öncelik 3'ü (İlk adımlar) atlar, öncelik 4'te "sonraya bırakılan" başlangıç sorularını **göstermez**: "Atla" ile toplu bırakılan başlangıç soruları önerilmez.
- Rehber konularına "?" panelinden [Ö1] her zaman ulaşılır.
- **Olumsuz:** "Gizle" ve "Atla" yeni bir kayıt oluşturmaz. "Atla" yalnız soru durumu yazar.

---

## Akış 11 — Çalışma yöntemini değiştiren kullanıcı

Roman planıyla başlar (Akış 01) → İlk adımlar'da yolu "Bir dünyayla" yapar → harita kurar → tekrar "Bir sahneyle"ye döner.

**Sınama:** Yol değişikliği işlem günlüğüne işlem yazmaz [Ö2, D2]. Her yolda zaten yapılmış adımlar işaretli gelir. Hiçbir kayıt taşınmaz ya da silinmez.

---

## Akış 12 — Alternatif final

1. Olay A "Anı vergisi kaldırılır" ve olay B "Vergi halka devredilir", ikisi *fikir* [var].
2. Gerekçe kaydı: soru "Serinin sonu", seçenekler A ve B [var].
3. II. kitabın ortasında yazar B'yi seçer: B *kesinleşmiş*, A *vazgeçilmiş*; gerekçe yazılır [var].

**Sınama:** A silinmez, aramada "vazgeçilenleri göster" ile bulunur [var]. A'ya bağlı ipuçları "vazgeçildi" durumuna yazar elle geçer; program kendiliğinden değiştirmez. **Olumsuz:** *Fikir* olay zaman çizelgesinde karar rozetiyle görünür, kesin olay gibi gösterilmez [var].

---

## Akış 13 — Eserin serisini değiştirme

*Hatırlayanlar* seriden çıkarılıp bağımsız yapılır [Ö7].

**Sınama:** Sahneler, metin, olaylar, okur modeli değişmez. Seri sayfasında kitap kartı kalkar; "seriye kalanlar" listesi [Ö9] o eser olmadan yeniden hesaplanır. Geri alınabilir (tek işlem grubu).

---

## Akış 14 — Yayımlanmış ilk kitap

*Unutulanlar* yayımlanır; sabit başvuru sürümü alınır [var, §9.7]. II. kitapta Orhun'un geçmişi farklı açıklanmak istenir.

**Sınama:** Yayımlanmış eserle çelişen değişiklik F18'e göre sorulur [tasarımda var]. Sabit sürüm değişmez. Seri planındaki değişiklik [Ö7] yayımlanmış metne dokunmaz.

---

## Akış 15 — Aynı anda iki cihaz

Masaüstünde seri büyük sorusu değişir; dizüstünde aynı anda aynı soru farklı yazılır. Ayrıca masaüstünde seri sırası değişir, dizüstünde bir eser seriye eklenir.

**Sınama:** Soru cevabı çatışması bugünkü alan çatışması kurallarıyla gösterilir [var, §10.3]. Sıra ve ekleme, anlatı ağacının bugünkü birleşme kurallarıyla birleşir. İçerik kaybı yok (iki cihaz sınaması; `test/` altında Ö7 için).

---

## Akış 16 — İnternetsiz kullanım

Uçakta: yeni fikir (hızlı not), sahne, soru cevapları, İlk adımlar yol seçimi.

**Sınama:** Hepsi yerelde kaydedilir [var]; rehber metni [Ö1] programla geldiği için çevrimdışı açılır. Bağlantı gelince eşitlenir; yol seçimi (cihazda) eşitlenmez.

---

## Akış 17 — Erişilebilirlik ve klavye

İlk adımlarda yol seçimi ok tuşlarıyla; adım düğmeleri Tab ile. Rehber yan paneli `Esc` ile kapanır ve odak açan düğmeye döner [var: `SayfaYardimi`, `useLayoutEffect`]. "Neden?" bağlantısı Enter ile açılır.

**Sınama:** Tarayıcı sınamasında yalnız klavyeyle: yol seç → adım 1 → cevap yaz → Kaydet → rehberi aç → Esc → odak doğru yerde.

---

## Akış 18 — Büyük proje

Üç seri, 12 eser, 1.500 sahne, 60 bin işlem.

**Sınama:**
- Masa "Şimdi" kartı [Ö6] ve İlk adımlar yalnız varlık sorguları ve sınırlı listeler kullanır; Masa açılışı bugünkünden 50 ms'den fazla uzamaz (ölçüm sınaması, `test/_olcum` yöntemiyle).
- Yaz ağacında seriler katlı açılır; yalnız açık serinin eserleri çizilir.

---

## Akış 19 — Henüz hiç fikri olmayan kullanıcı

Yol: **"Bir fikirle"**. Adım 1:
> **Aklınıza gelen ilk şey** — Bir görüntü, bir soru, bir cümle olabilir. Başlık gerekmiyor. `[Not al]` · Hiçbir şey gelmiyorsa ›

"Hiçbir şey gelmiyorsa" → rehber Konu 1'in "Takılırsanız" kısmı [Ö1]: *"Bu hafta sizi kızdıran, şaşırtan ya da merak ettiren üç şeyi not alın."*

**Sınama:** Hiçbir alan zorunlu değil; boş not kaydedilmez ama hata da göstermez (düğme pasif).

---

## Akış 20 — Çelişkili yaratıcı notlar

İki not: "Deniz isyancıların lideri" ve "Deniz Divan'ın casusu". Yazar ikisini de *fikir* olarak karakterin "Ne saklıyor?" sorusuna bağlamak ister.

**Sınama:** Program iki notu birleştirmez ya da birini seçmez. Yazar bir açık mesele açar: "Deniz kimin tarafında?" [var]; iki notu "İlgili" ilişkisiyle meseleye bağlar [var]. Seçince gerekçe kaydı [var].

---

## Akış 21 — Var olan çalışmayı aktaran kullanıcı

Başka programdan ya da tam yedekten evren aktarılır [var: içe aktarma, yedekten geri yükleme].

**Sınama:** İlk adımlar, veride zaten eser ve sahne olduğu için kendiliğinden görünmez [var]. "Başlamak için" soruları kayıt sayısı 5'ten fazlaysa görünmez [var]. Rehber zorla açılmaz.

## Akış 22 — Seriyi silen kullanıcı

Seri kaydı silinir [Ö7].

**Sınama:** Önizleme "3 eser en üst düzeye çıkacak; hiçbir eser, sahne ya da metin silinmeyecek" der. Çöp kutusundan geri yüklenince eserler yeniden serinin altına girer.
